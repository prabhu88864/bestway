// routes/withdrawals.js
import express from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

const toUpper = (v) => String(v || "").trim().toUpperCase();
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// ===============================
// POST /api/withdrawals
// Body: { amount, payoutMethod: "BANK"|"UPI" }
// ===============================
router.post("/", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;

    const amount = toNum(req.body.amount);
    const payoutMethod = toUpper(req.body.payoutMethod); // BANK / UPI

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error("Invalid withdrawal amount");
    }

    if (!["BANK", "UPI"].includes(payoutMethod)) {
      throw new Error("payoutMethod must be BANK or UPI");
    }

    // Get user details
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new Error("User not found");

    // Validate details based on method
    if (payoutMethod === "BANK") {
      if (!user.bankAccountNumber || !user.ifscCode || !user.accountHolderName) {
        throw new Error("Bank details missing. Please add bankAccountNumber, ifscCode, accountHolderName");
      }
    }

    if (payoutMethod === "UPI") {
      if (!user.upiId) {
        throw new Error("UPI ID missing. Please add upiId in profile");
      }
    }

    // Get wallet (lock row)
    const wallet = await Wallet.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) throw new Error("Wallet not found");

    // Check sufficient balance
    if (Number(wallet.balance) < Number(amount)) {
      throw new Error("Insufficient balance");
    }

    // Deduct from balance, move to lockedBalance
    const newBal = Number(wallet.balance) - Number(amount);
    const newLocked = Number(wallet.lockedBalance || 0) + Number(amount);

    wallet.balance = newBal;
    wallet.lockedBalance = newLocked;
    wallet.totalBalance = Number(newBal) + Number(newLocked);
    await wallet.save({ transaction: t });

    // prepare payout details
    const bankDetails =
      payoutMethod === "BANK"
        ? {
            bankAccountNumber: user.bankAccountNumber,
            ifscCode: user.ifscCode,
            accountHolderName: user.accountHolderName,
            panNumber: user.panNumber || null,
          }
        : null;

    const upiId = payoutMethod === "UPI" ? user.upiId : null;

    // Create withdrawal transaction
    const transaction = await WalletTransaction.create(
      {
        walletId: wallet.id,
        type: "DEBIT",
        amount,
        reason: "WITHDRAWAL_REQUEST",
        status: "PENDING",

        // ✅ NEW
        payoutMethod, // BANK / UPI
        bankDetails, // JSON or null
        upiId, // string or null

        meta: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
        },
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      msg: "Withdrawal request created successfully",
      withdrawal: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        payoutMethod: transaction.payoutMethod,
        bankDetails: transaction.bankDetails || null,
        upiId: transaction.upiId || null,
        createdAt: transaction.createdAt,
      },
      wallet: {
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        totalBalance: wallet.totalBalance,
      },
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ msg: err.message });
  }
});

// ===============================
// GET /api/withdrawals/my-requests
// ===============================
router.get("/my-requests", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) return res.status(404).json({ msg: "Wallet not found" });

    const where = {
      walletId: wallet.id,
      reason: { [Op.in]: ["WITHDRAWAL_REQUEST", "WITHDRAWAL_REFUND"] },
    };

    if (status) where.status = toUpper(status);

    const rows = await WalletTransaction.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      total: rows.length,
      withdrawals: rows,
    });
  } catch (err) {
    console.error("GET /api/withdrawals/my-requests error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});


// ===============================
// GET /api/withdrawals/:id
// ===============================
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) return res.status(404).json({ msg: "Wallet not found" });

    const transaction = await WalletTransaction.findOne({
      where: {
        id,
        walletId: wallet.id,
        reason: { [Op.in]: ["WITHDRAWAL_REQUEST", "WITHDRAWAL_REFUND"] },
      },
    });

    if (!transaction) return res.status(404).json({ msg: "Withdrawal request not found" });

    return res.json({ withdrawal: transaction });
  } catch (err) {
    console.error("GET /api/withdrawals/:id error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// ===============================
// GET /api/withdrawals  (Admin)
// ===============================
router.get("/", auth,  async (req, res) => {
  try {
    const { status } = req.query;

    const where = { reason: "WITHDRAWAL_REQUEST" };
    if (status) where.status = toUpper(status);

    const rows = await WalletTransaction.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Wallet,
          as: "wallet",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userID", "name", "email", "phone"],
            },
          ],
        },
      ],
    });

    return res.json({
      total: rows.length,
      withdrawals: rows,
    });
  } catch (err) {
    console.error("GET /api/withdrawals error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});


// ===============================
// PUT /api/withdrawals/:id/action  (Admin)
// Body:
//   {
//     "action": "APPROVE" | "REJECT",
//     "transactionId": "optional (only for APPROVE)",
//     "adminNote": "optional for APPROVE, required for REJECT"
//   }
// ===============================
router.put("/:id/action", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const action = String(req.body.action || "").trim().toUpperCase();
    const transactionId = req.body.transactionId || null;
    const adminNote = (req.body.adminNote || "").trim();

    if (!["APPROVE", "REJECT"].includes(action)) {
      throw new Error("action must be APPROVE or REJECT");
    }

    if (action === "REJECT" && !adminNote) {
      throw new Error("adminNote is required for REJECT");
    }

    const txn = await WalletTransaction.findOne({
      where: { id, reason: "WITHDRAWAL_REQUEST", status: "PENDING" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!txn) throw new Error("Withdrawal request not found or already processed");

    const wallet = await Wallet.findByPk(txn.walletId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) throw new Error("Wallet not found");

    if (action === "APPROVE") {
      // money withdrawn => remove from lockedBalance
      wallet.lockedBalance = Number(wallet.lockedBalance) - Number(txn.amount);
      wallet.totalBalance = Number(wallet.balance) + Number(wallet.lockedBalance);
      await wallet.save({ transaction: t });

      txn.status = "APPROVED";
      txn.transactionId = transactionId;
      txn.adminNote = adminNote || null;
      txn.processedBy = adminId;
      txn.processedAt = new Date();
      await txn.save({ transaction: t });

      await t.commit();
      return res.json({ msg: "Withdrawal approved successfully", withdrawal: txn });
    }

    // action === "REJECT"
    // Refund: locked -> available
    wallet.balance = Number(wallet.balance) + Number(txn.amount);
    wallet.lockedBalance = Number(wallet.lockedBalance) - Number(txn.amount);
    wallet.totalBalance = Number(wallet.balance) + Number(wallet.lockedBalance);
    await wallet.save({ transaction: t });

    txn.status = "REJECTED";
    txn.adminNote = adminNote;
    txn.processedBy = adminId;
    txn.processedAt = new Date();
    await txn.save({ transaction: t });

    // Create refund txn
    await WalletTransaction.create(
      {
        walletId: wallet.id,
        type: "CREDIT",
        amount: txn.amount,
        reason: "WITHDRAWAL_REFUND",
        status: "APPROVED",
        meta: {
          originalWithdrawalId: txn.id,
          refundReason: adminNote,
          processedBy: adminId,
        },
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({ msg: "Withdrawal rejected and amount refunded", withdrawal: txn });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ msg: err.message });
  }
});




export default router;
