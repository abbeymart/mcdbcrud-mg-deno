/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16
 * @Company: mConnect.biz | @License: MIT
 * @Description: get records, by docIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import { ObjectId, getHashCache, setHashCache, getResMessage, ResponseMessage, Filter, } from "../../deps.ts";
import { isEmptyObject } from "../orm/index.ts";
import Crud from "./Crud.ts";
import {
    AuditLogOptionsType,
    BaseModelType, CrudOptionsType, CrudParamsType, GetRecords, GetRecordStats, GetResultType, LogDocumentsType,
    ObjectType,
    QueryParamsType,
    ValueType
} from "./types.ts";

class GetRecord<T extends BaseModelType> extends Crud<T> {
    constructor(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
    }

    async getRecord(): Promise<ResponseMessage> {
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

        // set maximum limit and default values per query
        if (this.limit < 1) {
            this.limit = 1;
        } else if (this.limit > this.maxQueryLimit) {
            this.limit = this.maxQueryLimit;
        }
        if (this.skip < 0) {
            this.skip = 0;
        }

        // exclude _id, if present, from the queryParams
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if ((this.logRead || this.logCrud) && this.queryParams && !isEmptyObject(this.queryParams)) {
            const logDocuments: LogDocumentsType = {
                queryParam: this.queryParams,
            };
            const logParams: AuditLogOptionsType = {
                collName     : this.coll,
                collDocuments: logDocuments,
            };
            logRes = await this.transLog.readLog(logParams, this.userId);
        } else if ((this.logRead || this.logCrud) && this.docIds && this.docIds.length > 0) {
            const logDocuments: LogDocumentsType = {
                docIds: this.docIds,
            };
            const logParams: AuditLogOptionsType = {
                collName     : this.coll,
                collDocuments: logDocuments,
            };
            logRes = await this.transLog.readLog(logParams, this.userId);
        } else if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                queryParam: {},
            };
            const logParams: AuditLogOptionsType = {
                collName     : this.coll,
                collDocuments: logDocuments,
            };
            logRes = await this.transLog.readLog(logParams, this.userId);
        }

        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = await getHashCache({key: this.cacheKey, hash: this.coll,});
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", (cacheRes.value as unknown as GetResultType).records[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the collection-documents by docId(s)
        if (this.docIds && this.docIds.length > 0) {
            try {
                // id(s): convert string to ObjectId
                const docIds = this.docIds.map(id => new ObjectId(id));
                // use / activate database
                const appDbColl = this.appDb.collection<T>(this.coll);
                const qParams: QueryParamsType = {_id: {$in: docIds}};
                const result = await appDbColl.find(qParams as Filter<ValueType>)
                    .skip(this.skip)
                    .limit(this.limit)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0 && totalDocsCount >= result.length) {
                    // save copy in the cache
                    const stats: GetRecordStats = {
                        skip             : this.skip,
                        limit            : this.limit,
                        recordsCount     : result.length,
                        totalRecordsCount: totalDocsCount,
                    }
                    const resultValue: GetResultType = {
                        records: result as unknown as GetRecords,
                        stats,
                        logRes,
                    }

                    setHashCache({key: this.cacheKey, hash: this.coll,value: resultValue as unknown as ObjectType, expire: this.cacheExpire});
                    return getResMessage("success", {
                        value: resultValue as unknown as ObjectType,
                    });
                }
                return getResMessage("notFound");
            } catch (error) {
                return getResMessage("notFound", {
                    value: error,
                });
            }
        }
        // Get the collection-documents by queryParams
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            try {
                // use / activate database
                const appDbColl = this.appDb.collection<T>(this.coll);
                const result = await appDbColl.find(this.queryParams as Filter<ValueType>)
                    .skip(this.skip)
                    .limit(this.limit)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0 && totalDocsCount >= result.length) {
                    // save copy in the cache
                    const stats: GetRecordStats = {
                        skip             : this.skip,
                        limit            : this.limit,
                        recordsCount     : result.length,
                        totalRecordsCount: totalDocsCount,
                    }
                    const resultValue: GetResultType = {
                        records: result as unknown as GetRecords,
                        stats,
                        logRes,
                    }
                    setHashCache({key: this.cacheKey, hash: this.coll, value: resultValue as unknown as ObjectType, expire: this.cacheExpire});
                    return getResMessage("success", {
                        value: resultValue as unknown as ObjectType,
                    });
                }
                return getResMessage("notFound");
            } catch (error) {
                return getResMessage("notFound", {
                    value: error,
                });
            }
        }
        // get all the collection-documents, up to the permissible limit
        try {
            // use / activate database
            const appDbColl = this.appDb.collection<T>(this.coll);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
                // save copy in the cache
                const stats: GetRecordStats = {
                    skip             : this.skip,
                    limit            : this.limit,
                    recordsCount     : result.length,
                    totalRecordsCount: totalDocsCount,
                }
                const resultValue: GetResultType = {
                    records: result as unknown as GetRecords,
                    stats,
                    logRes,
                }
                setHashCache({key: this.cacheKey, hash: this.coll, value: resultValue as unknown as ObjectType, expire: this.cacheExpire});
                return getResMessage("success", {
                    value: resultValue as unknown as ObjectType,
                });
            }
            return getResMessage("notFound");
        } catch (error) {
            return getResMessage("notFound", {
                value: error,
            });
        }
    }

    async getRecordsById(): Promise<ResponseMessage> {
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

        // set maximum limit and default values per query
        if (this.limit < 1) {
            this.limit = 1;
        } else if (this.limit > this.maxQueryLimit) {
            this.limit = this.maxQueryLimit;
        }
        if (this.skip < 0) {
            this.skip = 0;
        }

        if (!this.docIds || this.docIds.length < 1) {
            return getResMessage("paramsError", {
                message: "docIds is required",
            });
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                docIds: this.docIds,
            };
            const logParams: AuditLogOptionsType = {
                collName: this.coll,
                collDocuments: logDocuments,
            }
            logRes = await this.transLog.readLog(logParams, this.userId);
        }

        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = await getHashCache({key: this.cacheKey, hash: this.coll,});
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", (cacheRes.value as unknown as GetResultType).records[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the collection-documents by docId(s)
        try {
            // id(s): convert string to ObjectId
            const docIds = this.docIds.map(id => new ObjectId(id));
            // use / activate database
            const appDbColl = this.appDb.collection<T>(this.coll);
            const qParams: QueryParamsType = {_id: {$in: docIds}};
            const result = await appDbColl.find(qParams as Filter<ValueType>)
                .skip(this.skip)
                .limit(this.limit)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
                // save copy in the cache
                const stats: GetRecordStats = {
                    skip             : this.skip,
                    limit            : this.limit,
                    recordsCount     : result.length,
                    totalRecordsCount: totalDocsCount,
                }
                const resultValue: GetResultType = {
                    records: result as unknown as GetRecords,
                    stats,
                    logRes,
                }
                // this.cacheKey, this.coll, resultValue, this.cacheExpire
                await setHashCache({key: this.cacheKey, hash: this.coll, value: resultValue as unknown as ObjectType, expire: this.cacheExpire});
                return getResMessage("success", {
                    value: resultValue as unknown as ObjectType,
                });
            }
            return getResMessage("notFound");
        } catch (error) {
            return getResMessage("notFound", {
                value: error,
            });
        }
    }

    async getRecordsByQueryParams(): Promise<ResponseMessage> {
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

        // set maximum limit and default values per query
        if (this.limit < 1) {
            this.limit = 1;
        } else if (this.limit > this.maxQueryLimit) {
            this.limit = this.maxQueryLimit;
        }
        if (this.skip < 0) {
            this.skip = 0;
        }

        if (!this.queryParams || isEmptyObject(this.queryParams)) {
            return getResMessage("paramsError", {
                message: "queryParams is required",
            });
        }

        // exclude _id, if present, from the queryParams
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                queryParam: this.queryParams,
            };
            const logParams: AuditLogOptionsType = {
                collName: this.coll,
                collDocuments: logDocuments,
            }
            logRes = await this.transLog.readLog(logParams, this.userId);
        }

        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = await getHashCache({key: this.cacheKey, hash: this.coll,});
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", (cacheRes.value as unknown as GetResultType).records[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the collection-documents by queryParams
        try {
            // use / activate database
            const appDbColl = this.appDb.collection<T>(this.coll);
            const result = await appDbColl.find(this.queryParams as Filter<ValueType>)
                .skip(this.skip)
                .limit(this.limit)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
                // save copy in the cache
                const stats: GetRecordStats = {
                    skip             : this.skip,
                    limit            : this.limit,
                    recordsCount     : result.length,
                    totalRecordsCount: totalDocsCount,
                }
                const resultValue: GetResultType = {
                    records: result as unknown as GetRecords,
                    stats,
                    logRes,
                }
                //
                await setHashCache({key: this.cacheKey, hash: this.coll, value: resultValue as unknown as ObjectType, expire: this.cacheExpire});
                return getResMessage("success", {
                    value: resultValue as unknown as ObjectType,
                });
            }
            return getResMessage("notFound");
        } catch (error) {
            return getResMessage("notFound", {
                value: error,
            });
        }
    }

    async getAllRecords(): Promise<ResponseMessage> {
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
        let logRes = getResMessage("unknown");
        if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                queryParam: {},
            };
            const logParams: AuditLogOptionsType = {
                collName: this.coll,
                collDocuments: logDocuments,
            }
            logRes = await this.transLog.readLog(logParams, this.userId);
        }
        // get all collection-documents, up to the permissible limit
        try {
            // use / activate database
            const appDbColl = this.appDb.collection<T>(this.coll);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
                // save copy in the cache
                const stats: GetRecordStats = {
                    skip             : this.skip,
                    limit            : this.limit,
                    recordsCount     : result.length,
                    totalRecordsCount: totalDocsCount,
                }
                const resultValue: GetResultType = {
                    records: result as unknown as GetRecords,
                    stats,
                    logRes,
                }
                await setHashCache({key: this.cacheKey, hash: this.coll, value: resultValue as unknown as ObjectType, expire: this.cacheExpire});
                return getResMessage("success", {
                    value: resultValue as unknown as ObjectType,
                });
            }
            return getResMessage("notFound");
        } catch (error) {
            return getResMessage("notFound", {
                value: error,
            });
        }
    }
}

// factory function/constructor
function newGetRecord<T extends BaseModelType>(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
    return new GetRecord(params, options);
}

export { GetRecord, newGetRecord };
