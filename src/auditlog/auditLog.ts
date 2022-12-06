/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-15
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mcdbcrud-mg audit-log (mongodb) entry point | auditLog
 */

// Import required module/function
import { Database, getResMessage, ResponseMessage } from "../../deps.ts";
import { checkDb } from "../dbc/index.ts";
import { AuditLogTypes, AuditLogOptionsType, AuditType, } from "../crud/index.ts";
import { isEmptyObject } from "../orm/index.ts";

//types

class AuditLog {
    private readonly dbHandle: Database;
    private readonly auditColl: string;

    constructor(auditDb: Database, options?: AuditLogOptionsType) {
        this.dbHandle = auditDb;
        this.auditColl = options && options.auditColl ? options.auditColl : "audits";
    }

    getAuditColl() {
        return this.auditColl
    }

    async createLog(userId: string, logParams: AuditLogOptionsType,): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!logParams.collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!userId) {
            errorMessage = errorMessage ? errorMessage + " | userId is required." :
                "userId is required.";
        }
        if (!logParams.collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Created record(s) information is required." :
                "Created record(s) information is required.";
        }
        if (errorMessage) {
            console.log("error-message: ", errorMessage);
            return getResMessage("logError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                collName     : logParams.collName || "",
                collDocuments: logParams.collDocuments || {},
                logType      : "create",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError", {
                    value  : result || "no-result",
                    message: "no response from the server",
                });
            }
        } catch (error) {
            console.log("Error saving create-audit record(s): ", error);
            return getResMessage("logError", {
                value  : error.message,
                message: "Error saving create-audit record(s): " + error.message,
            });
        }
    }

    async updateLog(userId: string, logParams: AuditLogOptionsType,): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!logParams.collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!userId) {
            errorMessage = errorMessage ? errorMessage + " | userId is required." :
                "userId is required.";
        }
        if (!logParams.collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Current record(s) information is required." :
                "Current record(s) information is required.";
        }
        if (!logParams.newCollDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Updated record(s) information is required." :
                "Updated record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("insertError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                collName        : logParams.collName || "",
                collDocuments   : logParams.collDocuments || {},
                newCollDocuments: logParams.newCollDocuments,
                logType         : "update",
                logBy           : userId,
                logAt           : new Date(),
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.error("Error saving update-audit record(s): ", error);
            return getResMessage("insertError", {
                message: "Error saving update-audit record(s): " + error.message,
            });
        }
    }

    async readLog(logParams: AuditLogOptionsType, userId = "",): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // validate params/values
        let errorMessage = "";
        if (!logParams.collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!logParams.collDocuments) {
            errorMessage = errorMessage ?
                errorMessage + " | Search keywords or Read record(s) information is required." :
                "Search keywords or Read record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("insertError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                collName     : logParams.collName || "",
                collDocuments: logParams.collDocuments || {},
                logType      : "read",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.error("Error inserting read/search-audit record(s): ", error);
            return getResMessage("insertError", {
                message: "Error inserting read/search-audit record(s):" + error.message,
            });
        }
    }

    async deleteLog(userId: string, logParams: AuditLogOptionsType,): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let errorMessage = "";
        if (!logParams.collName) {
            errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                "Table or Collection name is required.";
        }
        if (!userId) {
            errorMessage = errorMessage ? errorMessage + " | userId is required." :
                "userId is required.";
        }
        if (!logParams.collDocuments) {
            errorMessage = errorMessage ? errorMessage + " | Deleted record(s) information is required." :
                "Deleted record(s) information is required.";
        }
        if (errorMessage) {
            return getResMessage("insertError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                collName     : logParams.collName || "",
                collDocuments: logParams.collDocuments || {},
                logType      : "remove",
                logBy        : userId,
                logAt        : new Date(),
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error saving delete-audit record(s): ", error);
            return getResMessage("insertError", {
                message: "Error inserting delete-audit record(s):" + error.message,
            });
        }
    }

    async loginLog(logParams: AuditLogOptionsType, userId = "", collName = "users",): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }
        // validate params/values
        let errorMessage = "";
        if (!logParams.collDocuments) {
            errorMessage = errorMessage + " | Login information is required."
        }
        if (errorMessage) {
            return getResMessage("insertError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                collDocuments: logParams.collDocuments || {},
                logType      : "login",
                logBy        : userId,
                logAt        : new Date(),
                collName,
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error inserting login-audit record(s): ", error);
            return getResMessage("insertError", {
                message: "Error inserting login-audit record(s):" + error.message,
            });
        }
    }

    async logoutLog(userId: string, logParams: AuditLogOptionsType, collName = "users",): Promise<ResponseMessage> {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // validate params/values
        let errorMessage = "";
        if (!userId) {
            errorMessage = errorMessage + " | userId is required."
        }
        if (!logParams.collDocuments || isEmptyObject(logParams.collDocuments)) {
            errorMessage = errorMessage + " | Logout information is required."
        }
        if (errorMessage) {
            return getResMessage("insertError", {
                message: errorMessage,
            });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                collDocuments: logParams.collDocuments || {},
                logType      : "logout",
                logBy        : userId,
                logAt        : new Date(),
                collName,
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error inserting logout-audit record(s): ", error);
            return getResMessage("insertError", {
                value: error,
            });
        }
    }

    async auditLog(logType: string, logParams: AuditLogOptionsType, userId = "") {
        const dbCheck = checkDb(this.dbHandle);
        if (!dbCheck) {
            return dbCheck;
        }

        // Check/validate the attributes / parameters
        let collName = "",
            collDocuments = null,
            newCollDocuments = null,
            errorMessage = "",
            actionParams: AuditType = {};

        logType = logType.toLowerCase();

        switch (logType) {
            case "create":
            case AuditLogTypes.CREATE:
                collName = logParams.collName ? logParams.collName : "";
                collDocuments = logParams.collDocuments ? logParams.collDocuments : null;
                // validate params/values
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!userId) {
                    errorMessage = errorMessage ? errorMessage + " | userId is required." :
                        "userId is required.";
                }
                if (!collDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Created record(s) information is required." :
                        "Created record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("insertError", {
                        message: errorMessage,
                    });
                }
                actionParams = {
                    collName     : collName,
                    collDocuments: collDocuments || {},
                    logType      : logType,
                    logBy        : userId,
                };
                break;
            case "update":
            case AuditLogTypes.UPDATE:
                collName = logParams.collName ? logParams.collName : "";
                collDocuments = logParams.collDocuments ? logParams.collDocuments : null;
                newCollDocuments = logParams.newCollDocuments ? logParams.newCollDocuments : null; // object or array

                // validate params/values
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!userId) {
                    errorMessage = errorMessage ? errorMessage + " | userId is required." :
                        "userId is required.";
                }
                if (!collDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Current record(s) information is required." :
                        "Current record(s) information is required.";
                }
                if (!newCollDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Updated record(s) information is required." :
                        "Updated record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("insertError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    collName        : collName,
                    collDocuments   : collDocuments || {},
                    newCollDocuments: newCollDocuments || {},
                    logType         : logType,
                    logBy           : userId,
                };
                break;
            case "remove":
            case "delete":
            case AuditLogTypes.DELETE:
            case AuditLogTypes.REMOVE:
                collName = logParams.collName ? logParams.collName : "";
                collDocuments = logParams.collDocuments ? logParams.collDocuments : null;

                // Check/validate the attributes / parameters
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!userId) {
                    errorMessage = errorMessage ? errorMessage + " | userId is required." :
                        "userId is required.";
                }
                if (!collDocuments) {
                    errorMessage = errorMessage ? errorMessage + " | Deleted record(s) information is required." :
                        "Deleted record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("insertError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    collName     : collName,
                    collDocuments: collDocuments || {},
                    logType      : logType,
                    logBy        : userId,
                };
                break;
            case "read":
            case AuditLogTypes.GET:
            case AuditLogTypes.READ:
                collName = logParams.collName ? logParams.collName : "";
                collDocuments = logParams.collDocuments ? logParams.collDocuments : null;

                // validate params/values
                if (!collName) {
                    errorMessage = errorMessage ? errorMessage + " | Table or Collection name is required." :
                        "Table or Collection name is required.";
                }
                if (!collDocuments) {
                    errorMessage = errorMessage ?
                        errorMessage + " | Search keywords or Read record(s) information is required." :
                        "Search keywords or Read record(s) information is required.";
                }
                if (errorMessage) {
                    return getResMessage("insertError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    collName     : collName,
                    collDocuments: collDocuments || {},
                    logType      : logType,
                    logBy        : userId,
                };
                break;
            case "login":
            case AuditLogTypes.LOGIN:
                collName = logParams.collName ? logParams.collName : "";
                collDocuments = logParams.collDocuments ? logParams.collDocuments : null;
                // validate params/values
                if (!logParams.collDocuments) {
                    errorMessage = errorMessage + " | Login information is required."
                }
                if (errorMessage) {
                    return getResMessage("insertError", {
                        message: errorMessage,
                    });
                }

                actionParams = {
                    collDocuments: collDocuments || {},
                    logType      : logType,
                    logBy        : userId,
                };
                if (collName) {
                    actionParams.collName = collName;
                }
                break;
            case "logout":
            case AuditLogTypes.LOGOUT:
                collName = logParams.collName ? logParams.collName : "";
                collDocuments = logParams.collDocuments ? logParams.collDocuments : null;
                // validate params/values
                if (!userId) {
                    errorMessage = errorMessage + " | userId is required."
                }
                if (!collDocuments || collDocuments === "") {
                    errorMessage = errorMessage + " | Logout information is required."
                }
                if (errorMessage) {
                    return getResMessage("insertError", {
                        message: errorMessage,
                    });
                }
                actionParams = {
                    collDocuments: collDocuments || {},
                    logType      : logType,
                    logBy        : userId,
                };

                break;
            default:
                return getResMessage("insertError", {
                    message: "Unknown log type and/or incomplete log information",
                });
        }

        try {
            // insert audit record
            const coll = this.dbHandle.collection<AuditType>(this.auditColl);
            const result = await coll.insertOne({
                ...actionParams,
                ...{logAt: new Date()},
            });

            if (result) {
                return getResMessage("success", {
                    value: result as string,
                });
            } else {
                return getResMessage("insertError");
            }
        } catch (error) {
            console.log("Error saving audit-log record(s): ", error);
            return getResMessage("insertError", {
                message: "Error inserting audit-log record(s):" + error.message,
            });
        }
    }
}

function newAuditLog(auditDb: Database, options?: AuditLogOptionsType) {
    return new AuditLog(auditDb, options);
}

export { AuditLog, newAuditLog };
