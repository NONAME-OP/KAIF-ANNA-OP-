import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  createProductController,
  getAllProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} from "../controllers/product.controller";

const router = Router();

// Public routes — anyone can view products
router.get("/", getAllProductsController);
router.get("/:id", getProductByIdController);

// Protected routes — only authenticated users (admins) can mutate
router.post("/", authMiddleware, createProductController);
router.put("/:id", authMiddleware, updateProductController);
router.delete("/:id", authMiddleware, deleteProductController);

export default router;