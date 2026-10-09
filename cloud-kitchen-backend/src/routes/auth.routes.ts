import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  signUpController,
  loginController,
  refreshTokenController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
  getMeController,
  googleLoginController,
} from "../controllers/auth.controller";

const router = Router();

router.post("/sign-up", signUpController);
router.post("/login", loginController);
router.post("/google", googleLoginController);
router.post("/refresh-token", refreshTokenController);
router.post("/logout", logoutController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);


router.get("/me", authMiddleware, getMeController);


export default router;