/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-24, @Updated: 2022-12-06(Deno)
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: save-record(s) (create/insert and update record(s))
 */

// Import required module/function(s)
import { ObjectId, getResMessage, ResponseMessage, deleteHashCache, } from "../../deps.ts";
import Crud from "./Crud.ts";
import {
    ActionParamTaskType, AuditLogOptionsType, BaseModelType, CrudOptionsType, CrudParamsType, CrudResultType,
    ExistParamsType, GetResultType,
    LogDocumentsType, ObjectType, QueryParamsType,
    TaskTypes,
} from "./types.ts";
import { ModelOptionsType, RelationActionTypes, isEmptyObject, FieldDescType } from "../orm/index.ts";

class SaveRecord<T extends BaseModelType> extends Crud<T> {
    protected modelOptions: ModelOptionsType;
    protected updateCascade: boolean;
    protected updateSetNull: boolean;
    protected updateSetDefault: boolean;

    constructor(params: CrudParamsType<T>,
                options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
        this.modelOptions = options && options.modelOptions ? options.modelOptions : {
            timeStamp  : true,
            actorStamp : true,
            activeStamp: true,
        };
        this.updateCascade = false;
        this.updateSetNull = false;
        this.updateSetDefault = false;
    }

    async saveRecord(): Promise<ResponseMessage> {
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

        // determine update / create (new) items from actionParams
        await this.computeItems();
        // determine update / create (new) items from actionParams
        const {docIds} = await this.computeItems();
        // validate createItems and updateItems
        if (this.createItems.length === this.updateItems.length) {
            return getResMessage("paramsError", {
                message: "You may only create or update record(s), not both at the same time.",
                value  : {},
            });
        }
        if (
            this.createItems.length < 1 && this.updateItems.length < 1 &&
            this.actionParams.length < 1
        ) {
            return getResMessage("paramsError", {
                message: "Valid action-params required for create or update task.",
                value  : {},
            });
        }
        // check task-type:
        this.taskType = this.checkTaskType();
        if (this.taskType === TaskTypes.UNKNOWN) {
            return getResMessage("paramsError", {
                message:
                    `Task-type[${TaskTypes.UNKNOWN}]: valid actionParams required to complete create or update tasks.`,
                value  : {},
            });
        }

        // for queryParams, exclude _id, if present
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            const {_id, ...otherParams} = this.queryParams;
            this.queryParams = otherParams;
        }

        // Ensure the _id and fields ending in Id for existParams are of type mongoDb-new ObjectId, for create / update actions
        if (this.existParams && this.existParams.length > 0) {
            this.existParams.forEach((existParams: ExistParamsType) => {
                for (const item of existParams) {
                    // transform/cast id, from string, to mongoDB-new ObjectId
                    // const item: unknown = it
                    Object.keys(item).forEach((itemKey: string) => {
                        if (itemKey.toString().toLowerCase().endsWith("id")) {
                            // create | TODO: review id-field length
                            const itemVal = item[itemKey];
                            const itemObjVal = item[itemKey] as ObjectType;
                            if (typeof itemVal === "string" && itemVal !== "" &&
                                itemVal.toString().length <= 24) {
                                item[itemKey] = new ObjectId(itemVal as string);
                            } else if (typeof itemObjVal === "object" && itemObjVal["$ne"] &&
                                (itemObjVal["$ne"] !== "" || itemObjVal["$ne"] !== null)) {
                                itemObjVal["$ne"] = new ObjectId(itemObjVal["$ne"] as string);
                            }
                        }
                    });
                }
            });
        }


        // create records/document(s)
        if (this.taskType === TaskTypes.CREATE && this.createItems.length > 0) {
            try {
                // check task-permission
                if (this.checkAccess) {
                    const accessRes = await this.checkTaskAccess();
                    if (accessRes.code != "success") {
                        return accessRes;
                    }
                }
                // create records
                return await this.createRecord();
            } catch (_e) {
                return getResMessage("insertError", {
                    message: "Error-inserting/creating new record.",
                });
            }
        }

