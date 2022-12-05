/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-31
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mc-orm examples
 */

import { DataTypes, ModelDescType, BaseModel } from "../src/index.ts";

export const UserProfileModel: ModelDescType = {
    collName: "userProfiles",
    docDesc : {
        firstName : {
            fieldType  : DataTypes.STRING,
            fieldLength: 255,
        },
        middleName: {
            fieldType  : DataTypes.STRING,
            fieldLength: 255,
        },
        lastName  : {
            fieldType  : DataTypes.STRING,
            fieldLength: 255,
        },
    }
}

export const UserModel: ModelDescType = {
    collName   : "users",
    docDesc    : {
        ...BaseModel,
        _id       : DataTypes.MONGODB_ID,
        acceptTerm: DataTypes.BOOLEAN,
        isAdmin   : DataTypes.BOOLEAN,
        language  : {
            fieldType  : DataTypes.STRING,
            fieldLength: 25,
        },
        profile   : DataTypes.OBJECT,
        firstName : {
            fieldType  : DataTypes.STRING,
            fieldLength: 255,
        },
        middleName: {
            fieldType  : DataTypes.STRING,
            fieldLength: 255,
        },
        lastName  : {
            fieldType  : DataTypes.STRING,
            fieldLength: 255,
        },
    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
}
