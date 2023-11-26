import { assertEquals, assertNotEquals, mcTest, postTestResult } from "../test_deps.ts";
import { appDb, auditDb, dbOptions } from "./config/secure/config.ts";
import {
    CrudParamsType, GetResultType,
    newDbMongo, newGetRecord, AuditType
} from "../src/index.ts";
import {
    crudParamOptions, getColl, testUserInfo, GetAuditById, GetAuditByIds, GetAuditByParams, auditColl
} from "./testData.ts";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);
    const auditDbInstance = newDbMongo(auditDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType<AuditType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : getColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should get records by Id and return success:",
        testFunc: async () => {
            crudParams.docIds = [GetAuditById]
            crudParams.queryParams = {}
            const crud = newGetRecord(crudParams, crudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as unknown as GetResultType<AuditType>
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
            const crud = newGetRecord(crudParams, crudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as unknown as GetResultType<AuditType>
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
            const crud = newGetRecord(crudParams, crudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as unknown as GetResultType<AuditType>
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
            crudParams.coll = getColl
            crudParams.docIds = []
            crudParams.queryParams = {}
            crudParamOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, crudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as unknown as GetResultType<AuditType>
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
            crudParams.coll = getColl
            crudParams.docIds = []
            crudParams.queryParams = {}
            crudParams.skip = 0
            crudParams.limit = 20
            crudParamOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, crudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as unknown as GetResultType<AuditType>
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 20, `response-value-records-length should be: 20`);
            assertEquals(recCount, 20, `response-value-stats-recordsCount should be: 20`);
        }
    });

    postTestResult();
    appDbInstance.closeDb();
    auditDbInstance.closeDb();

})();
