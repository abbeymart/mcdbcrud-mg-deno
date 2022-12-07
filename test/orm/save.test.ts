import { assertEquals, mcTest, postTestResult } from "../../test_deps.ts";
import {
    AuditType, CrudParamsType, CrudResultType,
    newDbMongo, newSaveRecord
} from "../../src/index.ts";
import {
    AuditCreateActionParams, auditColl, AuditUpdateActionParams, AuditUpdateRecordById, AuditUpdateRecordByParam,
    crudParamOptions,
    getColl, GroupModel, testUserInfo, UpdateAuditById, UpdateAuditByIds, UpdateAuditByParams, updateColl
} from "./testData.ts";
import { appDb, auditDb, dbOptions } from "../config/secure/config.ts";

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
        name    : "should create two new records [groups] and return success:",
        testFunc: async () => {
            crudParams.actionParams = AuditCreateActionParams
            crudParams.docIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams?.length || 0
            // const crud = newSaveRecord(crudParams, CrudParamOptions);
            const res = await GroupModel.save(crudParams, crudParamOptions)
            // console.log("create-result: ", res, res.code, res.value.docIds, res.value.recordCount)
            const resValue = res.value as unknown as CrudResultType<AuditType>
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update two existing records and return success:",
        testFunc: async () => {
            crudParams.coll = updateColl
            crudParams.actionParams = AuditUpdateActionParams
            crudParams.docIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams?.length || 0
            const crud = newSaveRecord(crudParams, crudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as unknown as CrudResultType<AuditType>;
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update a record by Id and return success:",
        testFunc: async () => {
            crudParams.coll = updateColl
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.docIds = [UpdateAuditById]
            crudParams.queryParams = {}
            const recLen = crudParams.docIds.length;
            const crud = newSaveRecord(crudParams, crudParamOptions);
            const res = await crud.saveRecord();
            const resValue = res.value as unknown as CrudResultType<AuditType>;
            const idLen = resValue.recordIds?.length || 0;
            const recCount = resValue.recordsCount || 0;
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update records by Ids and return success:",
        testFunc: async () => {
            crudParams.coll = updateColl
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.docIds = UpdateAuditByIds
            crudParams.queryParams = {}
            const recLen = crudParams.docIds.length
            const crud = newSaveRecord(crudParams, crudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as unknown as CrudResultType<AuditType>
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update records by query-params and return success:",
        testFunc: async () => {
            crudParams.coll = updateColl
            crudParams.actionParams = [AuditUpdateRecordByParam]
            crudParams.docIds = []
            crudParams.queryParams = UpdateAuditByParams
            const recLen = 0
            const crud = newSaveRecord(crudParams, crudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as unknown as CrudResultType<AuditType>;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(recCount > recLen, true, `response-value-recordsCount should be >: ${recLen}`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
