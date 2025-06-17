import express from "express";
import { login, logout, signup, onboard } from "../controller/auth.js";
import { protectRoute } from "../middleware/auth.js"
const router = express.Router();

router.post("/signup",signup)
router.post("/login",login)                 //post methods are for the operations that change the server state
router.post("/logout",logout)

router.post("/onboarding",protectRoute,onboard)

//add forget password
//add reset passsword


//check if the user is logged in 
router.get("/me",protectRoute, (req,res)=>{
    res.status(200).json({success: true, user: req.user}); 
})

export default router;