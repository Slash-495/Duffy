import express from "express";
import { login, logout, signup, onboard, getMe } from "../controller/auth.js";
import { protectRoute } from "../middleware/auth.js"
const router = express.Router();

router.post("/signup",signup)
router.post("/login",login)                 //post methods are for the operations that change the server state
router.post("/logout",logout)

router.post("/onboarding",protectRoute,onboard)

//check if the user is logged in 
router.get("/me",protectRoute, getMe)

export default router;