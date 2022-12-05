import {assertEquals, mcTest, postTestResult,} from "../test_deps.ts";
import {CrudOptionsType, CrudParamsType, newDbMongo, newDeleteRecord,} from "../src/index.ts";
import {
    AuditTable, CrudParamOptions, DeleteAllTable, DeleteAuditById, DeleteAuditByIds, DeleteAuditByParams, DeleteTable,
    GetTable,
    TestUserInfo
} from "./testData.ts";
import {appDb, auditDb, dbOptions} from "./config/secure/config.ts";
import {DBRef, MongoClient} from "../deps.ts";


const appDbInstance = newDbMongo(appDb, dbOptions);
const auditDbInstance = newDbMongo(auditDb, dbOptions);

let appDbHandle: DBRef;
let appDbClient: MongoClient;
let auditDbHandle: DBRef;
let auditDbClient: MongoClient;

(async () => {
    // DB clients/handles
    appDbHandle = await appDbInstance.openDb()
    appDbClient = await appDbInstance.mgServer()
    auditDbHandle = await auditDbInstance.openDb()
    auditDbClient = await auditDbInstance.mgServer()

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : GetTable,
        userInfo   : TestUserInfo,
        docIds     : [],
        queryParams: {},
    };

    const crudOptions: CrudOptionsType = {
        auditDb      : auditDbHandle,
        auditDbClient: auditDbClient,
        auditDbName  : appDb.database,
        auditColl    : AuditTable,
        checkAccess  : false,
        logCrud      : true,
        logRead      : true,
        logCreate    : true,
        logDelete    : true,
        logUpdate    : true,
        cacheResult  : false,
    }
    
    await mcTest({
        name    : "should prevent the delete of all table records and return removeError:",
        testFunc: async () => {
            crudParams.coll = DeleteAllTable
            crudParams.docIds = []
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, CrudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-all-res: ", res)
            assertEquals(res.code, "removeError", `delete-task permitted by ids or queryParams only: removeError code expected`);
        }
    });

    await mcTest({
        name    : "should delete record by Id and return success or notFound[delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = DeleteTable
            crudParams.docIds = [DeleteAuditById]
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, CrudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-id-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : "should delete record by Ids and return success or notFound[delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = DeleteTable
            crudParams.docIds = DeleteAuditByIds
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, CrudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-ids-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : "should delete records by query-params and return success or notFound[delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = DeleteTable
            crudParams.docIds = []
            crudParams.queryParams = DeleteAuditByParams
            const crud = newDeleteRecord(crudParams, CrudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-params-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
