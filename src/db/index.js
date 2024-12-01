import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async()=>{
    try {
        const connectionResponse = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log(`\n Connection Successful with ${connectionResponse}`);  
    } catch (error) {
        console.log("MongoDb connection failed", error);
        process.exit(1);
    }
}

export default connectDB;