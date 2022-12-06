/**
 * @Author: abbeymart | Abi Akindele | @Created: 2021-06-12
 * @Company: Copyright 2021 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: module/package description
 */

import {ConnectOptions} from "../../deps.ts"

export interface DbSecureType {
    secureAccess: boolean;
    secureCert?: string;
    secureKey?: string;
}

// ConnectOptions
//   compression?: string[];
//   certFile?: string;
//   keyFile?: string;
//   keyFilePassword?: string;
//   tls?: boolean;
//   safe?: boolean;
//   credential?: Credential;
//   db: string;
//   servers: Server[];
//   retryWrites?: boolean;
//   appname?: string;

export interface DbOptionsType extends ConnectOptions {
    checkAccess?: boolean;
    poolSize?: number;
    replicaSet?: string;
    reconnectTries?: number;
    reconnectInterval?: number;
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
}

export interface DbParamsType {
    dbType?: string;
    host?: string;
    username?: string;
    password?: string;
    database?: string;
    filename?: string;
    location?: string;      // => URI
    port?: number | string;
    poolSize?: number;
    secureOption?: DbSecureType;
    uri?: string;
    timezone?: string;
    replicaName?: string;
    replicas?: Replicas;
}

export interface Replica {
    port?: number;
    host?: string;
    hostUrl: string;   // "host":"port"
    role: "Primary" | "Secondary";
}

export type Replicas = Array<Replica>

// default replicas - development / localhost
export const defaultReplicas: Replicas = [
    {
        hostUrl: "localhost:27017",
        role   : "Primary",
    },
    {
        hostUrl: "localhost:27018",
        role   : "Secondary",
    },
    {
        hostUrl: "localhost:27019",
        role   : "Secondary",
    }
]
