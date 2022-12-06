/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16
 * @Company: mConnect.biz | @License: MIT
 * @Description: get aggregate records, by docIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import { ObjectId, getHashCache, setHashCache, getResMessage, ResponseMessage, Filter } from "../../deps.ts";
import { isEmptyObject } from "../orm/index.ts";
import Crud from "./Crud.ts";
import {
    AuditLogOptionsType, BaseModelType, CrudOptionsType, CrudParamsType, GetRecords, GetResultType, ObjectType,
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

        // check read permission
        // let roleServices: RoleServiceResponseType;

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        if (this.logRead && this.queryParams && !isEmptyObject(this.queryParams)) {
            const logParams: AuditLogOptionsType = {
                collName: this.coll,
                collDocuments: {queryParam: this.queryParams},
            };
            await this.transLog.readLog(logParams, this.userId);
        } else if (this.logRead && this.docIds && this.docIds.length > 0) {
            const logParams: AuditLogOptionsType = {
                collName: this.coll,
                collDocuments: {docIds: this.docIds},
            };
            await this.transLog.readLog(logParams, this.userId);
        }

        // check cache for matching record(s), and return if exist
        try {
            // this.cacheKey, this.coll
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
                let resultValue: GetResultType;
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
                    // TODO: get relational documents (source/parent-docs / target/child-docs)
                    // TODO: sourceFieldDocuments | targetFieldDocuments (e.g. idDocs | groupIdDocs)
                    // TODO: idDocs = [{_id: idDoc{}}] | [{groupId: [groupIdDoc{}]}]
                    // save copy in the cache
                    resultValue = {
                        records: result as unknown as GetRecords,
                        stats  : {
                            skip             : this.skip,
                            limit            : this.limit,
                            recordsCount     : result.length,
                            totalRecordsCount: totalDocsCount,
                        }
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
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            try {
                let resultValue: GetResultType;
                // use / activate database
                const appDbColl = this.appDb.collection(this.coll);
                const result = await appDbColl.find(this.queryParams)
                    .skip(this.skip)
                    .limit(this.limit)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0 && totalDocsCount >= result.length) {
                    // TODO: get relational documents (source/parent-docs / target/child-docs)
                    // save copy in the cache
                    resultValue = {
                        records: result,
                        stats  : {
                            skip             : this.skip,
                            limit            : this.limit,
                            recordsCount     : result.length,
                            totalRecordsCount: totalDocsCount,
                        }
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
        // get all records, up to the permissible limit
        try {
            let resultValue: GetResultType;
            // use / activate database | .project(this.projectParams)
            const appDbColl = this.appDb.collection(this.coll);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
                // TODO: get relational documents (source/parent-docs / target/child-docs)
                // save copy in the cache
                resultValue = {
                    records: result,
                    stats  : {
                        skip             : this.skip,
                        limit            : this.limit,
                        recordsCount     : result.length,
                        totalRecordsCount: totalDocsCount,
                    }
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
