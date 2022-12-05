import {assertEquals, assertNotEquals, mcTest, postTestResult} from "../test_deps.ts";
import {appDb, auditDb, dbOptions} from "./config/secure/config.ts";
import {CrudOptionsType, CrudParamsType, GetResultType, newDbMongo, newGetRecord} from "../src/index.ts";
import {
    CrudParamOptions, GetTable, TestUserInfo, GetAuditById, GetAuditByIds, GetAuditByParams, AuditTable
} from "./testData.ts";
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
        name    : "should get records by Id and return success:",
        testFunc: async () => {
            crudParams.docIds = [GetAuditById]
            crudParams.queryParams = {}
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 1, `response-value-records-length should be: 1`);
            assertEquals(recCount, 1, `response-value-stats-recordsCount should be: 1`);
        }
    });

    await mcTest({
        name    : "should get records by Ids and return success:",
        testFunc: async () => {
            crudParams.docIds = GetAuditByIds
            crudParams.queryParams = {}
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 2, `response-value-records-length should be: 2`);
            assertEquals(recCount, 2, `response-value-stats-recordsCount should be: 2`);
        }
    });

    await mcTest({
        name    : "should get records by query-params and return success:",
        testFunc: async () => {
            crudParams.docIds = []
            crudParams.queryParams = GetAuditByParams
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen > 0, true, `response-value-records-length should be: > 0`);
            assertEquals(recCount > 0, true, `response-value-stats-recordsCount should be:  > 0`);
        }
    });

    await mcTest({
        name    : "should get all records and return success:",
        testFunc: async () => {
            crudParams.coll = GetTable
            crudParams.docIds = []
            crudParams.queryParams = {}
            CrudParamOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen > 20, true, `response-value-records-length should be: > 20`);
            assertEquals(recCount > 20, true, `response-value-stats-recordsCount should be:  > 20`);
        }
    });

    await mcTest({
        name    : "should get all records by limit/skip(offset) and return success:",
        testFunc: async () => {
            crudParams.coll = GetTable
            crudParams.docIds = []
            crudParams.queryParams = {}
            crudParams.skip = 0
            crudParams.limit = 20
            CrudParamOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 20, `response-value-records-length should be: 20`);
            assertEquals(recCount, 20, `response-value-stats-recordsCount should be: 20`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
