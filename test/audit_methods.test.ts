import { assertEquals, mcTest, postTestResult } from "../test_deps.ts";
import { auditDb, dbOptions } from "./config/secure/config.ts";
import { AuditLogOptionsType, newAuditLog, newDbMongo } from "../src/index.ts";

const collName = "services"
const userId = "085f48c5-8763-4e22-a1c6-ac1a68ba07de"
const recs = {name: "Abi", desc: "Testing only", url: "localhost:9000", priority: 1, cost: 1000.00}
const newRecs = {
    name: "Abi Akindele", desc: "Testing only - updated", url: "localhost:9900", priority: 1, cost: 2000.00
}
const readP = {keywords: ["lagos", "nigeria", "ghana", "accra"]};


(async () => {
    const dbInstance = newDbMongo(auditDb, dbOptions);
    // expected db-connection result
    const mcLogResult = {auditDb: dbInstance, auditColl: "audits"};
    const dbHandle = await dbInstance.openDb();
    // audit-log instance
    const mcLog = newAuditLog(dbHandle, {auditColl: "audits"});
    
    await mcTest({
        name    : "should connect to the DB and return an instance object",
        testFunc: () => {
            assertEquals(mcLog.getAuditColl(), mcLogResult.auditColl, `audit-table should be: ${mcLogResult.auditColl}`);
        }
    });

    await mcTest({
        name    : "should store create-transaction log and return success:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collName     : collName,
                collDocuments: {logDocuments: recs,},
            };
            const res = await mcLog.createLog(userId, logParams);
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : "should store update-transaction log and return success:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collName        : collName,
                collDocuments   : {logDocuments: recs,},
                newCollDocuments: {logDocuments: newRecs},
            };
            const res = await mcLog.updateLog(userId, logParams);
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : "should store read-transaction log and return success:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collName     : collName,
                collDocuments: {logDocuments: readP,},
            };
            const res = await mcLog.readLog(logParams, userId);
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : "should store delete-transaction log and return success:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collName     : collName,
                collDocuments: {logDocuments: recs,},
            };
            const res = await mcLog.deleteLog(userId, logParams);
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : "should store login-transaction log and return success:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collDocuments   : {logDocuments: recs,},
            };
            const res = await mcLog.loginLog(logParams, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : "should store logout-transaction log and return success:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collDocuments   : {logDocuments: recs,},
            };
            const res = await mcLog.logoutLog(userId, logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : "should return paramsError for incomplete/undefined inputs:",
        testFunc: async () => {
            const logParams: AuditLogOptionsType = {
                collName        : collName,
                collDocuments   : {logDocuments: recs,},
            };
            const res = await mcLog.createLog("", logParams)
            assertEquals(res.code, "paramsError", `res.Code should be: paramsError`);
            assertEquals(res.message.includes("Table or Collection name is required"), true, `res-message should include: Table or Collection name is required`);
        }
    });

    postTestResult();
    await dbInstance.closeDb();
})();
