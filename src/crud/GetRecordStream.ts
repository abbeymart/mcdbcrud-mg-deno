/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16, 2023-11-22
 * @Company: mConnect.biz | @License: MIT
 * @Description: get stream of records, by docIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import { ObjectId } from 'mongodb';
import { isEmptyObject } from "../orm";
import Crud from './Crud';
import {CrudOptionsType, CrudParamsType, LogDocumentsType,} from "./types";

class GetRecordStream extends Crud {
    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
    }

    async getRecordStream(): Promise<AsyncIterable<Document>> {
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
            }
            await this.transLog.readLog(this.coll, logDocuments, this.userId);
        } else if ((this.logRead || this.logCrud) && this.docIds && this.docIds.length > 0) {
            const logDocuments: LogDocumentsType = {
                docIds: this.docIds,
            }
            await this.transLog.readLog(this.coll, logDocuments, this.userId);
        } else if(this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                queryParam: {},
            }
            await this.transLog.readLog(this.coll, logDocuments, this.userId);
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
                // use / activate database
                const appDbColl = this.appDb.collection(this.coll);
                return appDbColl.find({_id: {$in: docIds}})
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .stream();
            } catch (error) {
                console.error(error);
                throw new Error(`notFound: ${error.message}`);
            }
        }
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            try {
                // use / activate database
                const appDbColl = this.appDb.collection(this.coll);
                return appDbColl.find(this.queryParams)
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .stream();
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
                .project(this.projectParams)
                .sort(this.sortParams)
                .stream();
        } catch (error) {
            console.error(error);
            throw new Error(`notFound: ${error.message}`);
        }
    }
}

// factory function/constructor
function newGetRecordStream(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new GetRecordStream(params, options);
}

export { GetRecordStream, newGetRecordStream };
