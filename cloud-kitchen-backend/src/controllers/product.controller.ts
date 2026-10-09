import { Request, Response } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../services/product.service";


export async function createProductController(
  req: Request,
  res: Response
) {
  try {
    const { name, description, price, imageUrl } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0 || numericPrice > 999999) {
      return res.status(400).json({
        message: "Price must be a valid number between 0 and 999999",
      });
    }

    if (name.length > 200) {
      return res.status(400).json({
        message: "Product name must be 200 characters or less",
      });
    }

    const product = await createProduct({
      name,
      description,
      price: numericPrice,
      imageUrl,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function getAllProductsController(
  req: Request,
  res: Response
) {
  try {
    const products = await getAllProducts();

    return res.status(200).json({
      products,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function getProductByIdController(
  req: Request,
  res: Response
) {
  try {

    const id = req.params.id as string;

    const product = await getProductById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function updateProductController(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id as string;

    const { name, description, price, imageUrl, isAvailable } = req.body;

    const product = await updateProduct(id, {
      name,
      description,
      price: price !== undefined ? Number(price) : undefined,
      imageUrl,
      isAvailable,
    });

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function deleteProductController(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id as string;

    const product = await deleteProduct(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}