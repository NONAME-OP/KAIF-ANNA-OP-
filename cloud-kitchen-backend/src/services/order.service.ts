import { prisma } from "../lib/prisma";

export interface CreateOrderItemInput {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  distanceKm: number;
  deliveryFee: number;
  discountAmount?: number;
  couponCode?: string;
  items: CreateOrderItemInput[];
}

export async function createOrder(data: CreateOrderInput) {
  const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Number(data.discountAmount) || 0;
  const totalAmount = Math.max(0, subtotal - discount + data.deliveryFee);
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      deliveryLat: data.deliveryLat,
      deliveryLng: data.deliveryLng,
      distanceKm: data.distanceKm,
      subtotal,
      deliveryFee: data.deliveryFee,
      totalAmount,
      paymentStatus: "PENDING",
      paymentMethod: "UPI",
      orderStatus: "PREPARING",
      driverName: "Aakash Sharma",
      driverPhone: "+919876543210",
      driverVehicle: "MH 02 CP 4921",
      driverLat: 19.0596, // Initially at Kitchen HQ
      driverLng: 72.8295,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  return order;
}

export async function verifyOrderPayment(orderId: string, transactionId: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      transactionId: transactionId || `UPI-${Date.now()}`,
      orderStatus: "HANDI_SEALED",
    },
    include: {
      items: true,
    },
  });

  return order;
}

export async function getOrderTracking(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

export async function getAllOrders() {
  return await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });
}

export async function updateOrderStatus(orderId: string, status: string) {
  return await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: status },
    include: { items: true },
  });
}
