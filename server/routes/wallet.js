import express from "express";
import auth from "../middleware/auth.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

const router = express.Router();

/* ================= GET WALLET =================
GET /api/wallet
*/
router.get("/", auth, async (req, res) => {
  let wallet = await Wallet.findOne({ where: { userId: req.user.id } });

  if (!wallet) {
    wallet = await Wallet.create({ userId: req.user.id });
  }

  res.json(wallet);
});

/* ================= WALLET TOPUP =================
POST /api/wallet/topup
Body: { amount }
*/
router.post("/topup", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (Number(amount) <= 0)
      return res.status(400).json({ msg: "Invalid amount" });

    let wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    if (!wallet) wallet = await Wallet.create({ userId: req.user.id });

    wallet.balance = Number(wallet.balance) + Number(amount);
    await wallet.save();

    await WalletTransaction.create({
      walletId: wallet.id,
      type: "CREDIT",
      amount,
      reason: "TOPUP",
    });

    res.json({
      msg: "Wallet topped up",
      balance: wallet.balance,
    });
  } catch (e) {
    res.status(500).json({ msg: "Topup failed" });
  }
});

/* ================= WALLET TRANSACTIONS =================
GET /api/wallet/transactions
*/
router.get("/transactions", auth, async (req, res) => {
  const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
  if (!wallet) return res.json([]);

  const txns = await WalletTransaction.findAll({
    where: { walletId: wallet.id },
    order: [["createdAt", "DESC"]],
  });

  res.json(txns);
});

/* ================= WALLET SUMMARY (OPTIONAL) =================
GET /api/wallet/summary
*/
router.get("/summary", auth, async (req, res) => {
  let wallet = await Wallet.findOne({ where: { userId: req.user.id } });
  if (!wallet) wallet = await Wallet.create({ userId: req.user.id });

  const txns = await WalletTransaction.findAll({
    where: { walletId: wallet.id },
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  res.json({
    balance: wallet.balance,
    transactions: txns,
  });
});

export default router;
