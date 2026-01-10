import express from "express";
import auth from "../middleware/auth.js";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";

const router = express.Router();

/**
 * ✅ USER: list my payments
 * GET /api/payments
 */
router.get("/", auth, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user.id },
      include: [{ model: Order }],
      order: [["id", "DESC"]],
    });
    res.json(payments);
  } catch (e) {
    res.status(500).json({ msg: "Failed to load payments" });
  }
});

/**
 * ✅ USER: payments for one order
 * GET /api/payments/order/:orderId
 */
router.get("/order/:orderId", auth, async (req, res) => {
  try {
    const rows = await Payment.findAll({
      where: { userId: req.user.id, orderId: req.params.orderId },
      order: [["id", "DESC"]],
    });
    res.json(rows);
  } catch {
    res.status(500).json({ msg: "Failed to load payments for order" });
  }
});

export default router;
