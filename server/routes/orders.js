// ========================= routes/orders.js (FULL CODE) =========================
import express from "express";
import auth from "../middleware/auth.js";

import { Op } from "sequelize";

import Cart from "../models/Cart.js";
import CartItem from "../models/CartItem.js";
import Product from "../models/Product.js";

import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";

import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

import DeliveryCharge from "../models/DeliveryCharge.js";

const router = express.Router();

/* ================= PLACE ORDER (from cart) =================
POST /api/orders
Body: { "paymentMethod": "COD" | "WALLET" | "RAZORPAY" }
*/
router.post("/", auth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ msg: "paymentMethod required" });
    }

    // Load cart with products
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: CartItem, include: [Product] }],
    });

    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      return res.status(400).json({ msg: "Cart is empty" });
    }

    // Stock validation + total (billAmount)
    let billAmount = 0;

    for (const item of cart.CartItems) {
      const p = item.Product;

      if (!p || !p.isActive) {
        return res.status(400).json({ msg: "Invalid product in cart" });
      }

      if (p.stockQty < item.qty) {
        return res.status(400).json({
          msg: `${p.name} out of stock. Available: ${p.stockQty}`,
        });
      }

      billAmount += item.qty * Number(p.price);
    }

    // ================= DELIVERY CHARGE (DB slabs) =================
    const slab = await DeliveryCharge.findOne({
      where: {
        isActive: true,
        minAmount: { [Op.lte]: billAmount },
        [Op.or]: [
          { maxAmount: { [Op.gte]: billAmount } },
          { maxAmount: null },
        ],
      },
      order: [["minAmount", "DESC"]],
    });

    const deliveryCharge = slab ? Number(slab.charge) : 0;
    const grandTotal = Number(billAmount) + Number(deliveryCharge);

    // ✅ WALLET: check balance BEFORE creating order
    let wallet = null;
    if (paymentMethod === "WALLET") {
      wallet = await Wallet.findOne({ where: { userId: req.user.id } });
      if (!wallet) wallet = await Wallet.create({ userId: req.user.id });

      if (Number(wallet.balance) < Number(grandTotal)) {
        return res.status(400).json({ msg: "Insufficient wallet balance" });
      }
    }

    // Create order (totalAmount = grandTotal)
    const order = await Order.create({
      userId: req.user.id,
      totalAmount: grandTotal,
      deliveryCharge: deliveryCharge,
      paymentMethod,
      status: "PENDING",
      paymentStatus: paymentMethod === "COD" ? "PENDING" : "PENDING",
    });

    // Create order items + reduce stock
    for (const item of cart.CartItems) {
      const p = item.Product;

      await OrderItem.create({
        orderId: order.id,
        productId: p.id,
        price: p.price, // snapshot
        qty: item.qty,
      });

      await p.update({ stockQty: p.stockQty - item.qty });
    }

    // ✅ WALLET: deduct + transaction + mark order paid
    if (paymentMethod === "WALLET") {
      wallet.balance = Number(wallet.balance) - Number(grandTotal);
      await wallet.save();

      await WalletTransaction.create({
        walletId: wallet.id,
        type: "DEBIT",
        amount: grandTotal, // ✅ includes delivery charge
        reason: "ORDER_PAYMENT",
        orderId: order.id,
      });

      await order.update({
        status: "PAID",
        paymentStatus: "SUCCESS",
      });
    }

    // Clear cart
    await CartItem.destroy({ where: { cartId: cart.id } });

    return res.status(201).json({
      msg: "Order placed",
      orderId: order.id,
      billAmount,
      deliveryCharge,
      grandTotal,
      paymentMethod,
      walletBalance: paymentMethod === "WALLET" ? wallet.balance : undefined,
    });
  } catch (e) {
    console.error("ORDER ERROR =>", e);
    return res.status(500).json({ msg: "Order failed", err: e.message });
  }
});

/* ================= GET MY ORDERS =================
GET /api/orders
*/
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ model: OrderItem, include: [Product] }],
      order: [["createdAt", "DESC"]],
    });

    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Failed to get orders" });
  }
});

/* ================= GET SINGLE ORDER =================
GET /api/orders/:id
*/
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: OrderItem, include: [Product] }],
    });

    if (!order) return res.status(404).json({ msg: "Order not found" });
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Failed to get order" });
  }
});

export default router;
