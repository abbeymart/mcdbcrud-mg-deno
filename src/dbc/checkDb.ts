/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-08-07
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: check-db connection / handle
 */

import { Database, MongoClient, getResMessage, ResponseMessage } from "../../deps.ts";

export function checkDb(dbHandle: Database): ResponseMessage {
    if (dbHandle && dbHandle.name !== "") {
        return getResMessage("success", {
            message: "valid database handle",
        });
    } else {
        return getResMessage("validateError", {
            message: "valid database handle is required",
        });
    }
}

export function checkDbClient(dbc: MongoClient): ResponseMessage {
    if (dbc) {
        return getResMessage("success", {
            message: "valid database-server client connection",
        });
    } else {
        return getResMessage("validateError", {
            message: "valid database-server client connection is required",
        });
    }
}
