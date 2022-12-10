import { assertEquals, mcTest, postTestResult } from "../../test_deps.ts";
import {
    CrudParamsType, CrudResultType,
    newDbMongo, newSaveRecord
} from "../../src/index.ts";
import {
    groupColl, groupCollUpdate, GroupModel,
    GroupUpdateActionParams, GroupUpdateRecordById,
    GroupUpdateRecordByParam, GroupType,
    UpdateGroupById, UpdateGroupByIds, UpdateGroupByParams,
} from "./testData.ts";
import { appDb, auditDb, dbOptions } from "../config/secure/config.ts";
import { auditColl, crudParamOptions, testUserInfo } from "../testData.ts";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);
    const auditDbInstance = newDbMongo(auditDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType<GroupType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : groupColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should update two existing documents and return success:",
        testFunc: async () => {
            crudParams.coll = groupCollUpdate;
            crudParams.actionParams = GroupUpdateActionParams;
            crudParams.docIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams?.length || 0
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType<GroupType>;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update a record by Id and return success:",
        testFunc: async () => {
            crudParams.coll = groupCollUpdate
            crudParams.actionParams = [GroupUpdateRecordById]
            crudParams.docIds = [UpdateGroupById]
            crudParams.queryParams = {}
            const recLen = crudParams.docIds.length;
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType<GroupType>;
            const recCount = resValue.recordsCount || 0;
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update records by Ids and return success:",
        testFunc: async () => {
            crudParams.coll = groupCollUpdate
            crudParams.actionParams = [GroupUpdateRecordById]
            crudParams.docIds = UpdateGroupByIds
            crudParams.queryParams = {}
            const recLen = crudParams.docIds.length
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType<GroupType>
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update records by query-params and return success:",
        testFunc: async () => {
            crudParams.coll = groupCollUpdate;
            crudParams.actionParams = [GroupUpdateRecordByParam]
            crudParams.docIds = []
            crudParams.queryParams = UpdateGroupByParams;
            const recLen = 0
            const crud = newSaveRecord(crudParams, crudParamOptions);
            const res = await crud.saveRecord();
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType<GroupType>;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(recCount > recLen, true, `response-value-recordsCount should be >: ${recLen}`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
