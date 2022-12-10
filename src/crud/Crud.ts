/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-02-21 | @Updated: 2020-05-28, 2022-12-05(Deno)
 * @Company: mConnect.biz | @License: MIT
 * @Description: mcdbcrud-mg base class, for all CRUD operations
 */

// Import required module/function(s)/types
import { Database, Document, Filter, getResMessage, MongoClient, ObjectId, ResponseMessage } from "../../deps.ts";
import {
    ActionExistParamsType, ActionParamsType, ActionParamType, BaseModelType, CheckAccessType, CrudOptionsType,
    CrudParamsType,
    ExistParamItemType,
    ExistParamsType,
    FieldValueTypes, ObjectType, OkResponse, ProjectParamsType, QueryParamsType, RoleFuncType, RoleServiceResponseType,
    SortParamsType, SubItemsType, TaskTypes, UserInfoType, ValueType,
} from "./types.ts";
import { AuditLog, newAuditLog } from "../auditlog/index.ts";
import {
    DataTypes, DefaultValueType, DocDescType, FieldDescType, isEmptyObject, ModelRelationType
} from "../orm/index.ts";

export class Crud<T extends BaseModelType> {
    protected params: CrudParamsType<T>;
    protected readonly appDb: Database;
    protected readonly coll: string;
    protected readonly dbClient: MongoClient;
    protected readonly dbName: string;
    protected readonly docDesc: DocDescType;
    protected token: string;
    protected readonly userInfo: UserInfoType;
    protected docIds: Array<string>;       // to capture string-id | ObjectId
    protected actionParams: Array<T>;
    protected queryParams: QueryParamsType;
    protected existParams: ActionExistParamsType;
    protected readonly projectParams: ProjectParamsType;
    protected readonly sortParams: SortParamsType;
    protected taskType: TaskTypes | string;
    protected skip: number;
    protected limit: number;
    protected readonly recursiveDelete: boolean;
    protected readonly accessDb: Database;
    protected readonly auditDb: Database;
    protected readonly serviceDb: Database;
    protected readonly accessDbClient: MongoClient;
    protected readonly auditDbClient: MongoClient;
    protected readonly serviceDbClient: MongoClient;
    protected readonly accessDbName: string;
    protected readonly auditDbName: string;
    protected readonly serviceDbName: string;
    protected readonly auditColl: string;
    protected readonly serviceColl: string;
    protected readonly userColl: string;
    protected readonly roleColl: string;
    protected readonly accessColl: string;
    protected maxQueryLimit: number;
    protected readonly logCrud: boolean;
    protected readonly logCreate: boolean;
    protected readonly logUpdate: boolean;
    protected readonly logRead: boolean;
    protected readonly logDelete: boolean;
    protected readonly logLogin: boolean;
    protected readonly logLogout: boolean;
    protected transLog: AuditLog;
    protected cacheKey: string;
    protected readonly checkAccess: boolean;
    protected userId: string;
    protected isAdmin: boolean;
    protected isActive: boolean;
    protected nullValues: ActionParamType;
    protected defaultValues: ActionParamType;
    protected createItems: Array<T>;
    protected updateItems: Array<T>;
    protected currentRecs: Array<T>;
    protected roleServices: Array<RoleServiceResponseType>;
    protected isRecExist: boolean;
    protected actionAuthorized: boolean;
    protected usernameExistsMessage: string;
    protected emailExistsMessage: string;
    protected recExistMessage: string;
    protected unAuthorizedMessage: string;
    protected subItems: Array<SubItemsType>;
    protected cacheExpire: number;
    protected readonly parentColls: Array<string>;
    protected readonly childColls: Array<string>;
    protected readonly parentRelations: Array<ModelRelationType>;
    protected readonly childRelations: Array<ModelRelationType>;
    protected readonly uniqueFields: Array<Array<string>>;
    protected readonly fieldSeparator: string;
    protected readonly queryFieldType: string;
    protected readonly appDbs: Array<string>;
    protected readonly appTables: Array<string>;
    protected readonly cacheResult: boolean;
    protected getAllResults?: boolean;