        // update existing records/document(s), by recordIds
        if (this.taskType === TaskTypes.UPDATE && this.actionParams.length === 1 && this.docIds.length > 0) {
            try {
                // check task-permission
                if (this.checkAccess) {
                    const accessRes = await this.taskPermissionById(this.taskType);
                    if (accessRes.code != "success") {
                        return accessRes;
                    }
                }
                // check currentRecords
                if (this.logUpdate || this.logCrud) {
                    const currentRec = await this.getCurrentRecords("id");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecordById();
            } catch (e) {
                // console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // update records/document(s) by queryParams: recommended for admin user only
        if (this.taskType === TaskTypes.UPDATE && this.actionParams.length === 1 && !isEmptyObject(this.queryParams)
        ) {
            try {
                // check task-permission
                if (this.checkAccess) {
                    const accessRes = await this.taskPermissionByParams(this.taskType);
                    if (accessRes.code != "success") {
                        return accessRes;
                    }
                }
                // check currentRecords
                if (this.logUpdate || this.logCrud) {
                    const currentRec = await this.getCurrentRecords("queryparams");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecordByParams();
            } catch (e) {
                // console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // update records/document(s), batch/multiple updates, for admin-users only
        if (this.taskType === TaskTypes.UPDATE && this.updateItems.length > 0 && this.isAdmin) {
            // update the instance-docIds
            if (docIds.length > 0) {
                this.docIds = docIds;
            }
            // check task-permission
            if (this.checkAccess) {
                const accessRes = await this.taskPermissionById(this.taskType);
                if (accessRes.code != "success") {
                    return accessRes;
                }
            }
            // check currentRecords
            if (this.logUpdate || this.logCrud) {
                const currentRec = await this.getCurrentRecords("id");
                if (currentRec.code !== "success") {
                    return currentRec;
                }
            }
            return await this.updateRecord();
        }

        // return save-error message
        return getResMessage("saveError", {
            message: "Error performing the requested operation(s). Please retry",
        });
    }

    // helper methods:
    checkTaskType(): string {
        let taskType = TaskTypes.UNKNOWN;
        if (this.createItems.length > 0) {
            taskType = TaskTypes.CREATE;
        } else if (this.updateItems.length > 0) {
            taskType = TaskTypes.UPDATE;
        } else if (this.actionParams.length === 1) {
            const actParam = this.actionParams[0] as unknown as ObjectType;
            if (!actParam["id"] || actParam["id"] === "") {
                if (this.docIds?.length > 0 || !isEmptyObject(this.queryParams)) {
                    taskType = TaskTypes.UPDATE;
                } else {
                    taskType = TaskTypes.CREATE;
                }
            } else {
                taskType = TaskTypes.UPDATE;
            }
        }
        return taskType;
    }

    computeItems(modelOptions: ModelOptionsType = this.modelOptions): ActionParamTaskType<T> {
        const updateItems: Array<T> = [],
            createItems: Array<T> = [];

        // Ensure the _id for actionParams are of type mongoDb-new ObjectId, for update actions
        // cases - actionParams.length === 1 OR > 1
        if (this.actionParams.length === 1) {
            let item = this.actionParams[0];
            if (this.docIds.length > 0 || !isEmptyObject(this.queryParams)) {
                // update existing record(s), by docIds or queryParams
                if (modelOptions.actorStamp) {
                    item["updatedBy"] = this.userId;
                }
                if (modelOptions.timeStamp) {
                    item["updatedAt"] = new Date();
                }
                if (modelOptions.activeStamp && item.isActive === undefined) {
                    item["isActive"] = true;
                }
                updateItems.push(item);
            } else if (item["_id"] && item["_id"] !== "") {
                // update existing document/record, by recordId
                this.docIds = [];
                this.queryParams = {};
                if (modelOptions.actorStamp) {
                    item["updatedBy"] = this.userId;
                }
                if (modelOptions.timeStamp) {
                    item["updatedAt"] = new Date();
                }
                if (modelOptions.activeStamp && item.isActive === undefined) {
                    item["isActive"] = true;
                }
                this.docIds.push(item["_id"] as string);
                updateItems.push(item);
            } else {
                // create new record
                this.docIds = [];
                this.queryParams = {};
                // exclude any traces/presence of id, especially without concrete value ("", null, undefined)
                const {_id, ...saveParams} = item;
                item = saveParams as T;
                if (modelOptions.actorStamp) {
                    item["createdBy"] = this.userId;
                }
                if (modelOptions.timeStamp) {
                    item["createdAt"] = new Date();
                }
                if (modelOptions.activeStamp && item.isActive === undefined) {
                    item["isActive"] = true;
                }
                createItems.push(item);
            }
            this.createItems = createItems;
            this.updateItems = updateItems;
        } else if (this.actionParams.length > 1) {
            // multiple/batch creation or update of document/records
            this.docIds = [];
            this.queryParams = {};
            for (const item of this.actionParams) {
                if (item["_id"] && item["_id"] !== "") {
                    // update existing document/record
                    if (modelOptions.actorStamp) {
                        item["updatedBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item["updatedAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && item.isActive === undefined) {
                        item["isActive"] = true;
                    }
                    this.docIds.push(item["_id"] as string);
                    updateItems.push(item);
                } else {
                    // create new document/record
                    // exclude any traces/presence of id, especially without concrete value ("", null, undefined)
                    const {_id, ...saveParams} = item;
                    const itemRec = saveParams as T;
                    if (modelOptions.actorStamp) {
                        itemRec["createdBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        itemRec["createdAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && itemRec.isActive === undefined) {
                        itemRec["isActive"] = true;
                    }
                    createItems.push(itemRec);
                }
            }
            this.createItems = createItems;
            this.updateItems = updateItems;
        }
        return {
            createItems,
            updateItems,
            docIds: this.docIds,
        };
    }

    async createRecord(): Promise<ResponseMessage> {
        if (this.createItems.length < 1) {
            return getResMessage("paramsError", {
                message: "Action/Create-document parameter-object are required.",
            });
        }
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        // insert/create record(s) and log in audit-collection
        try {
            // insert/create multiple documents and audit-log
            const appDbColl = this.appDb.collection<T>(this.coll);
            const insertResult = await appDbColl.insertMany(this.createItems);
            // perform cache and audi-log tasks
            if (insertResult.insertedCount > 0) {
                // delete cache | this.cacheKey, this.coll, "key"
                deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes: ResponseMessage = {code: "unknown", message: "", value: {}, resCode: 0, resMessage: ""};
                if (this.logCreate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.createItems,
                    };
                    const logParams: AuditLogOptionsType = {
                        collName     : this.coll,
                        collDocuments: logDocuments,
                    }
                    logRes = await this.transLog.createLog(this.userId, logParams);
                }
                const crudResult: CrudResultType<T> = {
                    recordsCount: insertResult.insertedCount,
                    recordIds   : insertResult.insertedIds.map(it => it?.toString()) as Array<string>,
                    logRes      : logRes,
                }
                return getResMessage("success", {
                    message: `Record(s) created successfully: ${insertResult.insertedCount} of ${this.createItems.length} items created.`,
                    value  : crudResult as unknown as ObjectType,
                });
            }
            return getResMessage("insertError", {
                message: `Unable to create new record(s), database error.`,
            });
        } catch (e) {
            return getResMessage("insertError", {
                message: `Error inserting/creating new record(s): ${e.message ? e.message : ""}`,
            });
        }
    }

    async updateRecord(): Promise<ResponseMessage> {
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        if (this.updateItems.length < 1) {
            return getResMessage("paramsError", {
                message: "Action/Update-document parameter-object are required.",
            });
        }
        // updated record(s)
        try {
            // check current documents prior to update
            const currentRecRes = await this.getCurrentRecords("id");
            if (currentRecRes.code !== "success") {
                return currentRecRes;
            }
            // check/validate update/upsert command for multiple documents
            let updateCount = 0;
            let updateMatchedCount = 0;
            let errorMsg = "";
            // update multiple documents
            const appDbColl = this.appDb.collection(this.coll);
            for await (const item of this.updateItems) {
                // destruct _id /other attributes
                const {_id, ...otherParams} = item;
                // current record prior to update
                const currentRec = await appDbColl.findOne({_id: new ObjectId(_id)});
                if (!currentRec || isEmptyObject(currentRec)) {
                    const recErrorMsg = "Unable to retrieve current record for update.";
                    errorMsg = errorMsg ?
                        `${errorMsg} | ${recErrorMsg}` : recErrorMsg;
                    continue;
                }
                const updateResult = await appDbColl.updateOne(
                    {_id: new ObjectId(_id as string),},
                    {$set: otherParams,},
                );
                updateCount += updateResult.modifiedCount;
                updateMatchedCount += updateResult.matchedCount
                // optional step, update the child-collections (update-cascade) | from current and new update-field-values
                if (this.updateCascade && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine update-cascade-action
                        if (!cItem.targetModel) {
                            // handle as error
                            const recErrorMsg = "Target model is required to complete the update-cascade-task";
                            errorMsg = errorMsg ? `${errorMsg} | ${recErrorMsg}` : recErrorMsg;
                            continue;
                        }
                        // const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        const currentFieldValue = currentRec[sourceField] || null;   // current value
                        const newFieldValue = (item as unknown as ObjectType)[sourceField] || null;         // new value (set-value)
                        if (currentFieldValue === newFieldValue) {
                            // skip update
                            continue;
                        }
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = newFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                }
                // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                else if (this.updateSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine default-action
                        if (!cItem.targetModel) {
                            // handle as error
                            
                            throw new Error("Target model is required to complete the set-default-task");
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        // compute default values for the targetFields
                        const defaultDocValue = await this.computeDefaultValues(targetDocDesc);
                        const currentFieldValue = currentRec[sourceField];   // current value of the targetField
                        const defaultFieldValue = defaultDocValue[targetField] || null;
                        if (currentFieldValue === defaultFieldValue) {
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
                                    
                                    throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                }
                                break;
                            default:
                                break;
                        }
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = defaultFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                } else if (this.updateSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine allowNull-action
                        if (!cItem.targetModel) {
                            // handle as error
                            
                            throw new Error("Target model is required to complete the set-null-task");
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        const currentFieldValue = currentRec[sourceField];  // current value of the targetField
                        const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                        const nullFieldValue = initializeDocValue[targetField] || null;
                        if (currentFieldValue === nullFieldValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField null value | check if allowNull is permissible for the targetField
                        let targetFieldDesc = targetDocDesc[targetField];
                        switch (typeof targetFieldDesc) {
                            case "object":
                                targetFieldDesc = targetFieldDesc as FieldDescType
                                // handle non-null-field
                                if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                    
                                    throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                }
                                break;
                            default:
                                break;
                        }
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = nullFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                }
            }
            // perform cache and audit-log tasks
            if (updateCount > 0) {
                // delete cache
                await deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes: ResponseMessage = {code: "unknown", message: "", value: {}, resCode: 0, resMessage: ""};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    };
                    const newLogDocuments: LogDocumentsType = {
                        collDocuments: this.updateItems,
                    };
                    const logParams: AuditLogOptionsType = {
                        collName        : this.coll,
                        collDocuments   : logDocuments,
                        newCollDocuments: newLogDocuments,
                    }
                    logRes = await this.transLog.updateLog(this.userId, logParams);
                }
                const crudResult: CrudResultType<T> = {
                    recordsCount: updateCount,
                    logRes      : logRes,
                }
                return getResMessage("success", {
                    message: `Record(s) updated successfully: ${updateCount} of ${updateMatchedCount} documents updated.`,
                    value  : crudResult as ObjectType,
                });
            }
            return getResMessage("updateError", {
                message: "No documents updated. Please retry.",
            });
        } catch (e) {
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async updateRecordById(): Promise<ResponseMessage> {
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        if (this.docIds.length < 1) {
            return getResMessage("paramsError", {
                message: "document-IDs required to update documents.",
            });
        }
        if (this.updateItems.length < 1 && this.actionParams.length < 1) {
            return getResMessage("paramsError", {
                message: "Action/Update-document parameter-object are required.",
            });
        }
        // updated record(s)
        try {
            let errMsg = "";
            // check current documents prior to update
            const currentRecRes = await this.getCurrentRecords("id");
            if (currentRecRes.code !== "success") {
                return currentRecRes;
            }
            const recValue = currentRecRes.value as unknown as GetResultType<T>;
            const currentRecs  = recValue.records;
            // destruct _id /other attributes
            // const item = this.actionParams[0];
            const {_id, ...otherParams} = this.actionParams[0];
            // update multiple documents
            const appDbColl = this.appDb.collection(this.coll);
            const docIds = this.docIds.map(it => new ObjectId(it));
            const updateResult = await appDbColl.updateMany(
                {_id: {$in: docIds,}},
                {$set: otherParams,},
            );
            const updateCount = updateResult.modifiedCount;
            const updateMatchedCount = updateResult.matchedCount
            // optional step, update the child-collections (update-cascade) | from current and new update-field-values
            for (const item of currentRecs) {
                if (this.updateCascade && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine update-cascade-action
                        if (!cItem.targetModel) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the update-cascade-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        // const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        const currentFieldValue = item[sourceField] || null;   // current value
                        const newFieldValue = item[sourceField] || null;         // new value (set-value)
                        if (currentFieldValue === newFieldValue) {
                            // skip update
                            continue;
                        }
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = newFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
                else if (this.updateSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine default-action
                        if (!cItem.targetModel) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the set-default-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        // compute default values for the targetFields
                        const defaultDocValue = await this.computeDefaultValues(targetDocDesc);
                        const currentFieldValue = item[sourceField];   // current value of the targetField
                        const defaultFieldValue = defaultDocValue[targetField] || null;
                        if (currentFieldValue === defaultFieldValue) {
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
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = defaultFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                } else if (this.updateSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine allowNull-action
                        if (!cItem.targetModel) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the set-null-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        const currentFieldValue = item[sourceField];  // current value of the targetField
                        const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                        const nullFieldValue = initializeDocValue[targetField] || null;
                        if (currentFieldValue === nullFieldValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField null value | check if allowNull is permissible for the targetField
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
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = nullFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                }
            }
            // perform cache and audi-log tasks
            if (updateCount > 0) {
                // delete cache
                await deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes: ResponseMessage = {code: "unknown", message: "", value: {}, resCode: 0, resMessage: ""};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    };
                    const newLogDocuments: LogDocumentsType = {
                        collDocuments: this.updateItems,
                    };
                    const logParams: AuditLogOptionsType = {
                        collName        : this.coll,
                        collDocuments   : logDocuments,
                        newCollDocuments: newLogDocuments,
                    }
                    logRes = await this.transLog.updateLog(this.userId, logParams);
                }
                const crudResult: CrudResultType<T> = {
                    recordsCount: updateCount,
                    logRes      : logRes,
                };
                return getResMessage("success", {
                    message: `Record(s) updated successfully: ${updateCount} of ${updateMatchedCount} documents updated.`,
                    value  : crudResult as ObjectType,
                });
            }
            return getResMessage("updateError", {
                message: "No documents updated. Please retry.",
            });
        } catch (e) {
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async updateRecordByParams(): Promise<ResponseMessage> {
        // control access to security-sensitive collections - optional
        if ((this.coll === this.userColl || this.coll === this.accessColl) && !this.isAdmin) {
            return getResMessage("unAuthorized", {
                message: "Access-security-sensitive collections update are not allowed - via crud package."
            })
        }
        if (isEmptyObject(this.queryParams)) {
            return getResMessage("paramsError", {
                message: "queryParams is required to update documents.",
            });
        }
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        try {
            let errMsg = "";
            // check current documents prior to update
            const currentRecRes = await this.getCurrentRecords("queryParams");
            if (currentRecRes.code !== "success") {
                return currentRecRes;
            }
            const currentRecs = currentRecRes.value as unknown as Array<T>;
            // destruct _id /other attributes
            const item = this.actionParams[0];
            const {_id, ...otherParams} = item;
            const appDbColl = this.appDb.collection(this.coll);
            // include item stamps: userId and date
            otherParams.updatedBy = this.userId;
            otherParams.updatedAt = new Date();
            // const updateParams = otherParams;

            const updateResult = await appDbColl.updateMany(
                this.queryParams,
                {$set: otherParams},
            );
            const updateCount = updateResult.modifiedCount;
            const updateMatchedCount = updateResult.matchedCount
            // optional step, update the child-collections (for update-cascade) | from actionParams[0]-item
            // update the child-collections (update-cascade) | from current and new update-field-values
            if (this.updateCascade && this.childRelations.length > 0) {
                const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE);
                for await (const currentRec of currentRecs) {
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine update-cascade-action
                        if (!cItem.targetModel) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the update-cascade-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        // const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField] || null;   // current value
                        const newFieldValue = (item as unknown as ObjectType)[sourceField] || null;         // new value (set-value)
                        if (currentFieldValue === newFieldValue) {
                            // skip update
                            continue;
                        }
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = newFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                }
            } // optional, update child-docs for setDefault and initializeValues, if this.updateSetDefault or this.updateSetNull
            else if (this.updateSetDefault && this.childRelations.length > 0) {
                const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_DEFAULT);
                for await (const currentRec of currentRecs) {
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine default-action
                        if (!cItem.targetModel) {
                            // handle as error
                            
                            throw new Error("Target model is required to complete the set-default-task");
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        // compute default values for the targetFields
                        const defaultDocValue = await this.computeDefaultValues(targetDocDesc);
                        const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField];   // current value of the targetField
                        const defaultFieldValue = defaultDocValue[targetField] || null;    // new value (default-value) of the targetField
                        if (currentFieldValue === defaultFieldValue) {
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
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = defaultFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            
                            throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                        }
                    }
                }
            } else if (this.updateSetNull && this.childRelations.length > 0) {
                const childRelations = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.SET_NULL);
                for await (const currentRec of currentRecs) {
                    for await (const cItem of childRelations) {
                        const sourceField = cItem.sourceField;
                        const targetField = cItem.targetField;
                        // check if targetModel is defined/specified, required to determine allowNull-action
                        if (!cItem.targetModel) {
                            // handle as error
                            const recErrMsg = "Target model is required to complete the set-null-task";
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                            continue;
                        }
                        const targetDocDesc = cItem.targetModel?.docDesc || {};
                        const targetColl = cItem.targetModel.collName || cItem.targetColl;
                        const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                        const currentFieldValue = (currentRec as unknown as ObjectType)[sourceField];  // current value of the targetField
                        const nullFieldValue = initializeDocValue[targetField] || null; // new value (default-value) of the targetField
                        if (currentFieldValue === nullFieldValue) {
                            // skip update
                            continue;
                        }
                        // validate targetField null value | check if allowNull is permissible for the targetField
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
                        const updateQuery: QueryParamsType = {};
                        const updateSet: ObjectType = {};
                        updateQuery[targetField] = currentFieldValue;
                        updateSet[targetField] = nullFieldValue;
                        const TargetColl = this.appDb.collection(targetColl);
                        const updateRes = await TargetColl.updateMany(updateQuery, updateSet,);
                        if (updateRes.modifiedCount !== updateRes.matchedCount) {
                            const recErrMsg = `Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`;
                            errMsg = errMsg ? `${errMsg} | ${recErrMsg}` : recErrMsg;
                        }
                    }
                }
            }
            // perform cache and audi-log tasks
            if (updateCount > 0) {
                // delete cache
                await deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes: ResponseMessage = {code: "unknown", message: "", value: {}, resCode: 0, resMessage: ""};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    }
                    const newLogDocuments: LogDocumentsType = {
                        queryParam: otherParams,
                    }
                    const logParams: AuditLogOptionsType = {
                        collName        : this.coll,
                        collDocuments   : logDocuments,
                        newCollDocuments: newLogDocuments,
                    }
                    logRes = await this.transLog.updateLog(this.userId, logParams);
                }
                const crudResult: CrudResultType<T> = {
                    recordsCount: updateCount,
                    logRes      : logRes,
                };
                return getResMessage("success", {
                    message: `Record(s) updated successfully: ${updateCount} of ${updateMatchedCount} documents updated.`,
                    value  : crudResult as unknown as ObjectType,
                });
            }
            return getResMessage("updateError", {
                message: "No documents updated. Please retry.",
            });
        } catch (e) {
            return getResMessage("updateError", {
                message: `Error updating record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }
}

// factory function/constructor
function newSaveRecord<T extends BaseModelType>(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
    return new SaveRecord(params, options);
}

export { SaveRecord, newSaveRecord };
