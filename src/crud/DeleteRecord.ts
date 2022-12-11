/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16, 2022-12-06
 * Updated 2018-04-08, prototype-to-class
 * @Company: mConnect.biz | @License: MIT
 * @Description: delete one or more records / documents by docIds or queryParams
 */

// Import required module/function(s)
import { deleteHashCache, Filter, getResMessage, ObjectId, ResponseMessage } from "../../deps.ts";
import Crud from "./Crud.ts";
import {
    AuditLogOptionsType, BaseModelType, CheckAccessType, CrudOptionsType, CrudParamsType, CrudResultType,
    LogDocumentsType, ObjectType, QueryParamsType, TaskTypes, ValueType,
} from "./types.ts";
import { FieldDescType, isEmptyObject, RelationActionTypes } from "../orm/index.ts";

class DeleteRecord<T extends BaseModelType> extends Crud<T> {
    protected collRestrict: boolean;
    protected deleteRestrict: boolean;
    protected deleteSetNull: boolean;
    protected deleteSetDefault: boolean;

    constructor(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
        this.currentRecs = [];
        this.collRestrict = false;
        this.deleteRestrict = false;
        this.deleteSetNull = false;
        this.deleteSetDefault = false;
    }

    async deleteRecord(): Promise<ResponseMessage> {
        // check access permission
        if (this.checkAccess) {
            const loginStatusRes = await this.checkLoginStatus();
            if (loginStatusRes.code !== "success") {
                return loginStatusRes;
            }
            let accessRes: ResponseMessage;
            // loginStatusRes.value.isAdmin
            if (!(loginStatusRes.value as unknown as CheckAccessType).isAdmin) {
                if (this.docIds && this.docIds.length > 0) {
                    accessRes = await this.taskPermissionById(TaskTypes.DELETE);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                } else if (this.queryParams && !isEmptyObject(this.queryParams)) {
                    accessRes = await this.taskPermissionByParams(TaskTypes.DELETE);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                } else {
                    const accessRes = await this.checkTaskAccess(TaskTypes.DELETE);
                    if (accessRes.code != "success") {
                        return accessRes;
                    }
                }
            }
        }
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            return accessDbCheck;
        }

