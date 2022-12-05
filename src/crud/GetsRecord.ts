/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16
 * @Company: mConnect.biz | @License: MIT
 * @Description: get aggregate records, by docIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import { ObjectId } from "mongodb";
import { getHashCache, setHashCache, } from "@mconnect/mccache";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "../orm";
import Crud from "./Crud";
import { CrudOptionsType, CrudParamsType, GetResultType } from "./types";

class GetRecord extends Crud {
    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
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
            await this.transLog.readLog(this.coll, this.queryParams, this.userId);
        } else if (this.logRead && this.docIds && this.docIds.length > 0) {
            await this.transLog.readLog(this.coll, this.docIds, this.userId);
        }

        // check cache for matching record(s), and return if exist
        try {
            const cacheRes = await getHashCache(this.cacheKey, this.coll);
            if (cacheRes && cacheRes.value) {
                console.log("cache-items-before-query: ", cacheRes.value[0]);
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
            const qParams: any = this.queryParams;
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
                const appDbColl = this.appDb.collection(this.coll);
                const result = await appDbColl.find({_id: {$in: docIds}})
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0 && totalDocsCount >= result.length) {
                    // TODO: get relational documents (source/parent-docs / target/child-docs)
                    // TODO: sourceFieldDocuments | targetFieldDocuments (e.g. idDocs | groupIdDocs)
                    // TODO: idDocs = [{_id: idDoc{}}] | [{groupId: [groupIdDoc{}]}]
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
                    await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
                    return getResMessage("success", {
                        value: resultValue,
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
                    .project(this.projectParams)
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
                    await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
                    return getResMessage("success", {
                        value: resultValue,
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
            // use / activate database
            const appDbColl = this.appDb.collection(this.coll);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .project(this.projectParams)
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
                await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
                return getResMessage("success", {
                    value: resultValue,
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
function newGetRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new GetRecord(params, options);
}

export { GetRecord, newGetRecord };
