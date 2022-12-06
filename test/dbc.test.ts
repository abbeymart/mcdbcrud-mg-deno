import { assertEquals, mcTest, postTestResult } from "../test_deps.ts";
import { appDb, dbOptions } from "./config/secure/config.ts";
import { newDbMongo } from "../src/index.ts";

(async () => {
    await mcTest({
        name    : "should successfully connect to the MongoDB - Client",
        testFunc: async () => {
            let pResult = false
            const dbInstance = newDbMongo(appDb, dbOptions);
            console.log("db-URI: ", dbInstance.dbUri)
            console.log("server-URI: ", dbInstance.serverUri)
            try {
                const dbClient = await dbInstance.mgServer();
                const db = await dbClient.database(appDb.database);
                if (db.name === appDb.database) {
                    pResult = true;
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e);
                pResult = false;
            } finally {
                await dbInstance.closeDb();
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await mcTest({
        name    : "should successfully connect to the MongoDB - Handle",
        testFunc: async () => {
            let pResult = false;
            const dbInstance = newDbMongo(appDb, dbOptions);
            try {
                const dbHandle = await dbInstance.openDb();
                if (dbHandle.name === appDb.database) {
                    pResult = true;
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e);
                pResult = false;
            } finally {
                await dbInstance.closeDb();
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await mcTest({
        name    : "should successfully connect to the Audit MongoDB - Client",
        testFunc: async () => {
            let pResult = false;
            const dbInstance = newDbMongo(appDb, dbOptions);
            try {
                const dbClient = await dbInstance.mgServer();
                const dbHandle = await dbClient.database(appDb.database);
                if (dbHandle.name === appDb.database) {
                    pResult = true;
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e);
                pResult = false;
            } finally {
                await dbInstance.closeDb();
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await mcTest({
        name    : "should successfully connect to the Audit MongoDB - Handle",
        testFunc: async () => {
            let pResult = false;
            const dbInstance = newDbMongo(appDb, dbOptions);
            try {
                const dbHandle = await dbInstance.openDb();
                if (dbHandle.name === appDb.database) {
                    pResult = true;
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e);
                pResult = false;
            } finally {
                await dbInstance.closeDb()
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });


    postTestResult();

})();
