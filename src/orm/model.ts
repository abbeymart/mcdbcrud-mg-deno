// deno-lint-ignore-file no-explicit-any
/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-25
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mongodb mc-orm model specifications and validation
 */

import validator from "npm:validator";
import {
    getParamsMessage, getResMessage, MessageObject, ResponseMessage, Document, ValueType, ObjectId,
} from "../../deps.ts";

import {
    ComputedMethodsType,
    DataTypes,
    DefaultValueType,
    DocDescType,
    FieldDescType,
    ModelCrudOptionsType,
    ModelDescType,
    ModelOptionsType,
    ModelRelationType,
    UniqueFieldsType,
    ValidateMethodResponseType,
    ValidateResponseType,
    ValueToDataTypes,
} from "./types.ts";
import {
    ActionExistParamsType,
    ActionParamsType, ActionParamType,
    BaseModelType,
    CrudOptionsType,
    CrudParamsType, ExistParamItemType, ExistParamsType,
    newDeleteRecord,
    newGetRecord,
    newGetRecordStream,
    newSaveRecord, ObjectType,
    TaskTypes,
} from "../crud/index.ts";
import { isEmptyObject } from "./helpers.ts";

export class Model<T extends BaseModelType> {
    private readonly collName: string;
    private readonly docDesc: DocDescType;
    private readonly timeStamp: boolean;
    private readonly actorStamp: boolean;
    private readonly activeStamp: boolean;
    private readonly relations: Array<ModelRelationType>;
    protected readonly uniqueFields: UniqueFieldsType;
    protected readonly primaryFields: Array<string>;
    protected requiredFields: Array<string>;
    private readonly computedMethods: ComputedMethodsType;
    private readonly validateMethod?: ValidateMethodResponseType;
    private readonly alterSyncColl: boolean;
    protected taskType: string;
    protected readonly validateKey: string;
    protected modelOptions: ModelOptionsType;
    protected checkAccess: boolean;

    constructor(model: ModelDescType, options: ModelCrudOptionsType = {}) {
        this.collName = model.collName || "";
        this.docDesc = model.docDesc || {};
        this.timeStamp = model.timeStamp !== undefined ? model.timeStamp : true;
        this.actorStamp = model.actorStamp !== undefined ? model.actorStamp : true;
        this.activeStamp = model.activeStamp !== undefined ? model.activeStamp : true;
        this.computedMethods = model.computedMethods || {};
        this.validateMethod = model.validateMethod ? model.validateMethod : undefined;
        this.alterSyncColl = model.alterSyncColl !== undefined ? model.alterSyncColl : false;
        this.taskType = "";
        this.validateKey = "";
        this.relations = options.relations || [];
        this.uniqueFields = options.uniqueFields || [];
        this.primaryFields = options.primaryFields || [];
        this.requiredFields = options.requiredFields || [];
        this.modelOptions = {
            timeStamp  : this.timeStamp !== undefined ? this.timeStamp :
                options.timeStamp !== undefined ? options.timeStamp : true,
            actorStamp : this.actorStamp !== undefined ? this.actorStamp :
                options.actorStamp !== undefined ? options.actorStamp : true,
            activeStamp: this.activeStamp !== undefined ? this.activeStamp :
                options.activeStamp !== undefined ? options.activeStamp : true,
        };
        this.checkAccess = false;
    }

    // ***** instance methods: getters | setters *****
    get modelCollName(): string {
        return this.collName;
    }

    get modelDocDesc(): DocDescType {
        return this.docDesc;
    }

    get modelOptionValues(): ModelOptionsType {
        return this.modelOptions;
    }

    get modelUniqueFields(): UniqueFieldsType {
        return this.uniqueFields
    }

    get modelRelations(): Array<ModelRelationType> {
        return this.relations;
    }

    get modelValidateMethod(): ValidateMethodResponseType {
        return this.validateMethod;
    }

    // instance methods

