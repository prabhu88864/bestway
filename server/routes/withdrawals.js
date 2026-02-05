import express from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

/**
 * POST /api/withdrawals
 * User creates withdrawal request
 * Body: { amount }
 */
router.post("/", auth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            throw new Error("Invalid withdrawal amount");
        }

        // Get user details
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) throw new Error("User not found");

        // Validate user has bank details
        if (!user.bankAccountNumber && !user.upiId) {
            throw new Error("Please add bank details or UPI ID to your profile before requesting withdrawal");
        }

        // Get wallet
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

        // Deduct from balance
        wallet.balance = Number(wallet.balance) - Number(amount);
        wallet.lockedBalance = Number(wallet.lockedBalance || 0) + Number(amount);
        wallet.totalBalance = Number(wallet.balance) + Number(wallet.lockedBalance);
        await wallet.save({ transaction: t });

        // Create withdrawal transaction
        const transaction = await WalletTransaction.create(
            {
                walletId: wallet.id,
                type: "DEBIT",
                amount,
                reason: "WITHDRAWAL_REQUEST",
                status: "PENDING",
                bankDetails: {
                    bankAccountNumber: user.bankAccountNumber,
                    ifscCode: user.ifscCode,
                    accountHolderName: user.accountHolderName,
                    panNumber: user.panNumber,
                    upiId: user.upiId,
                },
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
                bankDetails: transaction.bankDetails,
                createdAt: transaction.createdAt,
            },
        });
    } catch (err) {
        await t.rollback();
        return res.status(400).json({ msg: err.message });
    }
});

/**
 * GET /api/withdrawals/my-requests
 * User views their withdrawal requests
 */
router.get("/my-requests", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 10 } = req.query;

        // Get user's wallet
        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) return res.status(404).json({ msg: "Wallet not found" });

        const where = {
            walletId: wallet.id,
            reason: {
                [Op.in]: ["WITHDRAWAL_REQUEST", "WITHDRAWAL_REFUND"],
            },
        };

        if (status) {
            where.status = status.toUpperCase();
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await WalletTransaction.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        return res.json({
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            withdrawals: rows,
        });
    } catch (err) {
        console.error("GET /api/withdrawals/my-requests error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
});

/**
 * GET /api/withdrawals/:id
 * User views specific withdrawal request
 */
router.get("/:id", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Get user's wallet
        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) return res.status(404).json({ msg: "Wallet not found" });

        const transaction = await WalletTransaction.findOne({
            where: {
                id,
                walletId: wallet.id,
                reason: {
                    [Op.in]: ["WITHDRAWAL_REQUEST", "WITHDRAWAL_REFUND"],
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ msg: "Withdrawal request not found" });
        }

        return res.json({ withdrawal: transaction });
    } catch (err) {
        console.error("GET /api/withdrawals/:id error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
});

/**
 * GET /api/withdrawals
 * Admin views all withdrawal requests
 */
router.get("/", auth, isAdmin, async (req, res) => {
    try {
        const { status, userId, page = 1, limit = 10 } = req.query;

        const where = {
            reason: "WITHDRAWAL_REQUEST",
        };

        if (status) {
            where.status = status.toUpperCase();
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await WalletTransaction.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset: parseInt(offset),
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
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            withdrawals: rows,
        });
    } catch (err) {
        console.error("GET /api/withdrawals error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
});

/**
 * PUT /api/withdrawals/:id/approve
 * Admin approves withdrawal request
 * Body: { transactionId?, adminNote? }
 */
router.put("/:id/approve", auth, isAdmin, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { transactionId, adminNote } = req.body;
        const adminId = req.user.id;

        const transaction = await WalletTransaction.findOne({
            where: {
                id,
                reason: "WITHDRAWAL_REQUEST",
                status: "PENDING",
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!transaction) {
            throw new Error("Withdrawal request not found or already processed");
        }

        // Get wallet to update lockedBalance
        const wallet = await Wallet.findByPk(transaction.walletId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!wallet) throw new Error("Wallet not found");

        // Remove from locked balance (money is now withdrawn)
        wallet.lockedBalance = Number(wallet.lockedBalance) - Number(transaction.amount);
        wallet.totalBalance = Number(wallet.balance) + Number(wallet.lockedBalance);
        await wallet.save({ transaction: t });

        // Update transaction
        transaction.status = "APPROVED";
        transaction.transactionId = transactionId || null;
        transaction.adminNote = adminNote || null;
        transaction.processedBy = adminId;
        transaction.processedAt = new Date();
        await transaction.save({ transaction: t });

        await t.commit();

        return res.json({
            msg: "Withdrawal approved successfully",
            withdrawal: transaction,
        });
    } catch (err) {
        await t.rollback();
        return res.status(400).json({ msg: err.message });
    }
});

/**
 * PUT /api/withdrawals/:id/reject
 * Admin rejects withdrawal request
 * Body: { adminNote }
 */
router.put("/:id/reject", auth, isAdmin, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { adminNote } = req.body;
        const adminId = req.user.id;

        if (!adminNote) {
            throw new Error("Admin note is required for rejection");
        }

        const transaction = await WalletTransaction.findOne({
            where: {
                id,
                reason: "WITHDRAWAL_REQUEST",
                status: "PENDING",
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!transaction) {
            throw new Error("Withdrawal request not found or already processed");
        }

        // Get wallet
        const wallet = await Wallet.findByPk(transaction.walletId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!wallet) throw new Error("Wallet not found");

        // Refund: move from locked back to available balance
        wallet.balance = Number(wallet.balance) + Number(transaction.amount);
        wallet.lockedBalance = Number(wallet.lockedBalance) - Number(transaction.amount);
        wallet.totalBalance = Number(wallet.balance) + Number(wallet.lockedBalance);
        await wallet.save({ transaction: t });

        // Update original transaction
        transaction.status = "REJECTED";
        transaction.adminNote = adminNote;
        transaction.processedBy = adminId;
        transaction.processedAt = new Date();
        await transaction.save({ transaction: t });

        // Create refund transaction
        await WalletTransaction.create(
            {
                walletId: wallet.id,
                type: "CREDIT",
                amount: transaction.amount,
                reason: "WITHDRAWAL_REFUND",
                status: "APPROVED",
                meta: {
                    originalWithdrawalId: transaction.id,
                    refundReason: adminNote,
                    processedBy: adminId,
                },
            },
            { transaction: t }
        );

        await t.commit();

        return res.json({
            msg: "Withdrawal rejected and amount refunded",
            withdrawal: transaction,
        });
    } catch (err) {
        await t.rollback();
        return res.status(400).json({ msg: err.message });
    }
});

export default router;
