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
import Address from "../models/Address.js";
import isAdmin from "../middleware/isAdmin.js";
import User from "../models/User.js";


const router = express.Router();

/* ================= PLACE ORDER (from cart) =================
POST /api/orders
Body: { "paymentMethod": "COD" | "WALLET" | "RAZORPAY" }
*/
router.post("/", auth, async (req, res) => {
  try {
    const { paymentMethod, addressId } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ msg: "paymentMethod required" });
    }
      if (!addressId) return res.status(400).json({ msg: "addressId required" });

    // Load cart with products
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: CartItem, include: [Product] }],
    });

    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      return res.status(400).json({ msg: "Cart is empty" });
    }
        const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id, isActive: true },
    });
    if (!address) return res.status(400).json({ msg: "Invalid address" });

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
      addressId: address.id,
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
      addressId: order.addressId,
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
// ================= ADMIN: UPDATE ORDER STATUS =================
// PATCH /api/orders/admin/:id/status
// Body: { status: "PENDING"|"PAID"|"CANCELLED"|"DELIVERED" }
router.patch("/admin/:id/status", auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["PENDING", "PAID", "CANCELLED", "DELIVERED"];

    if (!status || !allowed.includes(String(status).toUpperCase())) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ msg: "Order not found" });

    const next = String(status).toUpperCase();

    // ✅ business rules
    // delivered only if paid (or COD can be delivered even if paymentStatus pending)
    if (next === "DELIVERED") {
      if (order.status === "CANCELLED") {
        return res.status(400).json({ msg: "Cancelled order cannot be delivered" });
      }
      // set deliveredOn automatically
      await order.update({ status: "DELIVERED", deliveredOn: new Date() });
    } else {
      // if switching away from DELIVERED, clear deliveredOn (optional)
      await order.update({
        status: next,
        deliveredOn: next === "DELIVERED" ? order.deliveredOn : null,
      });
    }

    return res.json({
      msg: "Status updated",
      orderId: order.id,
      status: order.status,
      deliveredOn: order.deliveredOn,
    });
  } catch (e) {
    console.error("PATCH /api/orders/admin/:id/status error:", e);
    res.status(500).json({ msg: "Failed to update status" });
  }
});

/* ================= ADMIN ORDERS =================
GET /api/orders/admin?search=...
search matches: orderId / status / user name/email/phone / product name
*/
router.get("/admin", auth, isAdmin, async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const where = {}; // admin => all orders

    // numeric search => order id
    if (search && /^\d+$/.test(search)) {
      where.id = Number(search);
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "phone", "role"],
          required: false,
        },
        {
          model: Address,
          required: false,
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              ...(search && !/^\d+$/.test(search)
                ? {
                    where: {
                      name: { [Op.like]: `%${search}%` },
                    },
                    required: false,
                  }
                : {}),
            },
          ],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    // ✅ if search is text, filter by status/user fields too
    let filtered = orders;

    if (search && !/^\d+$/.test(search)) {
      const q = search.toLowerCase();
      filtered = orders.filter((o) => {
        const status = String(o.status || "").toLowerCase();
        const uname = String(o.User?.name || "").toLowerCase();
        const uemail = String(o.User?.email || "").toLowerCase();
        const uphone = String(o.User?.phone || "").toLowerCase();

        const products = (o.OrderItems || [])
          .map((it) => it?.Product?.name || "")
          .join(" ")
          .toLowerCase();

        return (
          status.includes(q) ||
          uname.includes(q) ||
          uemail.includes(q) ||
          uphone.includes(q) ||
          products.includes(q)
        );
      });
    }

    res.json({ total: filtered.length, orders: filtered });
  } catch (e) {
    console.error("GET /api/orders/admin error:", e);
    res.status(500).json({ msg: "Failed to get admin orders" });
  }
});


/* ================= GET MY ORDERS =================
GET /api/orders
*/
router.get("/", auth, async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    // ✅ base condition: only logged-in user's orders
    const where = { userId: req.user.id };

    // ✅ allow searching by orderId or status
    if (search) {
      // if numeric -> order id search
      if (/^\d+$/.test(search)) {
        where.id = Number(search);
      } else {
        // status search (PAID / PENDING etc)
        where.status = { [Op.like]: `%${search}%` };
      }
    }

    const orders = await Order.findAll({
  where,
  include: [
    { model: Address }, // ✅ Order belongsTo Address
    {
      model: OrderItem,
      include: [
        {
          model: Product,
          ...(search && !/^\d+$/.test(search)
            ? { where: { name: { [Op.like]: `%${search}%` } }, required: false }
            : {}),
        },
      ],
    },
  ],
  order: [["createdAt", "DESC"]],
  distinct: true,
});


    res.json({ total: orders.length, orders });
  } catch (e) {
    console.error("GET /api/orders error:", e);
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
