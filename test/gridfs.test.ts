import { AuditType, CrudParamsType, newDbMongo } from "../src/index.ts";
import { GridFSBucket, } from "https://deno.land/x/mongo@v0.31.1/src/gridfs/bucket.ts";
import { appDb, auditDb, dbOptions } from "./config/secure/config.ts";
import { auditColl, crudParamOptions, getColl, testUserInfo } from "./testData.ts";
import { ObjectId } from "../deps.ts";


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

    // Upload
    const bucket = new GridFSBucket(appDbHandle);
    const upstream = await bucket.openUploadStream("test.txt");

    const writer = upstream.getWriter();
    const fileContents = await Deno.readFile("test.txt");
    await writer.write(fileContents);

    await writer.close();

    // Download
    const fileId = new ObjectId("abokosdnsudslfhswkfj");
    const file = await new Response(await bucket.openDownloadStream(fileId)).text();

    console.log("file: ", file);

})();