    constructor(params: CrudParamsType<T>, options?: CrudOptionsType) {
        // crudParams
        this.params = params;
        this.appDb = params.appDb;
        this.coll = params.coll;
        this.dbClient = params.dbClient;
        this.dbName = params.dbName;
        this.docDesc = params.docDesc || {};
        this.nullValues = params.nullValues || {};
        this.defaultValues = params.defaultValues || {};
        this.actionParams = params && params.actionParams ? params.actionParams : [];
        this.queryParams = params && params.queryParams ? params.queryParams : {};
        this.existParams = params && params.existParams ? params.existParams : [];
        this.projectParams = params && params.projectParams ? params.projectParams : {};
        this.sortParams = params && params.sortParams ? params.sortParams : {};
        this.taskType = params && params.taskType ? params.taskType : "";
        this.docIds = params && params.docIds ? params.docIds : [];
        this.userInfo = params && params.userInfo ? params.userInfo :
            {
                token    : "",
                userId   : "",
                firstname: "",
                lastname : "",
                language : "",
                loginName: "",
                expire   : 0,
            };
        this.token = params && params.token ? params.token : this.userInfo.token || "";
        this.userId = this.userInfo.userId || "";
        // options
        this.skip = params.skip ? params.skip : options && options.skip ? options.skip : 0;
        this.limit = params.limit ? params.limit : options && options.limit ? options.limit : 10000;
        this.parentColls = options && options.parentColls ? options.parentColls : [];
        this.childColls = options && options.childColls ? options.childColls : [];
        this.parentRelations = options && options.parentRelations ? options.parentRelations : [];
        this.childRelations = options && options.childRelations ? options.childRelations : [];
        this.uniqueFields = options && options.uniqueFields ? options.uniqueFields : [];
        this.recursiveDelete = options && options.recursiveDelete !== undefined ? options.recursiveDelete : false;
        this.checkAccess = options && options.checkAccess !== undefined ? options.checkAccess : false;
        this.auditColl = options && options.auditColl ? options.auditColl : "audits";
        this.serviceColl = options && options.serviceColl ? options.serviceColl : "services";
        this.accessColl = options && options.accessColl ? options.accessColl : "accesses";
        this.userColl = options && options.userColl ? options.userColl : "users";
        this.roleColl = options && options.roleColl ? options.roleColl : "roles";
        this.accessDb = options && options.accessDb ? options.accessDb : this.appDb;
        this.auditDb = options && options.auditDb ? options.auditDb : this.appDb;
        this.serviceDb = options && options.serviceDb ? options.serviceDb : this.appDb;
        this.accessDbClient = options && options.accessDbClient ? options.accessDbClient : this.dbClient;
        this.auditDbClient = options && options.auditDbClient ? options.auditDbClient : this.dbClient;
        this.serviceDbClient = options && options.serviceDbClient ? options.serviceDbClient : this.dbClient;
        this.accessDbName = options && options.accessDbName ? options.accessDbName : this.dbName;
        this.auditDbName = options && options.auditDbName ? options.auditDbName : this.dbName;
        this.serviceDbName = options && options.serviceDbName ? options.serviceDbName : this.dbName;
        this.maxQueryLimit = options && options.maxQueryLimit ? options.maxQueryLimit : 10000;
        this.logCrud = options && options.logCrud !== undefined ? options.logCrud : false;
        this.logCreate = options && options.logCreate !== undefined ? options.logCreate : false;
        this.logUpdate = options && options.logUpdate !== undefined ? options.logUpdate : false;
        this.logRead = options && options.logRead !== undefined ? options.logRead : false;
        this.logDelete = options && options.logDelete !== undefined ? options.logDelete : false;
        this.logLogin = options && options.logLogin !== undefined ? options.logLogin : false;
        this.logLogout = options && options.logLogout !== undefined ? options.logLogout : false;
        this.cacheExpire = options && options.cacheExpire ? options.cacheExpire : 300;
        // unique cache-key
        this.cacheKey = JSON.stringify({
            dbName       : this.dbName,
            coll         : this.coll,
            queryParams  : this.queryParams,
            projectParams: this.projectParams,
            sortParams   : this.sortParams,
            docIds       : this.docIds,
            skip         : this.skip,
            limit        : this.limit,
        });
        // auditLog constructor / instance
        this.transLog = newAuditLog(this.auditDb, {
            auditColl: this.auditColl,
        });
        // standard defaults
        this.isAdmin = false;
        this.isActive = true;
        this.createItems = [];
        this.updateItems = [];
        this.currentRecs = [];
        this.roleServices = [];
        this.subItems = [];
        this.isRecExist = false;
        this.actionAuthorized = false;
        this.recExistMessage = "Save / update error or duplicate documents exist. ";
        this.unAuthorizedMessage = "Action / task not authorised or permitted. ";
        this.usernameExistsMessage = options?.usernameExistsMessage ? options.usernameExistsMessage :
            "Username already exists. ";
        this.emailExistsMessage = options?.emailExistsMessage ? options.emailExistsMessage : "Email already exists. ";

        this.fieldSeparator = options?.fieldSeparator ? options.fieldSeparator : "_";
        this.queryFieldType = options?.queryFieldType ? options.queryFieldType : "underscore";
        this.appDbs = options?.appDbs ? options.appDbs :
            ["database", "database-mcpa", "database-mcpay", "database-mcship", "database-mctrade",
                "database-mcproperty", "database-mcinfo", "database-mcbc", "database-mcproject",];
        this.appTables = options?.appTables ? options.appTables :
            ["table", "table-mcpa", "table-mcpay", "table-mcship", "table-mctrade", "table-mcproperty",
                "table-mcinfo", "table-mcbc", "table-mcproject",];
        this.cacheResult = options?.cacheResult ? options.cacheResult : false;
        this.getAllResults = options?.getAllRecords || false;
    }

