/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-17, @Updated: 2022-12-05 (Deno)
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mcdbcrud-mg db-server-connect & db-handle for mongoDB
 */

import { Database, MongoClient } from "../../deps.ts";
import { DbSecureType, DbOptionsType, DbParamsType, Replicas, } from "./types.ts";

export class DbMongo {
    private readonly host: string;
    private readonly username: string;
    private readonly password: string;
    private readonly database: string;
    private readonly location: string;
    private readonly port: number;
    private readonly minPoolSize: number;
    private readonly secureOption: DbSecureType;
    private readonly serverUrl: string;
    private readonly dbUrl: string;
    private readonly dbConnectOptions: DbOptionsType;
    private readonly checkAccess: boolean;
    private readonly user: string;
    private readonly pass: string;
    private dbConnect?: MongoClient;
    private readonly replicaName: string
    private readonly replicas: Replicas;

    constructor(dbConfig: DbParamsType, options?: DbOptionsType) {
        this.host = dbConfig?.host || "";
        this.username = dbConfig?.username || "";
        this.password = dbConfig?.password || "";
        this.database = dbConfig?.database || "";
        this.location = dbConfig?.location || "";
        this.port = Number(dbConfig?.port) || Number.NEGATIVE_INFINITY;
        this.minPoolSize = dbConfig?.poolSize || 20;
        this.secureOption = dbConfig?.secureOption || {secureAccess: false, secureCert: "", secureKey: ""};
        this.checkAccess = options?.checkAccess !== false;
        this.user = encodeURIComponent(this.username);
        this.pass = encodeURIComponent(this.password);
        this.replicas = dbConfig.replicas || [];
        this.replicaName = dbConfig.replicaName || "";
        // set default dbUrl and serverUrl - standard standalone DB | TODO: optional, review replica-params
        this.dbUrl = this.checkAccess ?
            `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?directConnection=true` :
            `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?directConnection=true`;
        this.serverUrl = this.checkAccess ?
            `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}?directConnection=true` :
            `mongodb://${dbConfig.host}:${dbConfig.port}?directConnection=true`;
        // For replica set, include the replica set hostUrl/name and a seedlist of the members in the URI string
        if (this.replicas.length > 0 && this.replicaName !== "") {
            // check and set access
            if (this.checkAccess) {
                // this.dbUrl = `mongodb://${this.user}:${this.pass}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database},`
                this.dbUrl = `mongodb://`
                this.serverUrl = `mongodb://`
                // compute the replica-uris
                let repCount = 0;
                const repLength = this.replicas.length
                for (const rep of this.replicas) {
                    repCount += 1
                    this.dbUrl = `${this.dbUrl}${this.user}:${this.pass}@${rep.hostUrl}/${dbConfig.database}`
                    this.serverUrl = `${this.serverUrl}${this.user}:${this.pass}@${rep.hostUrl}`
                    if (repCount < repLength) {
                        this.dbUrl = `${this.dbUrl},`
                        this.serverUrl = `${this.serverUrl},`
                    }
                }
                // include the replicaSet name
                this.dbUrl = `${this.dbUrl}/?replicaSet=${this.replicaName}?directConnection=true`
                this.serverUrl = `${this.serverUrl}/?replicaSet=${this.replicaName}?directConnection=true`
            } else {
                // this.dbUrl = `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database},`
                this.dbUrl = `mongodb://`
                this.serverUrl = `mongodb://`
                // compute the replica-uris
                let repCount = 0;
                const repLength = this.replicas.length
                for (const rep of this.replicas) {
                    repCount += 1
                    this.dbUrl = `${this.dbUrl}${rep.hostUrl}/${dbConfig.database}`
                    this.serverUrl = `${this.serverUrl}${rep.hostUrl}`
                    if (repCount < repLength) {
                        this.dbUrl = `${this.dbUrl},`
                        this.serverUrl = `${this.serverUrl},`
                    }
                }
                // include the replicaSet name
                this.dbUrl = `${this.dbUrl}/?replicaSet=${this.replicaName}?directConnection=true`
                this.serverUrl = `${this.serverUrl}/?replicaSet=${this.replicaName}?directConnection=true`
            }
        }
        // environment variables / defaults
        const dbenv = Deno.env.get("NODE_ENV") || "development";
        if (dbenv === "production" && Deno.env.get("MONGODB_URI")) {
            this.serverUrl = Deno.env.get("MONGODB_URI") || this.serverUrl;
            this.dbUrl = Deno.env.get("MONGODB_URI") || this.dbUrl;
        }
        // db-connection-params
        this.dbConnectOptions = {
            db        : this.database,
            tls       : this.secureOption.secureAccess,
            servers   : [
                {
                    host: this.host,
                    port: this.port,
                },
            ],
            credential: {
                username : this.username,
                password : this.password,
                db       : this.database,
                mechanism: "SCRAM-SHA-256",
            },
            replicaSet: this.replicaName
            // minPoolSize: this.minPoolSize,
            // maxPoolSize: this.minPoolSize * 6,
        };
    }

    get dbUri(): string {
        return this.dbUrl;
    }

    get serverUri(): string {
        return this.serverUrl;
    }

    async openDb(): Promise<Database> {
        try {
            return await this.dbHandle();
        } catch (e) {
            throw new Error("MongoDB opening error:" + e.message);
        }
    }

    async closeDb() {
        await this.dbConnect?.close();
    }

    // mgServer returns the mongo-client connection to the mongo-server
    async mgServer(): Promise<MongoClient> {
        try {
            // connect to the server - db-connection
            this.dbConnect = new MongoClient();
            await this.dbConnect.connect(this.dbConnectOptions);
            return this.dbConnect;
        } catch (err) {
            this.dbConnect?.close();
            console.error("MongoDB connection error:" + err.stack);
            throw new Error("Error opening/creating a mongo database handle | " + err.message);
        }
    }

    // dbHandle returns the mongo-database handle to the specified mongo database
    async dbHandle(dbName = this.database): Promise<Database> {
        try {
            // connect to the server - db-connection
            this.dbConnect = new MongoClient();
            await this.dbConnect.connect(this.dbConnectOptions);
            // db-handle
            return this.dbConnect.database(dbName);
        } catch (err) {
            this.dbConnect?.close();
            console.error("MongoDB connection error:" + err.stack);
            throw new Error("Error opening/creating a mongo database handle | " + err.message);
        }
    }
}

export function newDbMongo(dbConfig: DbParamsType, options?: DbOptionsType) {
    return new DbMongo(dbConfig, options);
}
