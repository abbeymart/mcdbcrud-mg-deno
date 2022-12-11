import { assertEquals, mcTest, postTestResult, } from "../../test_deps.ts";
import { CrudParamsType, newDbMongo, AuditType } from "../../src/index.ts";
import {
    DeleteCategoryById, categoryColl, categoryCollDelete, CategoryModel
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

    const crudParams: CrudParamsType<AuditType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : categoryColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should delete record by Id and return success or notFound[delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = categoryCollDelete
            crudParams.docIds = [DeleteCategoryById]
            crudParams.queryParams = {}
            const res = await CategoryModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });


    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
