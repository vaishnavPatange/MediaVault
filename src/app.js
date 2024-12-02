import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "20kb"})); // to get json format data limit of data 20kb
app.use(express.urlencoded({extended:true, limit: "20kb"})); // to get data from urls, extended is for nested not needed in most cases
app.use(express.static("public")); // to store some files in local folder 
app.use(cookieParser()); // to perform CRUD op in cookies on user browser


export { app };