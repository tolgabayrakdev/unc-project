import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import "dotenv/config";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));


server.listen(process.env.SERVER_PORT || 1234, () => {
    console.log(`Server running on port ${process.env.SERVER_PORT || 1234}`);
});

