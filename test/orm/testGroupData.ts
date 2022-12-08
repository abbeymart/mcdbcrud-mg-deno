// @Description: test-cases data: for get, delete and save record(s)

import {
    ActionParamType, TaskTypes, QueryParamsType, ModelRelationType, RelationTypes, RelationActionTypes,
    ModelDescType, BaseModel, DataTypes, ModelCrudOptionsType, newModel, AuditType, ObjectType,
    BaseModelType,
} from "../../src/index.ts"
import { collections } from "../collections.ts";

// Models

// TODO: include groups and categories collections, with relations-specs

export interface GroupType extends BaseModelType {
    name: string;
}

export interface CategoryType extends BaseModelType {
    name: string;
    groupName: string;
    priority: number;
    iconStyle?: string;
    parentId?: string;
    path?: string;
}

export const groupModel: ModelDescType = {
    collName   : collections.GROUPS,
    docDesc    : {
        ...BaseModel,
        name   : {
            fieldType  : DataTypes.STRING,
            fieldLength: 20,
            allowNull  : false,
        },
        ownerId: DataTypes.STRING,
    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
}

export const categoryModel: ModelDescType = {
    collName   : collections.CATEGORIES,
    docDesc    : {
        ...BaseModel,
        name     : {
            fieldType  : DataTypes.STRING,
            fieldLength: 100,
            allowNull  : false,
        },
        groupId  : {
            fieldType: DataTypes.MONGODB_ID,
            allowNull: false,
        },
        groupName: {
            fieldType: DataTypes.STRING,
            allowNull: false,
        },
        priority : {
            fieldType   : DataTypes.INTEGER,
            allowNull   : false,
            defaultValue: 100,
        },
        iconStyle: {
            fieldType   : DataTypes.STRING,
            allowNull   : false,
            defaultValue: "fa fa-briefcase",
        },
        parentId : DataTypes.MONGODB_ID,
        path     : DataTypes.STRING,

    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
}

export const groupRelations: Array<ModelRelationType> = [
    {
        sourceColl  : collections.GROUPS,
        targetColl  : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "groupId",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupId",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.NO_ACTION,
    },
    {
        sourceColl  : collections.GROUPS,
        targetColl  : collections.CATEGORIES,
        sourceField : "name",
        targetField : "groupName",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupName",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.CASCADE,
    },
];

export const categoryRelations: Array<ModelRelationType> = [
    {
        sourceColl  : collections.CATEGORIES,
        targetColl  : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "parentId",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "parentId",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.NO_ACTION,
    },
]

export const centralRelations: Array<ModelRelationType> = [
    ...groupRelations,
    ...categoryRelations,
]

const groupOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name"],
    ],
}

// instantiate model
export const GroupModel = newModel(groupModel, groupOptions);

const categoryOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name", "groupId",],
        ["name", "groupName",],
    ]
}
// instantiate model
export const CategoryModel = newModel(categoryModel, categoryOptions);

export const groupTable = collections.GROUPS
export const categoryTable = collections.CATEGORIES

export const UserId = "c85509ac-7373-464d-b667-425bb59b5738" // TODO: review/update

// TODO: create/update, get & delete records for groups & categories tables

export const GroupRecords: ObjectType = {
    "name"    : "Abi",
    "desc"    : "Testing only",
    "url"     : "localhost:9000",
    "priority": 100,
    "cost"    : 1000.00,
}

export const GroupRecords2: ObjectType = {
    "name"    : "Ola",
    "desc"    : "Testing only - 2",
    "url"     : "localhost:9000",
    "priority": 1,
    "cost"    : 10000.00,
}

export const GroupRecords3: ObjectType = {
    "name"    : "Ola",
    "desc"    : "Testing only - 2 - updated",
    "url"     : "localhost:9000",
    "priority": 1,
    "cost"    : 20000.00,
}

// create record(s)

export const GroupCreateRec1: ObjectType = {
    "collName"  : "audits",
    "logAt"     : new Date(),
    "logBy"     : UserId,
    "logRecords": GroupRecords,
    "logType"   : TaskTypes.CREATE,
}

export const GroupCreateRec2: ObjectType = {
    "collName"  : "audits",
    "logAt"     : new Date(),
    "logBy"     : UserId,
    "logRecords": GroupRecords2,
    "logType"   : TaskTypes.CREATE,
}

export const GroupUpdateRec1: GroupType = {
    _id : "638fd835c77947991e7f7e14",
    name: "",
}

export const GroupUpdateRec2: GroupType = {
    _id : "638fd835c77947991e7f7e15",
    name: "",
}

export const GroupCreateActionParams: Array<AuditType> = [
    GroupCreateRec1,
    GroupCreateRec2,
]

export const GroupUpdateActionParams: Array<AuditType> = [
    GroupUpdateRec1,
    GroupUpdateRec2,
]

// TODO: update and delete params, by ids / queryParams

export const GroupUpdateRecordById: ObjectType = {
    "_id" : "638fd873a02862d754fa0247",
    "name": "Group Name",
}

export const AuditUpdateRecordByParam: ActionParamType = {
    "_id" : "638fd873a02862d754fa0248",
    "name": "Updated Group Name",
}

// GetIds: for get-records by ids & params | TODO: update ids after create

export const GetGroupById = "638fd565c97d023503c6a0d8"
export const GetGroupByIds = ["638fd565c97d023503c6a0d8",
    "638fd565c97d023503c6a0d9"] as Array<string>
export const GetGroupByParams: QueryParamsType = {
    "logType": "create",
}

export const DeleteGroupById = "638fd62cd7d613895979da27"
export const DeleteGroupByIds: Array<string> = [
    "638fd62cd7d613895979da28",
    "638fd62cd7d613895979da29",
    "638fd62cd7d613895979da2a",
    "638fd62cd7d613895979da2b",
]

export const DeleteGroupByParams: QueryParamsType = {
    "logType": "read",
}

export const UpdateGroupById = "638fd835c77947991e7f7e11"
export const UpdateGroupByIds: Array<string> = [
    "638fd835c77947991e7f7e11",
    "638fd835c77947991e7f7e12",
    "638fd835c77947991e7f7e13",
]

export const UpdateGroupByParams: QueryParamsType = {
    "logType": "read",
}
