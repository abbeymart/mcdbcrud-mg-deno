/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16
 * @Company: mConnect.biz | @License: MIT
 * @Description: get stream of records, by docIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import { ObjectId, Document, Filter, ResponseMessage, } from '../../deps.ts';
import { isEmptyObject } from "../orm/index.ts";
import Crud from './Crud.ts';
import {
    AuditLogOptionsType, BaseModelType, CheckAccessType, CrudOptionsType, CrudParamsType, LogDocumentsType,
    QueryParamsType, TaskTypes, ValueType,
} from "./types.ts";

class GetRecordStream<T extends BaseModelType> extends Crud<T> {
    constructor(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
    }

    async getRecordStream(): Promise<AsyncIterable<Document>> {
        // check access permission
        if (this.checkAccess) {
            const loginStatusRes = await this.checkLoginStatus();
            if (loginStatusRes.code !== "success") {
                throw new Error(loginStatusRes.message);
            }
            let accessRes: ResponseMessage;
            // loginStatusRes.value.isAdmin
            if (this.checkAccess && !(loginStatusRes.value as unknown as CheckAccessType).isAdmin) {
                if (this.docIds && this.docIds.length > 0) {
                    accessRes = await this.taskPermissionById(TaskTypes.READ);
                    if (accessRes.code !== "success") {
                        throw new Error(accessRes.message);
                    }
                } else if (this.queryParams && !isEmptyObject(this.queryParams)) {
                    accessRes = await this.taskPermissionByParams(TaskTypes.READ);
                    if (accessRes.code !== "success") {
                        throw new Error(accessRes.message);
                    }
                } else {
                    const accessRes = await this.checkTaskAccess(TaskTypes.READ);
                    if (accessRes.code != "success") {
                        throw new Error(accessRes.message);
                    }
                }
            }
        }

        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            // return dbCheck;
            throw new Error(dbCheck.message);
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            // return auditDbCheck;
            throw new Error(auditDbCheck.message);
        }
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            // return accessDbCheck;
            throw new Error(accessDbCheck.message);
        }

        // set maximum limit and default values per query
        if (this.limit < 1) {
            this.limit = 1;
        } else if (this.limit > this.maxQueryLimit) {
            this.limit = this.maxQueryLimit;
        }
        if (this.skip < 0) {
            this.skip = 0;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        // let logRes = getResMessage("unknown");
        if ((this.logRead || this.logCrud) && this.queryParams && !isEmptyObject(this.queryParams)) {
            const logDocuments: LogDocumentsType = {
                queryParam: this.queryParams,
            };
            const logParams: AuditLogOptionsType = {
                collName     : this.coll,
                collDocuments: logDocuments,
            };
            await this.transLog.readLog(logParams, this.userId);
        } else if ((this.logRead || this.logCrud) && this.docIds && this.docIds.length > 0) {
            const logDocuments: LogDocumentsType = {
                docIds: this.docIds,
            };
            const logParams: AuditLogOptionsType = {
                collName     : this.coll,
                collDocuments: logDocuments,
            };
            await this.transLog.readLog(logParams, this.userId);
        } else if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                queryParam: {},
            };
            const logParams: AuditLogOptionsType = {
                collName     : this.coll,
                collDocuments: logDocuments,
            };
            await this.transLog.readLog(logParams, this.userId);
        }

        // exclude _id, if present, from the queryParams
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // Get the item(s) by docId(s), queryParams or all items
        if (this.docIds && this.docIds.length > 0) {
            try {
                // id(s): convert string to ObjectId
                const docIds = this.docIds.map(id => new ObjectId(id));
                // use / activate database
                const appDbColl = this.appDb.collection<T>(this.coll);
                const qParams: QueryParamsType = {_id: {$in: docIds}};
                return appDbColl.find(qParams as Filter<ValueType>)
                    .skip(this.skip)
                    .limit(this.limit)
                    .sort(this.sortParams);
            } catch (error) {
                console.error(error);
                throw new Error(`notFound: ${error.message}`);
            }
        }
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            try {
                // use / activate database
                const appDbColl = this.appDb.collection<T>(this.coll);
                return appDbColl.find(this.queryParams as Filter<ValueType>)
                    .skip(this.skip)
                    .limit(this.limit)
                    .sort(this.sortParams)
            } catch (error) {
                console.error(error);
                throw new Error(`notFound: ${error.message}`);
            }
        }
        // get all documents, up to the permissible limit
        try {
            // use / activate database
            const appDbColl = this.appDb.collection(this.coll);
            return appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .sort(this.sortParams)
        } catch (error) {
            console.error(error);
            throw new Error(`${error.message}`);
        }
    }
}

// factory function/constructor
function newGetRecordStream<T extends BaseModelType>(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
    return new GetRecordStream(params, options);
}

export { GetRecordStream, newGetRecordStream };
