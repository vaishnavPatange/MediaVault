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

//routes
import userRouter from "./routes/user.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";

//user
app.use("/api/v1/user", userRouter);
//like
app.use("/api/v1/like", likeRouter);
//playlist
app.use("/api/v1/playlist", playlistRouter);
//healthcheck
app.use("/api/v1/healthcheck", healthcheckRouter);
//video
app.use("/api/v1/video", videoRouter);
//comment
app.use("/api/v1/comment", commentRouter);
//subscription
app.use("/api/v1/subscription", subscriptionRouter);

export { app };