    // getParentRelations method retrieves/extracts parent relations/collections for the this.collName (as targetColl).
    // sourceColl is the parentColl of this.collName(target/child).
    getParentRelations(): Array<ModelRelationType> {
        const parentRelations: Array<ModelRelationType> = [];
        if (this.modelRelations.length < 1) {
            return [];
        }
        for (const item of this.modelRelations) {
            if (this.modelCollName === item.targetColl) {
                parentRelations.push(item);
            }
        }
        return parentRelations;
    }

    // getChildRelations method retrieves/extracts child-relations/collections for the this.collName (as sourceColl).
    // targetColl is the childColl of this.collName(source/parent).
    getChildRelations(): Array<ModelRelationType> {
        const childRelations: Array<ModelRelationType> = [];
        if (this.modelRelations.length < 1) {
            return [];
        }
        for (const item of this.modelRelations) {
            if (this.modelCollName === item.sourceColl) {
                childRelations.push(item);
            }
        }
        return childRelations;
    }

    // getParentColls retrieves the parent/source-collections from parentRelations
    getParentColls(): Array<string> {
        const parentRelations = this.getParentRelations();
        return parentRelations.length > 0 ? parentRelations.map(rel => rel.sourceColl) : [];
    }

    // getChildColls retrieves the child/target-collections from childRelations
    getChildColls(): Array<string> {
        const childRelations = this.getChildRelations();
        return childRelations.length > 0 ? childRelations.map(rel => rel.targetColl) : [];
    }

    // ***** helper methods *****

    // computeExistParam compute the query-object(s) for checking document uniqueness based on model-unique-fields constraints.
    computeExistParam(actionParam: ActionParamType): ExistParamsType {
        // set the existParams for create or update action to determine document uniqueness
        const existParam: ExistParamsType = [];
        const item = actionParam;
        for (const fields of this.modelUniqueFields) {
            // compute the uniqueness object
            const uniqueObj: ExistParamItemType = {};
            for (const field of fields) {
                // exclude primary/unique _id field/key
                if (field === "_id") {
                    continue
                }
                // set item value
                uniqueObj[field] = item[field]
            }
            // append the uniqueObj
            existParam.push({
                ...uniqueObj,
            });
            // add uniqueness object to the existParams, to exclude the existing document(update-task)
            if (item["_id"] || item["_id"] !== "") {
                existParam.push({
                    _id: {
                        $ne: new ObjectId(item["_id"] as string),
                    },
                    ...uniqueObj,
                });
            }
        }
        return existParam;
    }

    // computeExistParams compute the query-object(s) for checking documents uniqueness based on model-unique-fields constraints.
    computeExistParams(actionParams: ActionParamsType): ActionExistParamsType {
        // set the existParams for create or update action to determine documents uniqueness
        const existParams: ActionExistParamsType = [];
        for (const item of actionParams) {
            const existParam = this.computeExistParam(item)
            existParams.push(existParam)
        }
        return existParams;
    }

    // validateRequiredFields validates the non-null field-values, i.e. allowNull === false.
    validateRequiredFields(actionParam: ActionParamType): ValidateResponseType {
        const errors: MessageObject = {};
        const reqFields = this.computeRequiredFields()
        if (reqFields.length < 1) {
            errors["message"] = "No field validation requirements specified"
            return {
                ok: true,
                errors,
            };
        }
        // validate required field-values
        for (const field of reqFields) {
            if (!actionParam[field]) {
                errors[field] = `Field: ${field} is required (not-null)`;
            }
        }
        if (!isEmptyObject(errors)) {
            return {
                ok: false,
                errors,
            }
        }
        return {
            ok: true,
            errors,
        }
    }

