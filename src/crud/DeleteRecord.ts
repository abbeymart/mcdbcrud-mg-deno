/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16, 2022-12-06
 * Updated 2018-04-08, prototype-to-class
 * @Company: mConnect.biz | @License: MIT
 * @Description: delete one or more records / documents by docIds or queryParams
 */

// Import required module/function(s)
import { ObjectId, getResMessage, ResponseMessage, deleteHashCache, Filter } from "../../deps.ts";
import Crud from "./Crud.ts";
import {
    AuditLogOptionsType,
    BaseModelType,
    CrudOptionsType, CrudParamsType, CrudResultType, LogDocumentsType, ObjectType, QueryParamsType, SubItemsType,
    ValueType,
} from "./types.ts";
import { isEmptyObject } from "../orm/index.ts";

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
                    const refIntegrity = await this.checkRefIntegrityById();
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
                    const refIntegrity = await this.checkRefIntegrityByParams();
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

    // checkRefIntegrityById checks referential integrity for parent-child collections, by document-Id
    checkRefIntegrityById(): ResponseMessage {
        // required-inputs: parent/child-collections and current item-id/item-name
        if (this.childRelations.length < 1) {
            return getResMessage("success", {
                message: "no data integrity condition specified or required",
            });
        }
        if (this.docIds.length > 0) {
            // prevent item delete, if child-collection-items reference itemId
            const subItems: Array<SubItemsType> = []
            // docIds ref-check
            const childExist = this.childRelations.some(async(relation) => {
                const targetDbColl = this.appDb.collection<T>(relation.targetColl);
                // include foreign-key/target as the query condition
                const targetField = relation.targetField;
                const sourceField = relation.sourceField;
                const query: ObjectType = {}
                if (sourceField === "_id") {
                    query[targetField] = {
                        $in: this.docIds,
                    }
                } else {
                    // other source-fields besides _id
                    const sourceFieldValues = this.currentRecs.map((item) => (item as unknown as ObjectType)[sourceField]);
                    query[targetField] = {
                        $in: sourceFieldValues,
                    }
                }
                const collItem = await targetDbColl.findOne(query as Filter<ValueType>);
                if (collItem && !isEmptyObject(collItem as unknown as ObjectType)) {
                    subItems.push({
                        collName          : relation.targetColl,
                        hasRelationRecords: true,
                    });
                    return true;
                } else {
                    subItems.push({
                        collName          : relation.targetColl,
                        hasRelationRecords: false,
                    });
                    return false;
                }
            });
            this.subItems = subItems;
            if (childExist) {
                return getResMessage("subItems", {
                    message: `A record that contains sub-items cannot be deleted. Delete/remove the sub-items [from ${this.childColls.join(", ")} collection(s)], first.`,
                    value  : subItems as unknown as Array<ObjectType>,
                });
            } else {
                return getResMessage("success", {
                    message: "no data integrity issue",
                    value  : subItems as unknown as Array<ObjectType>,
                });
            }
        } else {
            return getResMessage("success", {
                message: "docIds is required for integrity check/validation",
            });
        }
    }

    // checkRefIntegrityByParams checks referential integrity for parent-child collections, by queryParams
    async checkRefIntegrityByParams(): Promise<ResponseMessage> {
        // required-inputs: parent/child-collections and current item-id/item-name
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            await this.getCurrentRecords("queryParams")
            this.docIds = [];
            this.currentRecs.forEach((item) => {
                this.docIds.push(item["_id"] as string);
            });
            return this.checkRefIntegrityById();
        }
        return getResMessage("paramsError", {
            message: "queryParams is required",
        })
    }

    async removeRecordById(): Promise<ResponseMessage> {
        // delete/remove records and log in audit-collection
        // id(s): convert string to ObjectId
        const docIds = this.docIds.map(id => new ObjectId(id));
        try {
            const appDbColl = this.appDb.collection<T>(this.coll);
            const qParams: QueryParamsType = {_id: {$in: docIds,}};
            const removed = await appDbColl.deleteMany(qParams as Filter<ValueType>);
            if (!removed || removed < 1) {
                throw new Error(`Unable to delete the specified records [${removed} of ${docIds.length} set to be removed].`)
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
            return getResMessage("deleteError", {message: "No record(s) deleted"});
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
            if (this.queryParams && !isEmptyObject(this.queryParams)) {
                const appDbColl = this.appDb.collection<T>(this.coll);
                const removed = await appDbColl.deleteMany(this.queryParams as Filter<ValueType>);
                if (!removed || removed < 1) {
                    throw new Error(`Unable to delete the specified records [${removed} of ${this.currentRecs.length} set to be removed].`)
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
                    return getResMessage("deleteError", {message: "No record(s) deleted"});
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
