import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser"

import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/user.js"
import chatRoutes from "./routes/chat.js    "
import { connectDB } from "./lib/db.js";


const app = express();
const PORT = process.env.PORT

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth",authRoutes)
app.use("/api/users",userRoutes)
app.use("/api/chat",chatRoutes)
app.listen(PORT,()=>{
    console.log(`Server is running on Port ${PORT}`);
    connectDB();
})