    // checkDb checks / validate appDb
    checkDb(dbHandle: Database): ResponseMessage {
        if (dbHandle && dbHandle.name !== "") {
            return getResMessage("success", {
                message: "valid database handler",
            });
        } else {
            return getResMessage("validateError", {
                message: "valid database handler is required",
            });
        }
    }

    // checkDbClient checks / validates mongo-client connection (for crud-transactional tasks)
    checkDbClient(dbc: MongoClient): ResponseMessage {
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

    // checkRecExist method checks if items/documents exist: document uniqueness
    async checkRecExist(actionParams: ActionParamsType<T>, currentRecs: Array<T> = []): Promise<ResponseMessage> {
        try {
            const existParams = this.computeExistParams(actionParams, currentRecs);
            console.log("existParams: ", existParams);
            // check if existParams condition is specified
            if (existParams.length < 1 || this.existParams.length < 1) {
                return getResMessage("success", {
                    message: "No data integrity condition specified",
                });
            }
            // check record existence/uniqueness for the documents/actionParams
            const appDbColl = this.appDb.collection(this.coll);
            let attributesMessage = "";
            for (const actionExistParams of this.existParams) {
                for (const existItem of actionExistParams) {
                    const recordExist = await appDbColl.findOne(existItem);
                    if (recordExist) {
                        this.isRecExist = true;
                        // capture attributes for any duplicate-document
                        Object.entries(existItem)
                            .forEach(([key, value]) => {
                                if (key !== "_id") {
                                    attributesMessage = attributesMessage ?
                                        `${attributesMessage} | ${key}: ${value}` :
                                        `${key}: ${value}`;
                                }
                            });
                        // if a duplicate-document was found, break the inner-for-loop
                        break;
                    } else {
                        this.isRecExist = false;
                    }
                }
                // if a duplicate-document was found, break the outer-for-loop
                if (this.isRecExist) {
                    break;
                }
            }
            if (this.isRecExist) {
                return getResMessage("recordExist", {
                    message: `Document unique attributes [${attributesMessage}] not met. Provide unique attributes to create or update document(s).`,
                });
            } else {
                return getResMessage("success", {
                    message: "No data integrity conflict",
                });
            }
        } catch (e) {
            console.error(e);
            return getResMessage("saveError", {
                message: "Unable to verify data integrity conflict",
            });
        }
    }

    // getCurrentRecords fetch documents by docIds, queryParams or all limited by this.limit and this.skip, if applicable
    async getCurrentRecords(by = ""): Promise<ResponseMessage> {
        try {
            // validate models
            const validDb = await this.checkDb(this.appDb);
            if (validDb.code !== "success") {
                return validDb;
            }
            let currentRecords: Array<Document>;
            const appDbColl = this.appDb.collection(this.coll);
            switch (by.toLowerCase()) {
                case "id": {
                    const docIds = this.docIds.map(id => new ObjectId(id));
                    const qParams: QueryParamsType = {_id: {$in: docIds}};
                    currentRecords = await appDbColl.find(qParams)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
                }
                case "queryparams":
                    currentRecords = await appDbColl.find(this.queryParams as Filter<ValueType>)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
                default:
                    currentRecords = await appDbColl.find({},)
                        .skip(this.skip)
                        .limit(this.limit)
                        .toArray();
                    break;
            }
            // if (by.toLowerCase() === "id") {
            //     if (currentRecords.length > 0 && currentRecords.length === this.docIds.length) {
            //         // update crud instance current-records value
            //         this.currentRecs = currentRecords;
            //         return getResMessage("success", {
            //             message: `${currentRecords.length} document/record(s) retrieved successfully.`,
            //             value  : currentRecords as unknown as Array<ObjectType>,
            //         });
            //     } else if (currentRecords.length > 0 && currentRecords.length < this.docIds.length) {
            //         return getResMessage("partialRecords", {
            //             message: `${currentRecords.length} out of ${this.docIds.length} document/record(s) found`,
            //             value  : currentRecords as unknown as Array<ObjectType>,
            //         });
            //     } else {
            //         return getResMessage("notFound", {
            //             message: "Document/record(s) not found.",
            //             value  : currentRecords as unknown as Array<ObjectType>,
            //         });
            //     }
            // }
            // response for by queryParams or all-documents
            if (currentRecords.length > 0) {
                // update crud instance current-records value
                this.currentRecs = currentRecords as Array<T>;
                return getResMessage("success", {
                    message: `${currentRecords.length} document/record(s) retrieved successfully.`,
                    value  : currentRecords as unknown as Array<ObjectType>,
                });
            } else {
                return getResMessage("notFound", {
                    message: "Document/record(s) not found.",
                    value  : currentRecords as unknown as Array<ObjectType>,
                });
            }
        } catch (e) {
            console.error(e);
            return getResMessage("notFound", {
                message: "Error retrieving current document/record(s)",
            });
        }
    }

    // computeExistParam compute the query-object(s) for checking create/update document uniqueness based on model-unique-fields constraints.
    computeExistParam(actionParam: T, currentRec= {}): ExistParamsType {
        // set the existParams for create or update action to determine document uniqueness
        const existParam: ExistParamsType = [];
        if (this.uniqueFields.length < 1) {
            return [];
        }
        for (const fields of this.uniqueFields) {
            // compute the uniqueness object
            const uniqueObj: ExistParamItemType = {};
            for (const field of fields) {
                // exclude primary/unique _id field/key
                if (field === "_id") {
                    continue;
                }
                // set unique item value for the new/updated actionParam/document
                const fieldValue = (actionParam as unknown as ObjectType)[field];
                if (field.toLowerCase().endsWith("id") && (fieldValue as string) !== "" &&
                    (fieldValue as string).length <= 24) {
                    uniqueObj[field] = new ObjectId(fieldValue as string);
                } else {
                    uniqueObj[field] = fieldValue;
                }
            }
            // add uniqueness object to the existParams, to exclude the existing document(update-task)
            if(currentRec && !isEmptyObject(currentRec as ObjectType)) {
                const rec = currentRec as ObjectType;
                const recId = (rec["_id"])?.toString() ||"";
                if (recId && recId !== "" && recId.length <= 24) {
                    existParam.push({
                        _id: {
                            $ne: new ObjectId(recId),
                        },
                        ...uniqueObj,
                    });
                }
            } else if (actionParam["_id"] && (actionParam["_id"]).toString() !== "" && (actionParam["_id"]).toString().length <= 24) {
                const recId = (actionParam["_id"]).toString();
                existParam.push({
                    _id: {
                        $ne: new ObjectId(recId),
                    },
                    ...uniqueObj,
                });
            } else {
                // add uniqueness object to the existParams, to exclude the existing document(create-task)
                existParam.push({
                    ...uniqueObj,
                });
            }
        }
        return existParam;
    }

    // computeExistParams compute the query-object(s) for checking create/update documents uniqueness based on model-unique-fields constraints.
    computeExistParams(actionParams: ActionParamsType<T>, currentRecs: Array<T> = []): ActionExistParamsType {
        // set the existParams for create or update action to determine documents uniqueness
        const existParams: ActionExistParamsType = [];
        if (this.uniqueFields.length < 1) {
            this.existParams = [];
            return [];
        }
        for (const actParam of actionParams) {
            const currentRec = currentRecs.find(rec => rec["_id"] === actParam["_id"]);
            const existParam = this.computeExistParam(actParam, currentRec);
            if (existParam.length > 0) {
                existParams.push(existParam);
            }
        }
        this.existParams = existParams;
        return existParams;
    }

    // set null value by DataTypes
    initializeValues(fieldTypeDesc: DataTypes): ValueType {
        switch (fieldTypeDesc) {
            case DataTypes.STRING:
            case DataTypes.POSTAL_CODE:
            case DataTypes.MONGODB_ID:
            case DataTypes.UUID:
            case DataTypes.EMAIL:
            case DataTypes.PORT:
            case DataTypes.URL:
            case DataTypes.JWT:
            case DataTypes.MAC_ADDRESS:
            case DataTypes.ISO2:
            case DataTypes.ISO3:
            case DataTypes.LAT_LONG:
            case DataTypes.MIME:
            case DataTypes.CREDIT_CARD:
            case DataTypes.CURRENCY:
            case DataTypes.IMEI:
                return "";
            case DataTypes.INTEGER:
            case DataTypes.POSITIVE:
            case DataTypes.BIGINT:
                return 0;
            case DataTypes.NUMBER:
            case DataTypes.DECIMAL:
            case DataTypes.FLOAT:
            case DataTypes.BIGFLOAT:
                return 0.00;
            case DataTypes.ARRAY:
            case DataTypes.ARRAY_NUMBER:
            case DataTypes.ARRAY_STRING:
            case DataTypes.ARRAY_OBJECT:
            case DataTypes.ARRAY_BOOLEAN:
            case DataTypes.ENUM:
                return [];
            case DataTypes.OBJECT:
            case DataTypes.JSON:
            case DataTypes.MAP:
                return {};
            case DataTypes.BOOLEAN:
                return false;
            case DataTypes.DATETIME:
            case DataTypes.TIMESTAMP:
            case DataTypes.TIMESTAMPZ:
                return new Date("01-01-1970");
            case DataTypes.IP:
                return "0.0.0.0";
            default:
                return null;
        }
    }

    // set default value based on FieldDescType
    async setDefault(defaultValue: FieldValueTypes | DefaultValueType, fieldValue: FieldValueTypes = null): Promise<ValueType> {
        try {
            switch (typeof defaultValue) {
                // defaultValue may be of types: DefaultValueType(function) or FieldValueTypes(others)
                case "function": {
                    const defValue = defaultValue as DefaultValueType;
                    return await defValue(fieldValue);
                }
                default:
                    return defaultValue || null;
            }
        } catch (_e) {
            return null
        }
    }

    // computeInitializeValues set the null values for document/actionParam, for allowNull(true)
    computeInitializeValues(docDesc: DocDescType): ActionParamType {
        const nullValues: ActionParamType = {}
        for (let [field, fieldDesc] of Object.entries(docDesc)) {
            switch (typeof fieldDesc) {
                case "string":
                    fieldDesc = fieldDesc as DataTypes
                    // allowNull = true
                    // set null value for DataTypes
                    nullValues[field] = this.initializeValues(fieldDesc);
                    break;
                case "object":
                    fieldDesc = fieldDesc as FieldDescType
                    // if !allowNull, skip setting null value
                    if (Object.keys(fieldDesc).includes("allowNull") && !fieldDesc.allowNull) {
                        continue;
                    }
                    // set null value for DataTypes
                    nullValues[field] = this.initializeValues(fieldDesc.fieldType);
                    break;
            }
        }
        return nullValues;
    }

    async computeDefaultValues(docDesc: DocDescType): Promise<ActionParamType> {
        const defaultValues: ActionParamType = {};
        for (let [field, fieldDesc] of Object.entries(docDesc)) {
            switch (typeof fieldDesc) {
                case "string":
                    fieldDesc = fieldDesc as DataTypes
                    // set default-value (null value) for DataTypes
                    defaultValues[field] = this.initializeValues(fieldDesc);
                    break;
                case "object":
                    fieldDesc = fieldDesc as FieldDescType
                    // if !defaultValue, skip setting default value
                    if (!fieldDesc.defaultValue) {
                        continue;
                    }
                    // set default value for FieldDescType
                    defaultValues[field] = await this.setDefault(fieldDesc.defaultValue);
                    break;
                default:
                    break;
            }
        }
        return defaultValues;
    }

    // OPTIONAL access methods - review / leverage mcaccess [go-pg]

    // getRoleServices method process and returns the permission to user / user-group/role for the specified service items
    async getRoleServices(roleIds: Array<string>, serviceIds: Array<string>): Promise<Array<RoleServiceResponseType>> {
        // serviceIds: for serviceCategory (record, collection/table, function, package, solution...)
        const roleServices: Array<RoleServiceResponseType> = [];
        try {
            // validate models
            const validRoleServiceDb = await this.checkDb(this.accessDb);
            if (validRoleServiceDb.code !== "success") {
                return [];
            }
            const result = await this.accessDb.collection(this.roleColl).find({
                roleId   : {$in: roleIds},
                serviceId: {$in: serviceIds},
                isActive : true,
            }).toArray();
            if (result.length > 0) {
                for (const rec of result) {
                    roleServices.push({
                        serviceId      : rec.serviceId,
                        roleId         : rec.roleId,
                        roleIds        : roleIds,
                        serviceCategory: rec.serviceCategory,
                        canRead        : rec.canRead,
                        canCreate      : rec.canCreate,
                        canUpdate      : rec.canUpdate,
                        canDelete      : rec.canDelete,
                        canCrud        : rec.canCrud,
                    });
                }
            }
            return roleServices;
        } catch (_e) {
            return [];
        }
    }

    // checkAccess validate if current CRUD task is permitted based on defined/assigned roles
    async checkTaskAccess(taskType: TaskTypes): Promise<ResponseMessage> {
        try {
            // validate models
            const validAccessDb = await this.checkDb(this.accessDb);
            if (validAccessDb.code !== "success") {
                return validAccessDb;
            }
            const validServiceDb = await this.checkDb(this.appDb);
            if (validServiceDb.code !== "success") {
                return validServiceDb;
            }
            // perform crud-operation
            // check logged-in user access status and record
            const accessRes = await this.checkLoginStatus();
            if (accessRes.code !== "success") {
                return accessRes;
            }
            const userRec = accessRes.value as unknown as CheckAccessType;

            // if all the above checks passed, check for role-services access by taskType
            // obtain crudColl/collId (id) from serviceTable (repo for all resources)
            const serviceRes = await this.appDb.collection(this.serviceColl).findOne({
                name           : this.coll,
                serviceCategory: {$in: ["collection", "table", "Collection", "Table",]},
            });

            // if permitted, include collId and docIds in serviceIds
            let collId = "";
            const serviceIds = this.docIds;
            if (serviceRes && (serviceRes.serviceCategory.toLowerCase() === "collection" || serviceRes.serviceCategory.toLowerCase() === "table")) {
                collId = serviceRes._id.toString();
                serviceIds.push(collId);
            }

            let roleServices: Array<RoleServiceResponseType> = [];
            if (serviceIds.length > 0) {
                roleServices = await this.getRoleServices(userRec.roleIds, serviceIds)
            }

            const permittedRes: CheckAccessType = {
                userId      : userRec.userId,
                roleId      : userRec.roleId,
                roleIds     : userRec.roleIds,
                isActive    : userRec.isActive,
                isAdmin     : userRec.isAdmin || false,
                roleServices: roleServices,
                collId      : collId,
            }
            if (permittedRes.isActive && permittedRes.isAdmin) {
                return getResMessage("success", {value: permittedRes as unknown as Record<string, ValueType>});
            }
            const recLen = permittedRes.roleServices?.length || 0;
            if (permittedRes.isActive && recLen > 0 && recLen >= this.docIds.length) {
                return getResMessage("success", {value: permittedRes as unknown as Record<string, ValueType>});
            }
            // TODO: collection/table level access: create, read, update and delete
            const collRoleService = roleServices.find(it => it.serviceId === collId) || {} as RoleServiceResponseType;
            let collAccessPermitted = false;
            if (collRoleService) {
                switch (taskType) {
                    case TaskTypes.READ:
                        collAccessPermitted = collRoleService.canRead || collRoleService.canCrud;
                        break;
                    case TaskTypes.CREATE:
                        collAccessPermitted = collRoleService.canCreate || collRoleService.canCrud;
                        break;
                    case TaskTypes.UPDATE:
                        collAccessPermitted = collRoleService.canUpdate || collRoleService.canCrud;
                        break;
                    case TaskTypes.DELETE:
                    case TaskTypes.REMOVE:
                        collAccessPermitted = collRoleService.canDelete || collRoleService.canCrud;
                        break;
                    default:
                        break;
                }
            }
            if (collAccessPermitted) {
                return getResMessage("success", {value: permittedRes as unknown as Record<string, ValueType>});
            }
            return getResMessage("unAuthorized",
                {
                    message: `Access permitted for ${recLen} of ${this.docIds.length} service-items/records`,
                    value  : permittedRes as unknown as Record<string, ValueType>,
                }
            );
        } catch (e) {
            console.error("check-access-error: ", e);
            return getResMessage("unAuthorized", {message: e.message});
        }
    }

    // taskPermissionById method determines the access permission by owner, role/group (on coll/table or doc/record(s)) or admin
    // for various task-types: "create", "update", "delete"/"remove", "read"
    async taskPermissionById(taskType: TaskTypes | string): Promise<ResponseMessage> {
        try {
            // # validation access variables
            let taskPermitted = false,
                ownerPermitted = false,
                docPermitted = false,
                collPermitted = false,
                isAdmin = false,
                isActive = false,
                userId = "",
                roleId = "",
                roleIds: Array<string> = [],
                collId = "",
                docIds: Array<string> = [],
                roleServices: Array<RoleServiceResponseType> = [];

            // validate and set docIds
            if (this.docIds.length < 1) {
                return getResMessage("unAuthorized", {message: "Document Ids not specified."});
            }
            docIds = this.docIds;

            // check role-based access
            const accessRes = await this.checkTaskAccess(taskType as TaskTypes);
            if (accessRes.code !== "success") {
                return accessRes;
            }

            // capture roleServices value | get access info value
            const accessInfo = accessRes.value as unknown as CheckAccessType;
            const accessUserId = accessInfo.userId;

            isAdmin = accessInfo.isAdmin;
            isActive = accessInfo.isActive;
            roleServices = accessInfo.roleServices || [];
            userId = accessInfo.userId;
            roleId = accessInfo.roleId;
            roleIds = accessInfo.roleIds;
            collId = accessInfo.collId || "";

            // validate active status
            if (!isActive) {
                return getResMessage("unAuthorized", {message: "Account is not active. Validate active status"});
            }
            // validate roleServices permission, for non-admin users
            if (!isAdmin && roleServices.length < 1) {
                return getResMessage("unAuthorized", {message: "You are not authorized to perform the requested action/task"});
            }

            // determine documents ownership permission
            if (accessUserId && isActive) {
                const ownedRecs = await this.appDb.collection(this.coll).find({
                    id       : {$in: docIds},
                    createdBy: accessUserId,
                }).toArray();
                // check if the current-user owned all the current-documents (docIds)
                if (ownedRecs.length === this.docIds.length) {
                    ownerPermitted = true;
                }
            }

            // filter the roleServices by categories ("collection" and "doc")
            const collFunc = (item: RoleServiceResponseType): boolean => {
                return (item.serviceId === collId);
            }
            const docFunc = (item: RoleServiceResponseType): boolean => {
                return (docIds.includes(item.serviceId));
            }

            let roleColls: Array<RoleServiceResponseType> = [];
            let roleDocs: Array<RoleServiceResponseType> = [];
            if (roleServices.length > 0) {
                roleColls = roleServices.filter(collFunc);
                roleDocs = roleServices.filter(docFunc);
            }

            // helper functions
            const canCreateFunc = (item: RoleServiceResponseType): boolean => {
                return item.canCreate
            }

            const canUpdateFunc = (item: RoleServiceResponseType): boolean => {
                return item.canUpdate;
            }

            const canDeleteFunc = (item: RoleServiceResponseType): boolean => {
                return item.canDelete;
            }

            const canReadFunc = (item: RoleServiceResponseType): boolean => {
                return item.canRead;
            }

            const roleUpdateFunc = (it1: string, it2: RoleServiceResponseType): boolean => {
                return (it2.serviceId === it1 && it2.canUpdate);
            }

            const roleDeleteFunc = (it1: string, it2: RoleServiceResponseType): boolean => {
                return (it2.serviceId === it1 && it2.canDelete);
            }

            const roleReadFunc = (it1: string, it2: RoleServiceResponseType): boolean => {
                return (it2.serviceId === it1 && it2.canRead);
            }

            // wrapper function for the role<Type>Func
            const recFunc = (it1: string, roleFunc: RoleFuncType): boolean => {
                // check if it2 includes it1 role assignment definition OR if it1 met any of the it2 role assignments
                // i.e. every docIds must have at least a match in the roleDocs
                return roleDocs.some((it2: RoleServiceResponseType) => roleFunc(it1, it2));
            }

            // taskType specific permission(s) - for non-admin users
            switch (taskType) {
                case TaskTypes.CREATE:
                case TaskTypes.INSERT:
                    // collection/table level access | crudColl-Id was included in serviceIds
                    if (roleColls.length > 0) {
                        collPermitted = roleColls.every(canCreateFunc);
                    }
                    break;
                case TaskTypes.UPDATE:
                    // collection/table level access
                    if (roleColls.length > 0) {
                        collPermitted = roleColls.every(canUpdateFunc);
                    }
                    // docs/records level access: every docIds must have at least a match in the roleDocs
                    docPermitted = docIds.every(it1 => recFunc(it1, roleUpdateFunc));
                    break;
                case TaskTypes.DELETE:
                case TaskTypes.REMOVE:
                    // collection/table level access
                    if (roleColls.length > 0) {
                        collPermitted = roleColls.every(canDeleteFunc);
                    }
                    // docs/records level access: every docIds must have at least a match in the roleDocs
                    docPermitted = docIds.every(it1 => recFunc(it1, roleDeleteFunc));
                    break;
                case TaskTypes.READ:
                    // collection/table level access
                    if (roleColls.length > 0) {
                        collPermitted = roleColls.every(canReadFunc);
                    }
                    // docs/records level access: every docIds must have at least a match in the roleDocs
                    docPermitted = docIds.every(it1 => recFunc(it1, roleReadFunc));
                    break;
                default:
                    return getResMessage("unAuthorized", {message: `Unknown/unsupported task-type (${taskType}`});
            }

            // overall access permitted
            taskPermitted = docPermitted || collPermitted || ownerPermitted || isAdmin;
            const ok: OkResponse = {ok: taskPermitted};
            const value = {...ok, ...{isAdmin, isActive, userId, roleId, roleIds}};
            if (taskPermitted) {
                return getResMessage("success", {
                    value  : value,
                    message: "action authorised / permitted"
                });
            } else {
                return getResMessage("unAuthorized", {
                    value  : value,
                    message: "You are not authorized to perform the requested action/task"
                });
            }
        } catch (e) {
            const ok: OkResponse = {ok: false};
            return getResMessage("unAuthorized", {value: ok as unknown as ObjectType, message: e.message});
        }
    }

    async taskPermissionByParams(taskType: TaskTypes | string): Promise<ResponseMessage> {
        try {
            // ids of documents to be deleted, from queryParams
            const docIds: Array<string> = [];          // reset docIds instance value
            if (this.currentRecs.length < 1) {
                const currentRecRes = await this.getCurrentRecords("queryParams");
                if (currentRecRes.code !== "success") {
                    return getResMessage("notFound", {message: "missing documents, required to process permission"});
                } else {
                    this.currentRecs = currentRecRes.value as unknown as Array<T>;
                }
            }
            this.currentRecs.forEach((item) => {
                docIds.push(item._id as string);
            });
            this.docIds = docIds;
            return await this.taskPermissionById(taskType);
        } catch (e) {
            console.error("task-permission-error: ", e);
            return getResMessage("unAuthorized", {message: e.message});
        }
    }

    // checkLoginStatus method checks if the user exists and has active login status/token
    async checkLoginStatus(): Promise<ResponseMessage> {
        try {
            // validate db-handle
            const validAccessDb = await this.checkDb(this.accessDb)
            if (validAccessDb.code !== "success") {
                return validAccessDb;
            }
            // check loginName, userId and token validity... from accessKeys collection
            const validAccess = await this.accessDb.collection(this.accessColl).findOne({
                userId   : new ObjectId(this.userInfo.userId),
                loginName: this.userInfo.loginName,
                token    : this.userInfo.token,
            });

            // validate login status
            if (validAccess) {
                if (Date.now() > Number(validAccess.expire)) {
                    return getResMessage("tokenExpired", {
                        message: "Access expired: please login to continue",
                    });
                }
            } else {
                return getResMessage("notFound", {
                    message: `Access information for ${this.userInfo.loginName} not found. Login first, or contact system administrator`,
                });
            }

            // check if user exists
            const validUser = await this.accessDb.collection(this.userColl).findOne({
                _id     : new ObjectId(this.userInfo.userId),
                isActive: true,
                $or     : [{email: this.userInfo.loginName}, {username: this.userInfo.loginName}],
            });
            if (!validUser) {
                return getResMessage("notFound", {
                    message: `User-profile information not found or inactive for ${this.userInfo.loginName}. Register a new account or contact system administrator. `,
                });
            }
            const resVal: CheckAccessType = {
                userId  : validUser._id.toString(),
                roleId  : validUser.profile.roleId,
                roleIds : validUser.roleIds,
                isActive: validUser.isActive,
                isAdmin : validUser.isAdmin || false,
                profile : validUser.profile,
            }
            return getResMessage("success", {
                message: "Access Permitted: ",
                value  : resVal as unknown as ObjectType,
            });
        } catch (e) {
            console.error("check-login-status-error:", e);
            return getResMessage("unAuthorized", {
                message: "Unable to verify access information: " + e.message,
            });
        }
    }
}

export default Crud;
