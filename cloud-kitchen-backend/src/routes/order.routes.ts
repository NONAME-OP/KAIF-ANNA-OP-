import { Router } from "express";
import {
  createOrderController,
  verifyPaymentController,
  trackOrderController,
  getAllOrdersController,
  updateOrderStatusController,
} from "../controllers/order.controller";

const router = Router();

router.post("/", createOrderController);
router.get("/", getAllOrdersController);
router.post("/verify-payment", verifyPaymentController);
router.get("/:id/track", trackOrderController);
router.patch("/:id/status", updateOrderStatusController);

export default router;