    // computeRequiredFields computes the non-null fields, i.e. allowNull === false.
    computeRequiredFields(): Array<string> {
        const requiredFields: Array<string> = [];
        for (let [field, fieldDesc] of Object.entries(this.modelDocDesc)) {
            switch (typeof fieldDesc) {
                case "object":
                    fieldDesc = fieldDesc as FieldDescType;
                    if (!fieldDesc.allowNull) {
                        requiredFields.push(field);
                    }
                    break;
                default:
                    break;
            }
        }
        this.requiredFields = requiredFields;
        return requiredFields;
    }

    // computeFieldValueType computes the document-field-value-type, as DataTypes.
    computeFieldValueType(val: ValueType): DataTypes {
        let computedType: DataTypes;
        try {
            if (Array.isArray(val)) {
                const valRec: Array<any> = val
                if (valRec.every((item) => typeof item === "number")) {
                    computedType = DataTypes.ARRAY_NUMBER;
                } else if (valRec.every((item) => typeof item === "string")) {
                    computedType = DataTypes.ARRAY_STRING;
                } else if (valRec.every((item) => typeof item === "boolean")) {
                    computedType = DataTypes.ARRAY_BOOLEAN;
                } else if (valRec.every((item) => typeof item === "object")) {
                    computedType = DataTypes.ARRAY_OBJECT;
                } else {
                    computedType = DataTypes.ARRAY;
                }
            } else if (typeof val === "string") {
                // check all base string formats
                if (validator.isDate(val)) {
                    computedType = DataTypes.DATETIME;
                } else if (validator.isEmail(val)) {
                    computedType = DataTypes.EMAIL;
                } else if (validator.isMongoId(val)) {
                    computedType = DataTypes.MONGODB_ID;
                } else if (validator.isUUID(val)) {
                    computedType = DataTypes.STRING;        // default to STRING
                } else if (validator.isJSON(val)) {
                    computedType = DataTypes.JSON;
                } else if (validator.isCreditCard(val)) {
                    computedType = DataTypes.CREDIT_CARD;
                } else if (validator.isCurrency(val)) {
                    computedType = DataTypes.CURRENCY;
                } else if (validator.isURL(val)) {
                    computedType = DataTypes.URL;
                } else if (validator.isPort(val)) {
                    computedType = DataTypes.PORT;
                } else if (validator.isIP(val)) {
                    computedType = DataTypes.IP;
                } else if (validator.isMimeType(val)) {
                    computedType = DataTypes.MIME;
                } else if (validator.isMACAddress(val)) {
                    computedType = DataTypes.MAC_ADDRESS;
                } else if (validator.isJWT(val)) {
                    computedType = DataTypes.JWT;
                } else if (validator.isLatLong(val)) {
                    computedType = DataTypes.LAT_LONG;
                } else if (validator.isISO31661Alpha2(val)) {
                    computedType = DataTypes.ISO2;
                } else if (validator.isISO31661Alpha3(val)) {
                    computedType = DataTypes.ISO3;
                } else if (validator.isPostalCode(val, "any")) {
                    computedType = DataTypes.POSTAL_CODE;
                } else {
                    computedType = DataTypes.STRING;
                }
            } else if (typeof val === "number") {
                if (validator.isDecimal(val.toString())) {
                    computedType = DataTypes.DECIMAL;
                } else if (validator.isFloat(val.toString())) {
                    computedType = DataTypes.FLOAT;
                } else if (validator.isInt(val.toString())) {
                    computedType = DataTypes.INTEGER;
                } else {
                    computedType = DataTypes.NUMBER;
                }
            } else if (typeof val === "boolean") {
                computedType = DataTypes.BOOLEAN;
            } else if (typeof val === "object") {
                if (validator.isDate(val)) {
                    computedType = DataTypes.DATETIME;
                } else {
                    computedType = DataTypes.OBJECT;
                }
            } else {
                computedType = DataTypes.UNKNOWN;
            }
            return computedType;
        } catch (e) {
            console.error(e);
            throw new Error("Error computing docValue types: " + e.message);
        }
    }

