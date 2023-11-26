import { newDbMongo } from "../src/index.ts";
import { GridFSBucket, } from "https://deno.land/x/mongo@v0.31.1/src/gridfs/bucket.ts";
import { appDb, auditDb, dbOptions } from "./config/secure/config.ts";
import { ObjectId } from "../deps.ts";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();

    // Upload
    const bucket = new GridFSBucket(appDbHandle);
    const upstream = await bucket.openUploadStream("test.txt");

    const writer = upstream.getWriter();
    const fileContents = await Deno.readFile("test.txt");
    await writer.write(fileContents);

    await writer.close();

    // query
    let docId: ObjectId = new ObjectId();
    await bucket.find({}).limit(1).forEach((doc) => {
        docId = doc._id;
        console.log(doc)
    })

    // Download
    if (docId.toString()) {
        // const fileId = new ObjectId("abokosdnsudslfhswkfj");
        const file = await new Response(await bucket.openDownloadStream(docId)).text();
        console.log("file: ", file);
    }

})();