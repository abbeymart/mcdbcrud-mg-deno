// @Description: test-cases data: for get, delete and save record(s)

import {
    UserInfoType, CrudOptionsType, ActionParamType,
    TaskTypes, QueryParamsType, AuditType, ObjectType, LogDocumentsType,
} from "../../src/index.ts"
import { collections } from "../collections.ts";

export const auditColl = "audits"
export const getColl = "audits"
export const deleteColl = "audits_delete"
export const deleteAllColl = "audits_delete_all"
export const updateColl = "audits_update"

export const groupTable = collections.GROUPS
export const categoryTable = collections.CATEGORIES

export const UserId = "c85509ac-7373-464d-b667-425bb59b5738" // TODO: review/update

export const testUserInfo: UserInfoType = {
    userId   : "c85509ac-7373-464d-b667-425bb59b5738",
    loginName: "abbeymart",
    email    : "abbeya1@yahoo.com",
    language : "en-US",
    firstname: "Abi",
    lastname : "Akindele",
    token    : "",
    expire   : 0,
}

export const crudParamOptions: CrudOptionsType = {
    checkAccess  : false,
    auditColl    : "audits",
    userColl     : "users",
    serviceColl  : "services",
    accessColl   : "accesses",
    verifyColl   : "verify_users",
    roleColl     : "roles",
    logCrud      : true,
    logCreate    : true,
    logUpdate    : true,
    logDelete    : true,
    logRead      : true,
    logLogin     : false,
    logLogout    : false,
    maxQueryLimit: 10000,
    msgFrom      : "support@mconnect.biz",
    cacheResult  : false,
}

// TODO: create/update, get & delete records for groups & categories tables

export const LogRecords: ObjectType = {
    "name"    : "Abi",
    "desc"    : "Testing only",
    "url"     : "localhost:9000",
    "priority": 100,
    "cost"    : 1000.00,
}

export const NewLogRecords: ObjectType = {
    "name"    : "Abi Akindele",
    "desc"    : "Testing only - updated",
    "url"     : "localhost:9900",
    "priority": 1,
    "cost"    : 2000.00,
}

export const LogRecords2: ObjectType = {
    "name"    : "Ola",
    "desc"    : "Testing only - 2",
    "url"     : "localhost:9000",
    "priority": 1,
    "cost"    : 10000.00,
}

export const NewLogRecords2: ObjectType = {
    "name"    : "Ola",
    "desc"    : "Testing only - 2 - updated",
    "url"     : "localhost:9000",
    "priority": 1,
    "cost"    : 20000.00,
}

// create record(s)

export const AuditCreateRec1: ObjectType = {
    "collName"  : "audits",
    "logAt"     : new Date(),
    "logBy"     : UserId,
    "logRecords": LogRecords,
    "logType"   : TaskTypes.CREATE,
}

export const AuditCreateRec2: ObjectType = {
    "collName"  : "audits",
    "logAt"     : new Date(),
    "logBy"     : UserId,
    "logRecords": LogRecords2,
    "logType"   : TaskTypes.CREATE,
}

export const AuditUpdateRec1: AuditType = {
    _id             : "638fd835c77947991e7f7e14",
    collName        : "todos",
    logAt           : new Date(),
    logBy           : UserId,
    collDocuments   : LogRecords as unknown as LogDocumentsType,
    newCollDocuments: NewLogRecords as unknown as LogDocumentsType,
    logType         : TaskTypes.UPDATE,
}

export const AuditUpdateRec2: AuditType = {
    _id             : "638fd835c77947991e7f7e15",
    collName        : "todos",
    logAt           : new Date(),
    logBy           : UserId,
    collDocuments   : LogRecords2 as unknown as LogDocumentsType,
    newCollDocuments: NewLogRecords2 as unknown as LogDocumentsType,
    logType         : TaskTypes.UPDATE,
}

export const AuditCreateActionParams: Array<AuditType> = [
    AuditCreateRec1,
    AuditCreateRec2,
]

export const AuditUpdateActionParams: Array<AuditType> = [
    AuditUpdateRec1,
    AuditUpdateRec2,
]

// TODO: update and delete params, by ids / queryParams

export const AuditUpdateRecordById: ObjectType = {
    "id"           : "638fd873a02862d754fa0247",
    "collName"     : "groups",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "logRecords"   : LogRecords,
    "newLogRecords": NewLogRecords,
    "logType"      : TaskTypes.DELETE,
}

export const AuditUpdateRecordByParam: ActionParamType = {
    "id"           : "638fd873a02862d754fa0248",
    "collName"     : "contacts",
    "logAt"        : new Date(),
    "logBy"        : UserId,
    "logRecords"   : LogRecords,
    "newLogRecords": NewLogRecords,
    "logType"      : TaskTypes.UPDATE,
}

// GetIds: for get-records by ids & params | TODO: update ids after create

export const GetAuditById = "638fd565c97d023503c6a0d8"
export const GetAuditByIds = ["638fd565c97d023503c6a0d8",
    "638fd565c97d023503c6a0d9"] as Array<string>
export const GetAuditByParams: QueryParamsType = {
    "logType": "create",
}

export const DeleteAuditById = "638fd62cd7d613895979da27"
export const DeleteAuditByIds: Array<string> = [
    "638fd62cd7d613895979da28",
    "638fd62cd7d613895979da29",
    "638fd62cd7d613895979da2a",
    "638fd62cd7d613895979da2b",
]

export const DeleteAuditByParams: QueryParamsType = {
    "logType": "read",
}

export const UpdateAuditById = "638fd835c77947991e7f7e11"
export const UpdateAuditByIds: Array<string> = [
    "638fd835c77947991e7f7e11",
    "638fd835c77947991e7f7e12",
    "638fd835c77947991e7f7e13",
]

export const UpdateAuditByParams: QueryParamsType = {
    "logType": "read",
}