    // computeDocValueType computes the document-field-value-types, as DataTypes.
    computeDocValueType(doc: T): ValueToDataTypes {
        const computedTypes: ValueToDataTypes = {};
        try {
            for (const [key, val] of Object.entries(doc)) {
                computedTypes[key] = this.computeFieldValueType(val);
            }
            return computedTypes;
        } catch (e) {
            console.error(e);
            throw new Error("Error computing docValue types: " + e.message);
        }
    }

    // setDefaultValue set the default document-field-values for no-value fields and if specified, setValue (transform).
    async setDefaultValues(doc: T): Promise<T> {
        const docValue = doc as unknown as ObjectType;
        try {
            // set base docValue
            const setDocValue: ObjectType = docValue as unknown as ObjectType;
            // perform defaultValue task
            for (const [key, val] of Object.entries(docValue)) {
                // defaultValue setting applies to FieldDescType only | otherwise, the value is null (by default, i.e. allowNull=>true)
                let docFieldDesc = this.modelDocDesc[key];
                const docFieldValue = val || null;
                // set default values for no-value field only
                if (!docFieldValue) {
                    switch (typeof docFieldDesc) {
                        case "object": {
                            docFieldDesc = docFieldDesc as FieldDescType;
                            let defaultValue = docFieldDesc?.defaultValue ? docFieldDesc.defaultValue : null;
                            // type of defaultValue and docFieldValue must be equivalent (re: validateMethod)
                            if (defaultValue) {
                                switch (typeof defaultValue) {
                                    // defaultValue may be of types: FieldValueTypes or DefaultValueType
                                    case "function":
                                        defaultValue = defaultValue as DefaultValueType;
                                        if (typeof defaultValue === "function") {
                                            setDocValue[key] = await defaultValue(docValue[key]);
                                        }
                                        break;
                                    default:
                                        // defaultValue = defaultValue as FieldValueTypes
                                        setDocValue[key] = defaultValue;
                                        break;
                                }
                            }
                            break;
                        }
                        default:
                            break;
                    }
                }
                // setValue / transform field-value prior-to/before save-task (create / update)
                switch (typeof docFieldDesc) {
                    case "object": {
                        docFieldDesc = docFieldDesc as FieldDescType;
                        const fieldValue = setDocValue[key];    // set applies to existing field-value only
                        if (fieldValue && docFieldDesc.setValue) {
                            setDocValue[key] = await docFieldDesc.setValue(fieldValue);
                        }
                        break;
                    }
                    default:
                        break;
                }
            }
            return setDocValue as unknown as T;
        } catch (e) {
            console.log("default-error: ", e);
            throw new Error(e.message);
        }
    }

