import { assertEquals, mcTest, postTestResult, } from "../test_deps.ts";
import { CrudParamsType, newDbMongo, newDeleteRecord, AuditType } from "../src/index.ts";
import {
    auditColl, crudParamOptions, deleteAllColl, DeleteAuditById, DeleteAuditByIds,
    DeleteAuditByParams, deleteColl, getColl, testUserInfo
} from "./testData.ts";
import { appDb, auditDb, dbOptions } from "./config/secure/config.ts";

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
        name    : "should prevent the delete of all table records and return removeError:",
        testFunc: async () => {
            crudParams.coll = deleteAllColl
            crudParams.docIds = []
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, crudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-all-res: ", res)
            // message include "Delete task permitted by ID and queryParams only"
            assertEquals(res.code, "removeError", `delete-task permitted by ids or queryParams only: removeError code expected`);
        }
    });

    await mcTest({
        name    : "should delete record by Id and return success [delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = deleteColl
            crudParams.docIds = [DeleteAuditById]
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, crudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-id-res: ", res)
            const resCode = res.code === "success"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : "should delete record by Ids and return success [delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = deleteColl
            crudParams.docIds = DeleteAuditByIds
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, crudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-ids-res: ", res)
            const resCode = res.code === "success"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : "should delete records by query-params and return success[delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = deleteColl
            crudParams.docIds = []
            crudParams.queryParams = DeleteAuditByParams
            const crud = newDeleteRecord(crudParams, crudParamOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-params-res: ", res)
            const resCode = res.code === "success"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
