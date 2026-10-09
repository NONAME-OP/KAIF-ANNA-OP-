import { prisma } from "../lib/prisma";

interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export async function createProduct(data: CreateProductData) {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
    },
  });

  return product;
}

export async function getAllProducts() {
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return products;
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  return product;
}

interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isAvailable?: boolean;
}

export async function updateProduct(
  id: string,
  data: UpdateProductData
) {
  const product = await prisma.product.update({
    where: {
      id,
    },
    data,
  });

  return product;
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!product) {
    return null;
  }

  await prisma.product.delete({
    where: {
      id,
    },
  });

  return product;
}