    // validateDocValue validates the docValue by model definition (this.modelDocDesc)
    validateDocValue(doc: T, docValueTypes: ValueToDataTypes): ValidateResponseType {
        let errors: MessageObject = {};
        try {
            // use values from transformed docValue, including default/set-values, prior to validation
            // model-description/definition
            const docDesc = this.modelDocDesc;
            // combine errors/messages
            // perform model-defined docValue (document-field-values) validation
            for (const [key, val] of Object.entries(doc)) {
                let fieldDesc = docDesc[key] || null;
                const fieldValue = val || null
                // check field description / definition in the model-field-description
                if (!fieldDesc) {
                    errors[key] = `Invalid field: ${key} is not defined in the model`;
                    continue;
                }
                switch (typeof fieldDesc) {
                    case "string":
                        // validate field-value-type
                        fieldDesc = fieldDesc as DataTypes;
                        if (fieldValue && docValueTypes[key] !== fieldDesc) {
                            errors[key] = `Invalid type for: ${key}. Expected ${fieldDesc}. Got ${docValueTypes[key]}.`;
                        }
                        break;
                    case "object":
                        // validate field-value-type,
                        fieldDesc = fieldDesc as FieldDescType;
                        if (fieldValue && docValueTypes[key] !== fieldDesc.fieldType) {
                            errors[key] = fieldDesc.validateMessage ? fieldDesc.validateMessage :
                                `Invalid Type for: ${key}. Expected ${fieldDesc.fieldType}, Got ${docValueTypes[key]}`;
                        }
                        // validate allowNull, fieldLength, min/maxValues and pattern matching
                        // null-validation
                        if (!fieldValue && !fieldDesc.allowNull) {
                            errors[`${key}-nullValidation`] = fieldDesc.validateMessage ?
                                fieldDesc.validateMessage + ` | Value is required for: ${key}.}` :
                                `Value is required for: ${key}.}`;
                        }
                        // fieldLength-validation
                        if (fieldValue && fieldDesc.fieldLength && fieldDesc.fieldLength > 0) {
                            const fieldLength = fieldValue.toString().length;
                            if (fieldLength > fieldDesc.fieldLength) {
                                errors[`${key}-lengthValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Length of ${key}[${fieldLength}] cannot be longer than ${fieldDesc.fieldLength}` :
                                    `Length of ${key}[${fieldLength}] cannot be longer than ${fieldDesc.fieldLength}`;
                            }
                        }
                        // min/maxValues-validation for number-types and date-type field-values
                        if (fieldValue && (docValueTypes[key] === DataTypes.NUMBER || docValueTypes[key] === DataTypes.INTEGER ||
                            docValueTypes[key] === DataTypes.FLOAT || docValueTypes[key] === DataTypes.BIGFLOAT ||
                            docValueTypes[key] === DataTypes.DECIMAL)) {
                            // number value for comparison
                            const numFieldValue = Number(fieldValue);
                            if (fieldDesc.minValue && fieldDesc.maxValue) {
                                const numMinValue = fieldDesc.minValue;
                                const numMaxValue = fieldDesc.maxValue;
                                if (numFieldValue < numMinValue || numFieldValue > numMaxValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} must be greater than ${numMinValue}, and less than ${numMaxValue}` :
                                        `Value of: ${key} must be greater than ${numMinValue}, and less than ${numMaxValue}`;
                                }
                            } else if (fieldDesc.minValue) {
                                const numMinValue = fieldDesc.minValue;
                                if (numFieldValue < numMinValue) {
                                    errors[`${key}-minValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be less than ${numMinValue}.` :
                                        `Value of: ${key} cannot be less than ${numMinValue}.`;
                                }
                            } else if (fieldDesc.maxValue) {
                                const numMaxValue = fieldDesc.maxValue;
                                if (numFieldValue > numMaxValue) {
                                    errors[`${key}-maxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be greater than ${numMaxValue}.` :
                                        `Value of: ${key} cannot be greater than ${numMaxValue}.`;
                                }
                            }
                        } else if (fieldValue && (docValueTypes[key] === DataTypes.STRING || docValueTypes[key] === DataTypes.DATETIME)) {
                            // date value, excluding time portion, for comparison
                            const dateFieldValue = (new Date(fieldValue.toString())).setHours(0, 0, 0, 0);
                            if (fieldDesc.minValue && fieldDesc.maxValue) {
                                const dateMinValue = (new Date(fieldDesc.minValue.toString())).setHours(0, 0, 0, 0);
                                const dateMaxValue = (new Date(fieldDesc.maxValue.toString())).setHours(0, 0, 0, 0);
                                if ((dateFieldValue < dateMinValue || dateFieldValue > dateMaxValue)) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} must be greater than ${dateMinValue}, and less than ${dateMaxValue}` :
                                        `Value of: ${key} must be greater than ${dateMinValue}, and less than ${dateMaxValue}`;
                                }
                            } else if (fieldDesc.minValue) {
                                const dateMinValue = (new Date(fieldDesc.minValue.toString())).setHours(0, 0, 0, 0);
                                if (dateFieldValue < dateMinValue) {
                                    errors[`${key}-minValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be less than ${dateMinValue}.` :
                                        `Value of: ${key} cannot be less than ${dateMinValue}.`;
                                }
                            } else if (fieldDesc.maxValue) {
                                const dateMaxValue = (new Date(fieldDesc.maxValue.toString())).setHours(0, 0, 0, 0);
                                if (dateFieldValue > dateMaxValue) {
                                    errors[`${key}-maxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be greater than ${dateMaxValue}.` :
                                        `Value of: ${key} cannot be greater than ${dateMaxValue}.`;
                                }
                            }
                        }
                        // pattern matching validation
                        if (fieldValue && fieldDesc.fieldPattern) {
                            const testPattern = (fieldDesc.fieldPattern as unknown as RegExp).test(fieldValue as string);
                            if (!testPattern) {
                                errors[`${key}-patternMatchValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} did not match the pattern ${fieldDesc.fieldPattern}.` :
                                    `Value of: ${key} did not match the pattern ${fieldDesc.fieldPattern}.`;
                            }
                        }
                        // startsWith
                        if (fieldValue && fieldDesc.startsWith) {
                            const testPattern = fieldValue.toString().startsWith(fieldDesc.startsWith);
                            if (!testPattern) {
                                errors[`${key}-startsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must start with ${fieldDesc.startsWith}.` :
                                    `Value of: ${key} must start with ${fieldDesc.startsWith}.`;
                            }
                        }
                        // notStartsWith
                        if (fieldValue && fieldDesc.notStartsWith) {
                            const testPattern = fieldValue.toString().startsWith(fieldDesc.notStartsWith);
                            if (testPattern) {
                                errors[`${key}-notStartsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must not start with ${fieldDesc.notStartsWith}.` :
                                    `Value of: ${key} must not start with ${fieldDesc.notStartsWith}.`;
                            }
                        }
                        // endsWith
                        if (fieldValue && fieldDesc.endsWith) {
                            const testPattern = fieldValue.toString().endsWith(fieldDesc.endsWith);
                            if (!testPattern) {
                                errors[`${key}-endsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must end with ${fieldDesc.endsWith}.` :
                                    `Value of: ${key} must end with ${fieldDesc.endsWith}.`;
                            }
                        }
                        // notEndsWith
                        if (fieldValue && fieldDesc.notEndsWith) {
                            const testPattern = fieldValue.toString().endsWith(fieldDesc.notEndsWith);
                            if (testPattern) {
                                errors[`${key}-notEndsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must not end with ${fieldDesc.notEndsWith}.` :
                                    `Value of: ${key} must not end with ${fieldDesc.notEndsWith}.`;
                            }
                        }
                        // includes
                        if (fieldValue && fieldDesc.includes) {
                            const testPattern = fieldValue.toString().includes(fieldDesc.includes);
                            if (!testPattern) {
                                errors[`${key}-includeValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must include ${fieldDesc.includes}.` :
                                    `Value of: ${key} must include ${fieldDesc.includes}.`;
                            }
                        }
                        // excludes
                        if (fieldValue && fieldDesc.excludes) {
                            const testPattern = fieldValue.toString().includes(fieldDesc.excludes);
                            if (testPattern) {
                                errors[`${key}-includeValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must exclude ${fieldDesc.excludes}.` :
                                    `Value of: ${key} must exclude ${fieldDesc.excludes}.`;
                            }
                        }
                        break;
                    default:
                        errors[key] = `Unsupported field type: ${key} value, of type[${typeof val}], is not a supported type`;
                        break;
                }
            }
            // perform user-defined document validation
            const modelValidateMethod = this.modelValidateMethod || null;
            if (modelValidateMethod) {
                const valRes = modelValidateMethod(doc);
                if (!isEmptyObject(valRes.errors) || !valRes.ok) {
                    // update docValue validation errors object
                    errors = {...errors, ...valRes.errors}
                }
            }
            // check validation errors
            if (!isEmptyObject(errors)) {
                return {
                    ok    : false,
                    errors: errors,
                }
            }
            // return success
            return {ok: true, errors: {}};
        } catch (e) {
            // throw new Error(e.message);
            errors["message"] = e.message ? e.message : "error validating the document-field-value";
            return {ok: false, errors};
        }
    }

    // ***** crud operations / methods : interface to the CRUD modules *****

    async save(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            this.taskType = TaskTypes.UNKNOWN;  // create or update
            // set checkAccess status for crud-task-permission control
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // validate task/action-params
            if (!params.actionParams || params.actionParams.length < 1) {
                return getResMessage('validateError', {
                    message: "actionParams(record-inputs) must be an array of object values [ActionParamsType].",
                });
            }
            // get docValue transformed types (as DataTypes) | one iteration only for actionParams[0]
            const docValueTypes = this.computeDocValueType(params.actionParams[0] as T);
            // validate actionParams (docValues), prior to saving, via this.validateDocValue
            const actParams: ActionParamsType = []
            for (const docValue of params.actionParams) {
                // set defaultValues, prior to save
                const modelDocValue = await this.setDefaultValues(docValue as T);
                // validate actionParam-item (docValue) field-values
                const validateRes = await this.validateDocValue(modelDocValue, docValueTypes);
                if (!validateRes.ok || !isEmptyObject(validateRes.errors)) {
                    return getParamsMessage(validateRes.errors);
                }
                // update actParams, with the model-transformed document-value
                actParams.push(modelDocValue)
            }
            // update CRUD params and options
            params.actionParams = actParams
            // update unique-fields query-parameters
            params.existParams = this.computeExistParams(params.actionParams);
            options = {
                ...options, ...this.modelOptionValues,
            };
            // instantiate CRUD-save class & perform save-crud task (create or update)
            const crud = newSaveRecord(params, options);
            // validate docIds, for updates
            const docIds: Array<string> = [];
            for (const rec of params.actionParams) {
                if (rec["_id"]) {
                    docIds.push(rec["_id"] as string);
                }
            }
            if (docIds.length > 0) {
                params.docIds = docIds
            }
            // determine taskType - create or update (not both)
            if (params.actionParams && params.actionParams.length > 0) {
                const actParam = params.actionParams[0]
                if (!actParam["_id"] || actParam["_id"] === "") {
                    if (params.actionParams.length === 1 && (params.docIds && params.docIds?.length > 0) ||
                        params.queryParams && !isEmptyObject(params.queryParams)) {
                        this.taskType = TaskTypes.UPDATE
                    } else {
                        this.taskType = TaskTypes.CREATE
                    }
                } else {
                    this.taskType = TaskTypes.UPDATE
                }
            } else {
                return getResMessage('saveError', {
                    message: "Valid actionParams is required to perform save (create/update) task",
                });
            }
            return await crud.saveRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("saveError", {message: `${e.message ? e.message : "Unable to complete save tasks"}`});
        }
    }

    async get(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage(`readError ${e.message ? "=> " + e.message : ""}`);
        }
    }

    async getStream(params: CrudParamsType, options: CrudOptionsType = {}): Promise<AsyncIterable<Document>> {
        // get stream of document(s), returning a cursor or error
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecordStream(params, options);
            return await crud.getRecordStream();
        } catch (e) {
            console.error(e);
            throw new Error(`notFound ${e.message ? "=> " + e.message : ""}`);
        }
    }

    async lookupGet(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        // get lookup documents based on queryParams and model-relations definition
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("readError", {
                message: `Document(s) lookup fetch-error ${e.message ? "=> " + e.message : ""}`
            });
        }
    }

    async delete(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        // validate queryParams based on model/docDesc
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.DELETE;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // update options
            options = {
                ...options, ...{
                    parentColls    : this.getParentColls(),
                    childColls     : this.getChildColls(),
                    parentRelations: this.getParentRelations(),
                    childRelations : this.getChildRelations(),
                }
            }
            const crud = newDeleteRecord(params, options);
            return await crud.deleteRecord();
        } catch (e) {
            console.error(e);
            return getResMessage(`deleteError ${e.message ? "=> " + e.message : ""}`);
        }
    }

    async save2(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        try {
            // model specific params
            params.coll = params.coll || this.modelCollName;
            params.docDesc = this.modelDocDesc;
            options.uniqueFields = this.modelUniqueFields;
            this.taskType = TaskTypes.UNKNOWN;  // CREATE or UPDATE task-type
            // set checkAccess status for crud-task-permission control
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // validate task/action-params
            if (!params.actionParams || params.actionParams.length < 1) {
                return getResMessage('validateError', {
                    message: "actionParams(record-inputs) must be an array of object values [ActionParamsType].",
                });
            }
            // get docValue transformed types (as DataTypes) | one iteration only for actionParams[0]
            const docValueTypes = this.computeDocValueType(params.actionParams[0] as T);
            // validate actionParams (docValues), prior to saving, via this.validateDocValue
            const actParams: Array<T> = [];
            for (const docValue of params.actionParams) {
                // set defaultValues, prior to save
                const modelDocValue = await this.setDefaultValues(docValue as T);
                // validate actionParam-item (docValue) field-values
                const validateRes = this.validateDocValue(modelDocValue, docValueTypes);
                if (!validateRes.ok || !isEmptyObject(validateRes.errors)) {
                    return getParamsMessage(validateRes.errors);
                }
                // update actParams, with the model-transformed document-value
                actParams.push(modelDocValue);
            }
            // update CRUD params and options
            params.actionParams = actParams;
            // update unique-fields query-parameters
            // params.existParams = this.computeExistParams(params.actionParams);
            options = {
                ...options,
                ...{modelOptions: this.modelOptionValues},
            };
            // instantiate CRUD-save class & perform save-crud task (create or update)
            const crud = newSaveRecord(params, options);
            return await crud.saveRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("saveError", {message: `${e.message ? e.message : "Unable to complete save tasks"}`});
        }
    }

    async get2(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        try {
            // model specific params
            params.coll = params.coll || this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage(`readError ${e.message ? "=> " + e.message : ""}`);
        }
    }

    // Work-in-progress, not currently used
    async getStream2(params: CrudParamsType, options: CrudOptionsType = {}): Promise<AsyncIterable<Document>> {
        // get stream of document(s), returning a cursor or error
        try {
            // model specific params
            params.coll = params.coll || this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecordStream(params, options);
            return await crud.getRecordStream();
        } catch (e) {
            console.error(e);
            throw new Error(`notFound ${e.message ? "=> " + e.message : ""}`);
        }
    }

    async lookup2(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        // get lookup documents based on queryParams and model-relations definition
        try {
            // model specific params
            params.coll = params.coll || this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("readError", {
                message: `Document(s) lookup fetch-error ${e.message ? "=> " + e.message : ""}`
            });
        }
    }

    async delete2(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage<any>> {
        // validate queryParams based on model/docDesc
        try {
            // model specific params
            params.coll = params.coll || this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.DELETE;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // update options
            options = {
                ...options,
                ...{
                    parentColls    : this.getParentColls(),
                    childColls     : this.getChildColls(),
                    parentRelations: this.getParentRelations(),
                    childRelations : this.getChildRelations(),
                },
            }
            const crud = newDeleteRecord(params, options);
            return await crud.deleteRecord();
        } catch (e) {
            console.error(e);
            return getResMessage(`deleteError ${e.message ? "=> " + e.message : ""}`);
        }
    }
}

// factory function
export function newModel<T extends BaseModelType>(model: ModelDescType, options: ModelCrudOptionsType = {}) {
    return new Model<T>(model, options);
}