        // for queryParams, exclude _id, if present
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            const {_id, ...otherParams} = this.queryParams;
            this.queryParams = otherParams;
        }

        // delete / remove item(s) by docId(s) | usually for owner, admin and by role-assignment on collection/collection-documents
        if (this.docIds && this.docIds.length > 0) {
            try {
                this.deleteRestrict = this.childRelations.filter(item => item.onDelete === RelationActionTypes.RESTRICT).length > 0;
                this.deleteSetDefault = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT).length > 0;
                this.deleteSetNull = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL).length > 0;
                this.collRestrict = this.childRelations.filter(item => (item.onDelete === RelationActionTypes.RESTRICT && item.sourceColl === item.targetColl)).length > 0;
                // check if records exist, for delete and audit-log
                if (this.logDelete || this.logCrud || this.deleteRestrict || this.deleteSetDefault || this.deleteSetNull || this.collRestrict) {
                    const recExist = await this.getCurrentRecords("id");
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // sub-items integrity check, same collection
                if (this.collRestrict) {
                    const subItem = await this.checkSubItemById();
                    if (subItem.code !== "success") {
                        return subItem;
                    }
                }
                // parent-child integrity check, multiple collections
                if (this.deleteRestrict) {
                    const refIntegrity = await this.checkRefIntegrity();
                    if (refIntegrity.code !== "success") {
                        return refIntegrity;
                    }
                }
                // delete/remove records, and apply deleteSetDefault and deleteSetNull constraints
                return await this.removeRecordById();
            } catch (error) {
                return getResMessage("removeError", {
                    message: error.message ? error.message : "Error removing record(s)",
                });
            }
        }

        // delete / remove item(s) by queryParams | usually for owner, admin and by role-assignment on collection/collection-documents
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            try {
                this.deleteRestrict = this.childRelations.map(item => item.onDelete === RelationActionTypes.RESTRICT).length > 0;
                this.deleteSetDefault = this.childRelations.map(item => item.onDelete === RelationActionTypes.SET_DEFAULT).length > 0;
                this.deleteSetNull = this.childRelations.map(item => item.onDelete === RelationActionTypes.SET_NULL).length > 0;
                this.collRestrict = this.childRelations.map(item => (item.onDelete === RelationActionTypes.RESTRICT && item.sourceColl === item.targetColl)).length > 0;
                // check if records exist, for delete and audit-log
                if (this.logDelete || this.logCrud || this.deleteRestrict || this.deleteSetDefault || this.deleteSetNull || this.collRestrict) {
                    const recExist = await this.getCurrentRecords("queryParams");
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // sub-items integrity check, same collection
                if (this.collRestrict) {
                    const subItem = await this.checkSubItemByParams();
                    if (subItem.code !== "success") {
                        return subItem;
                    }
                }
                // parent-child integrity check, multiple collections
                if (this.deleteRestrict) {
                    const refIntegrity = await this.checkRefIntegrity();
                    if (refIntegrity.code !== "success") {
                        return refIntegrity;
                    }
                }
                // delete/remove records, and apply deleteSetDefault and deleteSetNull constraints
                return await this.removeRecordByParams();
            } catch (error) {
                return getResMessage("removeError", {
                    message: error.message,
                });
            }
        }

        // could not remove document
        return getResMessage("removeError", {
            message: "Unable to perform the requested action(s), due to incomplete/incorrect delete conditions. Delete task permitted by ID and queryParams only. ",
        });
    }

    // checkSubItemById checks referential integrity for same collection, by id
    async checkSubItemById(): Promise<ResponseMessage> {
        // check if any/some of the collection contain at least a sub-item/document
        const appDbColl = this.appDb.collection(this.coll);
        const docWithSubItems = await appDbColl.findOne({
            parentId: {
                $in: this.docIds,
            }
        });
        if (docWithSubItems && !isEmptyObject(docWithSubItems)) {
            return getResMessage("subItems", {
                message: "A record that includes sub-items cannot be deleted. Delete/remove the sub-items or update/remove the parentId field-value, first.",
            });
        } else {
            return getResMessage("success", {
                message: "no data integrity issue",
            });
        }
    }

    // checkSubItemByParams checks referential integrity for same collection, by queryParam
    async checkSubItemByParams(): Promise<ResponseMessage> {
        // check if any/some of the collection contain at least a sub-item/document
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            await this.getCurrentRecords("queryParams")
            this.docIds = [];          // reset docIds instance value
            this.currentRecs.forEach((item: T) => {
                this.docIds.push(item["_id"] as string);
            });
            return await this.checkSubItemById();
        }
        return getResMessage("paramsError", {
            message: "queryParams is required",
        })
    }

    // checkRefIntegrityById checks referential integrity for parent-child collections, for the current-document/records.
    async checkRefIntegrity(): Promise<ResponseMessage> {
        // required-inputs: parent/child-collections and current item-id/item-name
        if (this.childRelations.length < 1) {
            return getResMessage("success", {
                message: "no data integrity condition specified or required",
            });
        }
        // prevent item delete, if child-collection-items reference itemId
        const subItemCollections: Array<string> = []
        // docIds ref-check
        for await (const relation of this.childRelations) {
            const targetDbColl = this.appDb.collection(relation.targetColl);
            // include foreign-key/target as the query condition
            const targetField = relation.targetField;
            const sourceField = relation.sourceField;
            const query: ObjectType = {}
            if (sourceField.toLowerCase().endsWith("id")) {
                const sourceFieldValues = this.currentRecs.map((item) => {
                    const idValue = (item as unknown as ObjectType)[sourceField];
                    return (idValue !== "" && (idValue as string).length <= 24) ? new ObjectId(idValue as string) :
                        idValue;
                });
                query[targetField] = {
                    $in: sourceFieldValues,
                };
            } else {
                // other source-fields besides _id & fields endsWith id/Id/ID
                const sourceFieldValues = this.currentRecs.map((item) => (item as unknown as ObjectType)[sourceField]);
                query[targetField] = {
                    $in: sourceFieldValues,
                };
            }
            const collItem = await targetDbColl.findOne(query as Filter<ValueType>);
            if (collItem && !isEmptyObject(collItem as unknown as ObjectType)) {
                subItemCollections.push(relation.targetColl);
            }
        }
        this.subItems = subItemCollections;
        if (subItemCollections.length > 0) {
            return getResMessage("subItems", {
                message: `A record that contains sub-items cannot be deleted. Delete sub-items [from ${this.childColls.join(", ")} collection(s)], first.`,
                value  : subItemCollections as unknown as Array<ObjectType>,
            });
        } else {
            return getResMessage("success", {
                message: "no data integrity issue",
                value  : subItemCollections as unknown as Array<ObjectType>,
            });
        }
    }

    async removeRecordById(): Promise<ResponseMessage> {
        // delete/remove records and log in audit-collection
        try {
            // check current documents prior to update
            const currentRecRes = await this.getCurrentRecords("id");
            if (currentRecRes.code !== "success") {
                return currentRecRes;
            }
            const currentRecs = currentRecRes.value as unknown as Array<T>;
            // id(s): convert string to ObjectId
            const docIds = this.docIds.map(id => new ObjectId(id));
            let errMsg = "";
            const appDbColl = this.appDb.collection(this.coll);
            const qParams: QueryParamsType = {_id: {$in: docIds,}};
            const removed = await appDbColl.deleteMany(qParams as Filter<ValueType>);
            if (!removed || removed < 1) {
                throw new Error(`Unable to delete the specified records [${removed} of ${docIds.length} removed].`);
            }
            // optional, update child-collection-documents for setDefault and setNull/initialize-value?', i.e. if this.deleteSetDefault or this.deleteSetNull
            for await (const currentRec of currentRecs) {
                if (this.childRelations.length < 1) {
                    break;
                }
                // validate deleted document vs prior-currentDocument
                const qParams = {_id: currentRec._id} as Filter<T>;
                const undeletedRec = await appDbColl.findOne(qParams);
                if (undeletedRec) {
                    continue;
                }
                if (this.deleteSetDefault) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine default-action
                        if (!cItem.targetModel || isEmptyObject(cItem.targetModel as unknown as ObjectType)) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the set-default-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel?.collName || cItem.targetColl;
                        // compute default values for the targetFields
                        const docDefaultValue = await this.computeDefaultValues(targetDocDesc);
                        const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField] || null;   // current value of the targetField
                        const fieldDefaultValue = docDefaultValue[targetField] || null; // new value (default-value) of the targetField
                        if (currentFieldValue === fieldDefaultValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField default value | check if setDefault is permissible for the targetField
                        let targetFieldDesc = targetDocDesc[targetField];   // target-field-type
                        switch (typeof targetFieldDesc) {
                            case "object":
                                targetFieldDesc = targetFieldDesc as FieldDescType
                                // handle non-default-field
                                if (!targetFieldDesc.defaultValue || !Object.keys(targetFieldDesc).includes("defaultValue")) {
                                    const recErrMsg = "Target/foreignKey default-value is required to complete the set-default task";
                                    errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                                    continue;
                                }
                                break;
                            default:
                                break;
                        }
                        const updateQuery: ObjectType = {};    // to determine the current-value in the target-field
                        const updateSet: ObjectType = {};      // to set the new-default-value in the target-field
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = fieldDefaultValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated].`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                } else if (this.deleteSetNull) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine allowNull-action
                        if (!cItem.targetModel || isEmptyObject(cItem.targetModel as unknown as ObjectType)) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the set-null-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                        const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField] || null;  // current value of the targetField
                        const nullFieldValue = initializeDocValue[targetField] || null; // new value (null-value) of the targetField
                        if (currentFieldValue === nullFieldValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField null value | check if allowNull is permissible for the targetField
                        const targetColl = cItem.targetModel?.collName || cItem.targetColl;
                        let targetFieldDesc = targetDocDesc[targetField];
                        switch (typeof targetFieldDesc) {
                            case "object":
                                targetFieldDesc = targetFieldDesc as FieldDescType
                                // handle non-null-field
                                if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                    const recErrMsg = "Target/foreignKey allowNull is required to complete the set-null task";
                                    errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                                    continue;
                                }
                                break;
                            default:
                                break;
                        }
                        const updateQuery: ObjectType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = nullFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} updated].`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                }
            }
            // perform cache and audi-log tasks
            if (removed) {
                // delete cache
                deleteHashCache({key: this.cacheKey, hash: this.coll});
                // check the audit-log settings - to perform audit-log
                let logRes: ResponseMessage = {
                    code: "unknown", message: "in-determinate", resCode: 200, resMessage: "", value: {}
                };
                if (this.logDelete || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    };
                    const logParams: AuditLogOptionsType = {
                        collName     : this.coll,
                        collDocuments: logDocuments,
                    }
                    logRes = await this.transLog.deleteLog(this.userId, logParams);
                }
                const deleteResultValue: CrudResultType<T> = {
                    recordsCount: removed,
                    logRes,
                }
                return getResMessage("success", {
                    message: `Document/record deleted successfully - ${removed} of ${docIds.length} removed.`,
                    value  : deleteResultValue as unknown as ObjectType,
                });
            }
            return getResMessage("deleteError", {message: errMsg});
        } catch (e) {
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async removeRecordByParams(): Promise<ResponseMessage> {
        // delete/remove records and log in audit-collection
        try {
            // check current documents prior to update
            const currentRecRes = await this.getCurrentRecords("queryParams");
            if (currentRecRes.code !== "success") {
                return currentRecRes;
            }
            const currentRecs = currentRecRes.value as unknown as Array<T>;
            let errMsg = "";
            if (this.queryParams && !isEmptyObject(this.queryParams)) {
                const appDbColl = this.appDb.collection(this.coll);
                const removed = await appDbColl.deleteMany(this.queryParams);
                if (!removed || removed < 1) {
                    throw new Error(`Unable to delete the specified records [${removed} of ${currentRecs.length} removed].`)
                }
                // optional, update child-collection-documents for setDefault and setNull/initialize-value?, if this.deleteSetDefault or this.deleteSetNull
                for await (const currentRec of currentRecs) {
                    if (this.childRelations.length < 1) {
                        break;
                    }
                    // validate deleted document vs prior-currentDocument
                    const qParams = {_id: currentRec._id};
                    const undeletedRec = await appDbColl.findOne(qParams);
                    if (undeletedRec) {
                        continue;
                    }
                    if (this.deleteSetDefault) {
                        const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField
                            // check if targetModel is defined/specified, required to determine default-action
                            if (!cItem.targetModel || isEmptyObject(cItem.targetModel as unknown as ObjectType)) {
                                // handle as error
                                const recErrMsg = "Target model is required to complete the set-default-task";
                                errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                                continue;
                            }
                            const targetDocDesc = cItem.targetModel?.docDesc || {};
                            const targetColl = cItem.targetModel?.collName || cItem.targetColl;
                            // compute default values for the targetFields
                            const docDefaultValue = await this.computeDefaultValues(targetDocDesc);
                            const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField] || null;   // current value of the targetField
                            const fieldDefaultValue = docDefaultValue[targetField] || null; // new value (default-value) of the targetField
                            if (currentFieldValue === fieldDefaultValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField default value | check if setDefault is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-default-field
                                    if (!targetFieldDesc.defaultValue || !Object.keys(targetFieldDesc).includes("defaultValue")) {
                                        const recErrMsg = "Target/foreignKey default-value is required to complete the set-default task";
                                        errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                                        continue;
                                    }
                                    break;
                                default:
                                    break;
                            }
                            const updateQuery: ObjectType = {};
                            const updateSet: ObjectType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = fieldDefaultValue;
                            const TargetColl = this.appDb.collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet);
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} updated]`;
                                errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            }
                        }
                    } else if (this.deleteSetNull) {
                        const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel || isEmptyObject(cItem.targetModel as unknown as ObjectType)) {
                                // handle as error
                                const recErrMsg = "Target model is required to complete the set-null-task";
                                errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                                continue;
                            }
                            const targetDocDesc = cItem.targetModel.docDesc || {};
                            const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                            const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField] || null;  // current value of the targetField
                            const nullFieldValue = initializeDocValue[targetField] || null; // new value (null-value) of the targetField
                            if (currentFieldValue === nullFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetColl = cItem.targetModel.collName || cItem.targetColl;
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                        const recErrMsg = "Target/foreignKey allowNull is required to complete the set-null task";
                                        errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                                    }
                                    break;
                                default:
                                    break;
                            }
                            const updateQuery: ObjectType = {};
                            const updateSet: ObjectType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullFieldValue;
                            const TargetColl = this.appDb.collection(targetColl);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                            if (updateRes.modifiedCount !== updateRes.matchedCount) {
                                const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} updated].`;
                                errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            }
                        }
                    }
                }
                // perform cache and audi-log tasks
                if (removed) {
                    // delete cache
                    await deleteHashCache({key: this.cacheKey, hash: this.coll});
                    // check the audit-log settings - to perform audit-log
                    let logRes: ResponseMessage = {
                        code: "unknown", message: "in-determinate", resCode: 200, resMessage: "", value: {}
                    };
                    if (this.logDelete || this.logCrud) {
                        const logDocuments: LogDocumentsType = {
                            collDocuments: this.currentRecs,
                        };
                        const logParams: AuditLogOptionsType = {
                            collName     : this.coll,
                            collDocuments: logDocuments,
                        }
                        logRes = await this.transLog.deleteLog(this.userId, logParams);
                    }
                    const deleteResultValue: CrudResultType<T> = {
                        recordsCount: removed,
                        logRes,
                    }
                    return getResMessage("success", {
                        message: `Document/record deleted successfully - ${removed} of ${this.currentRecs.length} removed.`,
                        value  : deleteResultValue as unknown as ObjectType,
                    });
                } else {
                    return getResMessage("deleteError", {message: errMsg});
                }
            } else {
                return getResMessage("deleteError", {message: "Unable to delete record(s), due to missing queryParams"});
            }
        } catch (e) {
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }
}

// factory function/constructor
function newDeleteRecord<T extends BaseModelType>(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
    return new DeleteRecord(params, options);
}

export { DeleteRecord, newDeleteRecord };
