/**
 * @Author: abbeymart | Abi Akindele | @Created: 2018-11-19 | @Updated: 2019-06-15
 * @Company: mConnect.biz | @License: MIT
 * @Description: bulk load records / documents, strictly for server-side(admin) ETL tasks
 */

// Import required module/function(s)
import { Database, getResMessage, getParamsMessage, ResponseMessage } from "../../deps.ts";
import { isEmptyObject } from "../orm/index.ts";
import { validateLoadParams } from "./ValidateCrudParam.ts";
import { checkDb } from "../dbc/index.ts";
import { BaseModelType, CrudOptionsType, CrudParamsType, UserInfoType } from "./types.ts";

class LoadRecord<T extends BaseModelType> {
    protected params: CrudParamsType<T>;
    protected appDb: Database;
    protected coll: string;
    protected token: string;
    protected userInfo: UserInfoType;
    protected actionParams: Array<T>;
    protected userId: string;
    protected maxQueryLimit: number;

    constructor(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
        this.params = params;
        this.appDb = params.appDb;
        this.coll = params.coll;
        this.actionParams = params && params.actionParams ? params.actionParams : [];
        this.userInfo = params && params.userInfo ? params.userInfo :
            {
                token    : "",
                userId   : "",
                firstname: "",
                lastname : "",
                language : "",
                loginName: "",
                expire   : 0,
            };
        this.token = params && params.token ? params.token : this.userInfo.token || "";
        this.userId = this.userInfo.userId || "";
        this.maxQueryLimit = options && options.maxQueryLimit ? options.maxQueryLimit : 10000;
    }

    async loadRecord(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // limit maximum records to bulk-load to 10,000 records
        if (this.maxQueryLimit > 10000) {
            this.maxQueryLimit = 10000;
        }

        const totalRecordCount = this.actionParams.length;
        const errors = validateLoadParams(this.params);
        if (totalRecordCount > this.maxQueryLimit) {
            errors.maxQueryLimit = `${this.actionParams.length} records load-request, exceeded ${this.maxQueryLimit} limit. 
        Please do not send more than ${this.maxQueryLimit} records to load at a time`;
        }
        if (!isEmptyObject(errors)) {
            return getParamsMessage(errors, "paramsError");
        }

        // create/load multiple records
        if (totalRecordCount > 0) {
            // check if items/records exist using the existParams/actionParams
            try {
                // use / activate database-collection
                const appDbColl = this.appDb.collection(this.coll);
                // clear the current collection documents/records, for refresh
                await appDbColl.deleteMany({});
                // refresh (insert/create) new multiple records
                const records = await appDbColl.insertMany(this.actionParams);
                if (records.insertedCount > 0) {
                    return getResMessage('success', {
                        message: `${records.insertedCount} of ${totalRecordCount} record(s) created successfully.`,
                        value  : {
                            docCount  : records.insertedCount,
                            totalCount: totalRecordCount,
                        },
                    });
                }
                return getResMessage('insertError', {
                    message: 'Error-inserting/creating new record(s). Please retry.',
                    value  : {
                        docCount: records.insertedCount,
                    },
                });
            } catch (error) {
                return getResMessage('insertError', {
                    message: 'Error-inserting/creating new record(s). Please retry.',
                    value  : {
                        error,
                    },
                });
            }
        }
        // return insertError
        return getResMessage('insertError', {
            message: 'No records inserted. Please retry.',
        });
    }

}

// factory function
function newLoadRecord<T extends BaseModelType>(params: CrudParamsType<T>, options: CrudOptionsType = {}) {
    return new LoadRecord(params, options);
}

export { LoadRecord, newLoadRecord };
