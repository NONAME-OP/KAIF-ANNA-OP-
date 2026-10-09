import { Request, Response } from "express";

export interface CouponData {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FLAT" | "FREE_DELIVERY";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
}

// In-memory / dynamic coupon registry (can be extended by Admin)
export let activeCoupons: CouponData[] = [
  {
    code: "FEAST50",
    description: "50% OFF up to ₹150 on your royal meal",
    discountType: "PERCENTAGE",
    discountValue: 50,
    minOrderAmount: 299,
    maxDiscount: 150,
  },
  {
    code: "KAIF100",
    description: "Flat ₹100 OFF on orders above ₹499",
    discountType: "FLAT",
    discountValue: 100,
    minOrderAmount: 499,
  },
  {
    code: "FREEDEL",
    description: "100% Free Satellite Express Delivery",
    discountType: "FREE_DELIVERY",
    discountValue: 0,
    minOrderAmount: 0,
  },
  {
    code: "SWIGGY60",
    description: "60% OFF up to ₹120 on gourmet tastings",
    discountType: "PERCENTAGE",
    discountValue: 60,
    minOrderAmount: 199,
    maxDiscount: 120,
  },
  {
    code: "ROYAL20",
    description: "20% OFF up to ₹250 for Club Patrons",
    discountType: "PERCENTAGE",
    discountValue: 20,
    minOrderAmount: 399,
    maxDiscount: 250,
  },
];

export async function getCouponsController(req: Request, res: Response) {
  res.json({ coupons: activeCoupons });
}

export async function validateCouponController(req: Request, res: Response) {
  try {
    const { code, subtotal, deliveryFee } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const orderSubtotal = Number(subtotal) || 0;
    const fee = Number(deliveryFee) || 0;

    const coupon = activeCoupons.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase()
    );

    if (!coupon) {
      return res.status(404).json({ message: `Coupon '${code}' is invalid or expired` });
    }

    if (orderSubtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Min. order amount of ₹${coupon.minOrderAmount} required for coupon '${coupon.code}'. Add ₹${coupon.minOrderAmount - orderSubtotal} more!`,
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (orderSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "FLAT") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "FREE_DELIVERY") {
      discountAmount = fee;
    }

    discountAmount = Math.round(discountAmount);

    res.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountAmount,
      message: `🎉 Coupon '${coupon.code}' applied! You saved ₹${discountAmount}.`,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to validate coupon" });
  }
}

export async function createCouponController(req: Request, res: Response) {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscount } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: "Code, discountType, and discountValue are required" });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = activeCoupons.find((c) => c.code === cleanCode);
    if (existing) {
      return res.status(409).json({ message: `Coupon '${cleanCode}' already exists` });
    }

    const newCoupon: CouponData = {
      code: cleanCode,
      description: description || `${discountValue} discount`,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
    };

    activeCoupons.unshift(newCoupon);
    res.status(201).json({ message: `Coupon '${cleanCode}' created successfully`, coupon: newCoupon });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create coupon" });
  }
}
