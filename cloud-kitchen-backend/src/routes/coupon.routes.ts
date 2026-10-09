import { Router } from "express";
import {
  getCouponsController,
  validateCouponController,
  createCouponController,
} from "../controllers/coupon.controller";

const router = Router();

router.get("/", getCouponsController);
router.post("/validate", validateCouponController);
router.post("/", createCouponController);

export default router;
