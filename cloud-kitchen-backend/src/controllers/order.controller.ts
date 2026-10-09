import { Request, Response } from "express";
import {
  createOrder,
  verifyOrderPayment,
  getOrderTracking,
  getAllOrders,
  updateOrderStatus,
} from "../services/order.service";

export async function createOrderController(req: Request, res: Response) {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      deliveryLat,
      deliveryLng,
      distanceKm,
      deliveryFee,
      discountAmount,
      couponCode,
      items,
    } = req.body;

    if (!customerAddress || !items || !items.length) {
      return res.status(400).json({ message: "Address and items are required" });
    }

    const order = await createOrder({
      customerName: customerName || "Guest Gourmet",
      customerPhone: customerPhone || "+919876543210",
      customerAddress,
      deliveryLat: Number(deliveryLat) || 19.0645,
      deliveryLng: Number(deliveryLng) || 72.8335,
      distanceKm: Number(distanceKm) || 2.0,
      deliveryFee: Number(deliveryFee) || 0,
      discountAmount: Number(discountAmount) || 0,
      couponCode,
      items,
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create order" });
  }
}

export async function verifyPaymentController(req: Request, res: Response) {
  try {
    const { orderId, transactionId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await verifyOrderPayment(orderId, transactionId);

    // Build the automated WhatsApp reply message
    const itemsList = order.items.map((i) => `• ${i.quantity}x ${i.name} (₹${i.price})`).join("\n");
    const trackingUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/?track=${order.id}`;

    const whatsappMessage = 
`*KAIF'S CLOUD KITCHEN — ORDER CONFIRMED!* 🍲⚡
━━━━━━━━━━━━━━━━━━━━
Namaste ${order.customerName},

Your payment of *₹${order.totalAmount}* has been verified & received!

*Order Number:* #${order.orderNumber}
*Payment Status:* ✅ PAID (UPI Ref: ${order.transactionId})

*Your Feast:*
${itemsList}

*Delivery Address:*
📍 ${order.customerAddress}

*🛵 Real-Time Live GPS Rider Tracking:*
${trackingUrl}

Our kitchen has sealed your handi at 140°C. Delivery rider ${order.driverName} is on the way!`;

    const encodedMsg = encodeURIComponent(whatsappMessage);
    const cleanPhone = (order.customerPhone || "").replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone || "919876543210"}?text=${encodedMsg}`;

    res.json({
      message: "Payment verified successfully",
      order,
      whatsapp: {
        message: whatsappMessage,
        url: whatsappUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to verify payment" });
  }
}

export async function trackOrderController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const order = await getOrderTracking(id);
    res.json({ order });
  } catch (error: any) {
    res.status(404).json({ message: error.message || "Order tracking not found" });
  }
}

export async function getAllOrdersController(req: Request, res: Response) {
  try {
    const orders = await getAllOrders();
    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
}

export async function updateOrderStatusController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const order = await updateOrderStatus(id, status);
    res.json({ message: `Order status updated to ${status}`, order });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update order status" });
  }
}
