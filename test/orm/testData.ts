// @Description: test-cases data: for get, delete and save record(s)

import {
    ActionParamType, QueryParamsType, ModelRelationType, RelationTypes, RelationActionTypes,
    ModelDescType, BaseModel, DataTypes, ModelCrudOptionsType, newModel,
    BaseModelType,
} from "../../src/index.ts"
import { collections } from "../collections.ts";

// Models

export interface GroupType extends BaseModelType {
    name: string;
}

export interface CategoryType extends BaseModelType {
    name: string;
    groupName: string;
    priority?: number;
    iconStyle?: string;
    parentId?: string;
    path?: string;
}

export const groupModel: ModelDescType = {
    collName   : collections.GROUPS,
    docDesc    : {
        ...BaseModel,
        name: {
            fieldType  : DataTypes.STRING,
            fieldLength: 25,
            allowNull  : false,
        },
    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
};

export const categoryModel: ModelDescType = {
    collName   : collections.CATEGORIES,
    docDesc    : {
        ...BaseModel,
        name: {
            fieldType  : DataTypes.STRING,
            fieldLength: 100,
            allowNull  : false,
        },
        // groupId  : {
        //     fieldType: DataTypes.MONGODB_ID,
        //     allowNull: false,
        // },
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
};

export const groupRelations: Array<ModelRelationType> = [
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
    // {
    //     sourceColl  : collections.GROUPS,
    //     targetColl  : collections.CATEGORIES,
    //     sourceField : "_id",
    //     targetField : "groupId",
    //     targetModel : categoryModel,
    //     relationType: RelationTypes.ONE_TO_MANY,
    //     foreignField: "groupId",
    //     onDelete    : RelationActionTypes.RESTRICT,
    //     onUpdate    : RelationActionTypes.NO_ACTION,
    // },
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
];

export const centralRelations: Array<ModelRelationType> = [
    ...groupRelations,
    ...categoryRelations,
];

const groupOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name"],
    ],
};

const categoryOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name", "groupId",],
        ["name", "groupName",],
    ]
};

// instantiate model
export const GroupModel = newModel(groupModel, groupOptions);

// instantiate model
export const CategoryModel = newModel(categoryModel, categoryOptions);

export const groupColl = collections.GROUPS;
export const groupCollUpdate = "groups_update";
export const groupCollDelete = "groups_delete";
export const categoryColl = collections.CATEGORIES;
export const categoryCollUpdate = "categories_update";
export const categoryCollDelete = "categories_delete";

// export const UserId = "c85509ac-7373-464d-b667-425bb59b5738"

// TODO: groups collection test-data

export const GroupCreateRec1: GroupType = {
    "name": "User",
}

export const GroupCreateRec2: GroupType = {
    "name": "Location",
}

export const GroupCreateRec3: GroupType = {
    name: "Business",
}

export const GroupCreateRec4: GroupType = {
    name: "Industry",
}

export const GroupCreateRec5: GroupType = {
    name: "Locale",
}

export const GroupCreateRec6: GroupType = {
    name: "Tax",
}

export const GroupCreateRec7: GroupType = {
    name: "Income",
}

export const GroupCreateRec8: GroupType = {
    name: "Expense",
}

export const GroupCreateRec9: GroupType = {
    name: "Activity",
}

export const GroupCreateRec10: GroupType = {
    name: "Project",
}

export const GroupCreateRecNameConstraint: GroupType = {
    name: "Group name length greater than the model specified length",
}

export const GroupCreateActionParams: Array<GroupType> = [
    GroupCreateRec1,
    GroupCreateRec2,
    GroupCreateRec3,
    GroupCreateRec4,
    GroupCreateRec5,
    GroupCreateRec6,
    GroupCreateRec7,
    GroupCreateRec8,
    GroupCreateRec9,
    GroupCreateRec10,
]

// change Expense to Expenses
export const GroupUpdateRec1: GroupType = {
    _id : "",
    name: "Expenses",
}

// change Income to Incomes
export const GroupUpdateRec2: GroupType = {
    _id : "",
    name: "Incomes",
}

export const GroupUpdateActionParams: Array<GroupType> = [
    GroupUpdateRec1,
    GroupUpdateRec2,
]

// TODO: update and delete params, by ids / queryParams

// change Project to Projects
export const GroupUpdateRecordById: GroupType = {
    "_id" : "",
    "name": "Group Name",
}


// change Location to Locations
export const GroupUpdateRecordByParam: GroupType = {
    "name": "Locations",
}

export const UpdateGroupById = "638fd835c77947991e7f7e11"
export const UpdateGroupByIds: Array<string> = [
    "638fd835c77947991e7f7e11",
    "638fd835c77947991e7f7e12",
    "638fd835c77947991e7f7e13",
]

export const UpdateGroupByParams: QueryParamsType = {
    "logType": "Location",
}

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


// TODO: categories collection test-data


// create record(s)

export const CategoryCreateRec1: CategoryType = {
    name     : "audits",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec2: CategoryType = {
    name     : "audits",
    groupName: "TBD",
    priority : 100,
}


export const CategoryCreateRec3: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec4: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec5: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec6: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec7: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec8: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec9: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateRec10: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryCreateActionParams: Array<CategoryType> = [
    CategoryCreateRec1,
    CategoryCreateRec2,
    CategoryCreateRec3,
    CategoryCreateRec4,
    CategoryCreateRec5,
    CategoryCreateRec6,
    CategoryCreateRec7,
    CategoryCreateRec8,
    CategoryCreateRec9,
    CategoryCreateRec10,
]


export const CategoryUpdateRec1: CategoryType = {
    _id      : "638fd835c77947991e7f7e14",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryUpdateRec2: CategoryType = {
    _id      : "638fd835c77947991e7f7e15",
    name     : "",
    groupName: "TBD",
    priority : 100,
}

export const CategoryUpdateActionParams: Array<CategoryType> = [
    CategoryUpdateRec1,
    CategoryUpdateRec2,
]

// TODO: update and delete params, by ids / queryParams

export const CategoryUpdateRecordById: ActionParamType = {
    "_id" : "638fd873a02862d754fa0247",
    "name": "Category Name",
}

export const CategoryUpdateRecordByParam: ActionParamType = {
    "_id" : "638fd873a02862d754fa0248",
    "name": "Updated Category Name",
}

export const UpdateCategoryById = "638fd835c77947991e7f7e11"
export const UpdateCategoryByIds: Array<string> = [
    "638fd835c77947991e7f7e11",
    "638fd835c77947991e7f7e12",
    "638fd835c77947991e7f7e13",
]

export const UpdateCategoryByParams: QueryParamsType = {
    "logType": "read",
}

export const GetCategoryById = "638fd565c97d023503c6a0d8"
export const GetCategoryByIds = ["638fd565c97d023503c6a0d8",
    "638fd565c97d023503c6a0d9"] as Array<string>
export const GetCategoryByParams: QueryParamsType = {
    "logType": "create",
}

export const DeleteCategoryById = "638fd62cd7d613895979da27"
export const DeleteCategoryByIds: Array<string> = [
    "638fd62cd7d613895979da28",
    "638fd62cd7d613895979da29",
    "638fd62cd7d613895979da2a",
    "638fd62cd7d613895979da2b",
]

export const DeleteCategoryByParams: QueryParamsType = {
    "logType": "read",
}


