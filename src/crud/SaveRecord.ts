/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-24
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: save-record(s) (create/insert and update record(s))
 */

// Import required module/function(s)
import {ObjectId, getResMessage, ResponseMessage, deleteHashCache, Document, } from "../../deps.ts";
import Crud from "./Crud.ts";
import {
    ActionParamTaskType, AuditLogOptionsType, BaseModelType, CrudOptionsType, CrudParamsType, ExistParamsType,
    LogDocumentsType, ObjectType,
    TaskTypes,
} from "./types.ts";
import {ModelOptionsType, RelationActionTypes, isEmptyObject} from "../orm/index.ts";

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
        // validate createItems and updateItems
        if (this.createItems.length === this.updateItems.length) {
            return getResMessage("saveError", {
                message: "Only Create or Update tasks, not both, may be performed exclusively.",
                value  : {},
            });
        }
        if (this.createItems.length < 1 && this.updateItems.length < 1) {
            return getResMessage("paramsError", {
                message: "Inputs errors (actionParams) to complete create or update tasks.",
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

        // update records/documents by queryParams: permitted for admin user only
        if (this.isAdmin && this.docIds.length < 1 && this.queryParams && !isEmptyObject(this.queryParams) &&
            this.actionParams.length === 1) {
            this.taskType = TaskTypes.UPDATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records update and audit log
                this.updateCascade = this.childRelations.filter(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.logCrud || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
                    const currentRec = await this.getCurrentRecords("queryparams");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecordByParams();
            } catch (e) {
                console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // create records/documents
        if (this.createItems.length > 0) {
            this.taskType = TaskTypes.CREATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist: ResponseMessage = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // create records
                return await this.createRecord();
            } catch (e) {
                console.error(e);
                return getResMessage("insertError", {
                    message: "Error-inserting/creating new record.",
                });
            }
        }

        // update existing records/documents
        if (this.updateItems.length > 0) {
            this.taskType = TaskTypes.UPDATE
            try {
                // check duplicate records, i.e. if similar records exist
                if (this.existParams.length > 0) {
                    const recExist = await this.checkRecExist();
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // get current records for update-cascade and audit log
                this.updateCascade = this.childRelations.map(item => item.onUpdate === RelationActionTypes.CASCADE).length > 0;
                this.updateSetNull = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_NULL).length > 0;
                this.updateSetDefault = this.childRelations.map(item => item.onUpdate === RelationActionTypes.SET_DEFAULT).length > 0;
                if (this.logUpdate || this.logCrud || this.updateCascade || this.updateSetNull || this.updateSetDefault) {
                    const currentRec = await this.getCurrentRecords("id");
                    if (currentRec.code !== "success") {
                        return currentRec;
                    }
                }
                // update records
                return await this.updateRecordById();
            } catch (e) {
                console.error(e);
                return getResMessage("updateError", {
                    message: `Error updating record(s): ${e.message ? e.message : ""}`,
                });
            }
        }

        // return save-error message
        return getResMessage("saveError", {
            message: "Error performing the requested operation(s). Please retry",
        });
    }

    // helper methods:
    computeItems(modelOptions: ModelOptionsType = this.modelOptions): ActionParamTaskType<T> {
        const updateItems: Array<T> = [],
            docIds: Array<string> = [],
            createItems: Array<T> = [];

        // Ensure the _id for actionParams are of type mongoDb-new ObjectId, for update actions
        if (this.actionParams && this.actionParams.length > 0) {
            for (let item of this.actionParams) {
                if (item["_id"] || item["_id"] !== "" || item["_id"] !== null) {
                    // update/existing document
                    if (modelOptions.actorStamp) {
                        item["updatedBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item["updatedAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && item["isActive"] === undefined) {
                        item["isActive"] = true;
                    }
                    updateItems.push(item);
                    docIds.push(item["_id"] as string);
                } else {
                    // exclude any traces of _id, especially without concrete value ("", null, undefined), if present
                    const {_id, ...saveParams} = item;
                    item = saveParams as T;
                    // create/new document
                    if (modelOptions.actorStamp) {
                        item["createdBy"] = this.userId;
                    }
                    if (modelOptions.timeStamp) {
                        item["createdAt"] = new Date();
                    }
                    if (modelOptions.activeStamp && item["isActive"] === undefined) {
                        item["isActive"] = true;
                    }
                    createItems.push(item);
                }
            }
            this.createItems = createItems;
            this.updateItems = updateItems;
            this.docIds = docIds;
        }
        return {
            createItems,
            updateItems,
            docIds,
        };
    }

    async createRecord(): Promise<ResponseMessage> {
        if (this.createItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to create new record(s), due to incomplete/incorrect input-parameters. ",
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
            // insert/create multiple records and audit-log
            const appDbColl = this.appDb.collection<T>(this.coll);
            const insertResult = await appDbColl.insertMany(this.createItems);
            // commit or abort trx
            if (insertResult.insertedCount < 1 || insertResult.insertedIds.length < 1 || insertResult.insertedCount < this.createItems.length) {
                throw new Error(`Unable to create new record(s), database error [${insertResult.insertedCount} of ${this.createItems.length} set to be created]`)
            }


            // perform cache and audi-log tasks
            if (insertResult.insertedCount > 0) {
                // delete cache | this.cacheKey, this.coll, "key"
                deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes = {};
                if (this.logCreate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.createItems,
                    };
                    const logParams: AuditLogOptionsType = {
                        collName: this.coll,
                        collDocuments: logDocuments,
                    }
                    logRes = await this.transLog.createLog(this.userId, logParams);
                }
                return getResMessage("success", {
                    message: `Record(s) created successfully: ${insertResult.insertedCount} of ${this.createItems.length} items created.`,
                    value  : {
                        docCount: insertResult.insertedCount,
                        docIds  : insertResult.insertedIds,
                        logRes,
                    },
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
        if (this.updateItems.length < 1) {
            return getResMessage("insertError", {
                message: "Unable to update record(s), due to incomplete/incorrect input-parameters. ",
            });
        }
        // updated record(s)
        try {
            // check/validate update/upsert command for multiple records
            let updateCount = 0;
            let updateMatchedCount = 0;
            // update one record
            if (this.updateItems.length === 1) {
                // destruct _id /other attributes
                const item = this.updateItems[0];
                const {
                    _id,
                    ...otherParams
                } = item;
                    const appDbColl = this.appDb.collection(this.coll);
                    // current record prior to update
                    const currentRec = await appDbColl.findOne({_id: new ObjectId(_id)});
                    if (!currentRec || isEmptyObject(currentRec)) {
                        throw new Error("Unable to retrieve current record for update.");
                    }
                    const updateResult = await appDbColl.updateOne({
                        _id: new ObjectId(_id),
                    }, {
                        $set: otherParams,
                    });
                    if (updateResult.modifiedCount !== updateResult.matchedCount) {
                        throw new Error(`Error updating document(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
                    }
                    updateCount += updateResult.modifiedCount;
                    updateMatchedCount += updateResult.matchedCount;
                    // commit or abort trx
                    if (updateCount < 1 || updateCount != updateMatchedCount) {
                        throw new Error("No records updated. Please retry.")
                    }
            }
            // update multiple records
            if (this.updateItems.length > 1) {

                    const appDbColl = this.appDb.collection(this.coll);
                    for await (const item of this.updateItems) {
                        // destruct _id /other attributes
                        const {
                            _id,
                            ...otherParams
                        } = item;
                        // current record prior to update
                        const currentRec = await appDbColl.findOne({_id: new Object(_id as string)});
                        if (!currentRec || isEmptyObject(currentRec)) {
                            throw new Error("Unable to retrieve current record for update.");
                        }
                        const updateResult = await appDbColl.updateOne({
                            _id: new ObjectId(_id as string),
                        }, {
                            $set: otherParams,
                        });
                        if (updateResult.modifiedCount !== updateResult.matchedCount) {
                            throw new Error(`Error updating document(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
                        }
                        updateCount += updateResult.modifiedCount;
                        updateMatchedCount += updateResult.matchedCount
                    }
                    // commit or abort trx
                    if (updateCount < 1 || updateCount != updateMatchedCount) {
                        throw new Error("No records updated. Please retry.")
                    }

            }
            // perform cache and audi-log tasks
            if (updateCount > 0) {
                // delete cache
                await deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes = {};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    };
                    const newLogDocuments: LogDocumentsType = {
                        collDocuments: this.updateItems,
                    };
                    const logParams: AuditLogOptionsType = {
                        collName: this.coll,
                        collDocuments: logDocuments,
                        newCollDocuments: newLogDocuments,
                    }
                    logRes = await this.transLog.updateLog(this.userId, logParams);
                }
                return getResMessage("success", {
                    message: "Record(s) updated successfully.",
                    value  : {
                        docCount: updateCount,
                        logRes,
                    },
                });
            }
            return getResMessage("updateError", {
                message: "No records updated. Please retry.",
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
        if (this.isRecExist) {
            return getResMessage("recExist", {
                message: this.recExistMessage,
            });
        }
        let updateResult;
        try {
            // destruct _id /other attributes
            const item = this.actionParams[0];
            const {_id, ...otherParams} = item;
            // include item stamps: userId and date
            otherParams.updatedBy = this.userId;
            otherParams.updatedAt = new Date();
            const updateParams = otherParams;
            let updateCount = 0;
            let updateMatchedCount = 0;

                const appDbColl = this.appDb.collection(this.coll);
                // query current records prior to update
                const currentRecs = await appDbColl.find(this.queryParams, ).toArray();
                if (!currentRecs || currentRecs.length < 1) {
                    throw new Error("Unable to retrieve current document(s) for update.");
                }
                updateResult = await appDbColl.updateMany(this.queryParams, {
                    $set: otherParams
                }, );
                if (updateResult.modifiedCount !== updateResult.matchedCount) {
                    throw new Error(`Error updating document(s) [${updateResult.modifiedCount} of ${updateResult.matchedCount} set to be updated]`)
                }
                updateCount += updateResult.modifiedCount;
                updateMatchedCount += updateResult.matchedCount
                // commit or abort trx
                if (updateCount < 1 || updateCount != updateMatchedCount) {
                    throw new Error("No records updated. Please retry.")
                }

            // perform cache and audi-log tasks
            if (updateCount > 0) {
                // delete cache
                await deleteHashCache({key: this.cacheKey, hash: this.coll, by: "key"});
                // check the audit-log settings - to perform audit-log
                let logRes = {};
                if (this.logUpdate || this.logCrud) {
                    const logDocuments: LogDocumentsType = {
                        collDocuments: this.currentRecs,
                    }
                    const newLogDocuments: LogDocumentsType = {
                        queryParam: updateParams,
                    }
                    const logParams: AuditLogOptionsType = {
                        collName: this.coll,
                        collDocuments: logDocuments,
                        newCollDocuments: newLogDocuments,
                    }
                    logRes = await this.transLog.updateLog(this.userId, logParams);
                }
                return getResMessage("success", {
                    message: "Requested action(s) performed successfully.",
                    value  : {
                        docCount: updateCount,
                        logRes,
                    },
                });
            }
            return getResMessage("updateError", {
                message: "No records updated. Please retry.",
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
function newSaveRecord<T extends Document>(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
    return new SaveRecord(params, options);
}

export {SaveRecord, newSaveRecord};
