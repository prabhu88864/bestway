// import express from 'express'
// import jwt from 'jsonwebtoken'
// import bcrypt from 'bcryptjs'
// import User from '../models/User.js'

// const router = express.Router()

// // REGISTER
// router.post('/register', async (req, res) => {
//   try {
//     const { name, email, phone, password ,role} = req.body

//     if (!name || !email || !phone || !password) {
//       return res.status(400).json({ msg: 'All fields are required' })
//     }

//     const exists = await User.findOne({ where: { email } })
//     if (exists) return res.status(400).json({ msg: 'Email already exists' })

//     const user = await User.create({ name, email, phone, password ,role})

//     res.status(201).json({
//       msg: 'User registered successfully',
//       user: { id: user.id, name: user.name, email: user.email, phone: user.phone,role: user.role },
//     })
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ msg: 'Server error' })
//   }
// })

// // LOGIN
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body

//     if (!email || !password) {
//       return res.status(400).json({ msg: 'Email and password required' })
//     }

//     const user = await User.findOne({ where: { email } })
//     if (!user) return res.status(400).json({ msg: 'Invalid credentials' })

//     const isMatch = await bcrypt.compare(password, user.password)
//     if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' })

//    const token = jwt.sign(
//   { id: user.id, role: user.role },
//   process.env.JWT_SECRET,
//   { expiresIn: "1d" }
// );

// res.json({
//   msg: "Login successful",
//   token,
//   user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
// });
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ msg: 'Server error' })
//   }
// })

// export default routerimport express from "express";
// import express from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { sequelize } from "../config/db.js";

// import User from "../models/User.js";
// import Wallet from "../models/Wallet.js";
// import WalletTransaction from "../models/WalletTransaction.js";
// import Referral from "../models/Referral.js";
// import BinaryNode from "../models/BinaryNode.js";
// import ReferralLink from "../models/ReferralLink.js";

// const router = express.Router();

// const JOIN_BONUS = 5000;
// const PAIR_BONUS = 3000;
// const DOWNLINE_PAIR_BONUS = 3000;

// const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

// const generateReferralCode = () =>
//   "R" + Math.random().toString(36).substring(2, 8).toUpperCase();

// async function creditWallet({ userId, amount, reason, meta, t }) {
//   const wallet = await Wallet.findOne({
//     where: { userId },
//     transaction: t,
//     lock: t.LOCK.UPDATE,
//   });
//   if (!wallet) throw new Error("Wallet not found");

//   wallet.balance = Number(wallet.balance) + Number(amount);
//   await wallet.save({ transaction: t });

//   await WalletTransaction.create(
//     { walletId: wallet.id, type: "CREDIT", amount, reason, meta: meta || null },
//     { transaction: t }
//   );
// }

// async function ensureNode(userId, t) {
//   let node = await BinaryNode.findOne({ where: { userId }, transaction: t });
//   if (!node) {
//     node = await BinaryNode.create(
//       { userId, parentId: null, position: null, leftChildId: null, rightChildId: null },
//       { transaction: t }
//     );
//   }
//   return node;
// }

// async function findPlacementParent({ sponsorUserId, position, t }) {
//   let current = await BinaryNode.findOne({
//     where: { userId: sponsorUserId },
//     transaction: t,
//     lock: t.LOCK.UPDATE,
//   });
//   if (!current) throw new Error("Sponsor node not found");

//   while (true) {
//     if (position === "LEFT") {
//       if (!current.leftChildId) return current;
//       current = await BinaryNode.findOne({
//         where: { userId: current.leftChildId },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });
//     } else {
//       if (!current.rightChildId) return current;
//       current = await BinaryNode.findOne({
//         where: { userId: current.rightChildId },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });
//     }
//   }
// }

// async function updateUplineCountsAndBonuses({ startParentUserId, placedPosition, t }) {
//   let node = await BinaryNode.findOne({ where: { userId: startParentUserId }, transaction: t });
//   let pos = placedPosition;

//   while (node) {
//     const uplineUser = await User.findByPk(node.userId, { transaction: t, lock: t.LOCK.UPDATE });
//     if (!uplineUser) break;

//     if (pos === "LEFT") uplineUser.leftCount += 1;
//     else uplineUser.rightCount += 1;

//     const totalPairs = Math.min(uplineUser.leftCount, uplineUser.rightCount);

//     const newSelfPairs = totalPairs - uplineUser.paidPairs;
//     if (newSelfPairs > 0) {
//       await creditWallet({
//         userId: uplineUser.id,
//         amount: newSelfPairs * PAIR_BONUS,
//         reason: "PAIR_BONUS",
//         meta: { newPairs: newSelfPairs, each: PAIR_BONUS },
//         t,
//       });
//       uplineUser.paidPairs += newSelfPairs;
//     }

//     if (uplineUser.sponsorId) {
//       const newSponsorPairs = totalPairs - uplineUser.sponsorPaidPairs;
//       if (newSponsorPairs > 0) {
//         await creditWallet({
//           userId: uplineUser.sponsorId,
//           amount: newSponsorPairs * DOWNLINE_PAIR_BONUS,
//           reason: "DOWNLINE_PAIR_BONUS",
//           meta: { fromUserId: uplineUser.id, newPairs: newSponsorPairs, each: DOWNLINE_PAIR_BONUS },
//           t,
//         });
//         uplineUser.sponsorPaidPairs += newSponsorPairs;
//       }
//     }

//     await uplineUser.save({ transaction: t });

//     const currentNode = await BinaryNode.findOne({ where: { userId: uplineUser.id }, transaction: t });
//     pos = currentNode?.position;
//     if (!currentNode?.parentId) break;

//     node = await BinaryNode.findOne({ where: { userId: currentNode.parentId }, transaction: t });
//   }
// }

// /**
//  * POST /api/auth/register
//  * Body:
//  * {
//  *   name,email,phone,password,
//  *   referralCode?: "<LEFT/RIGHT link-code>"   ✅ only this (no pos)
//  * }
//  */
// router.post("/register", async (req, res) => {
//   const { name, email, phone, password } = req.body;

//   // ✅ referralCode means LEFT/RIGHT link-code created by sponsor
//   const referralCode = req.body.referralCode;

//   const t = await sequelize.transaction();
//   try {
//     if (!name || !email || !phone || !password) throw new Error("name,email,phone,password required");

//     // create unique user referralCode
//     let myCode = generateReferralCode();
//     while (await User.findOne({ where: { referralCode: myCode }, transaction: t })) {
//       myCode = generateReferralCode();
//     }

//     const user = await User.create(
//       { name, email, phone, password, referralCode: myCode },
//       { transaction: t }
//     );

//     await Wallet.create({ userId: user.id, balance: 0 }, { transaction: t });

//     await BinaryNode.create(
//       { userId: user.id, parentId: null, position: null, leftChildId: null, rightChildId: null },
//       { transaction: t }
//     );

//     // ✅ If referralCode (link-code) present -> backend finds sponsor + position
//     if (referralCode) {
//       const link = await ReferralLink.findOne({
//         where: { code: referralCode, isActive: true },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!link) throw new Error("Invalid referral code");

//       const sponsor = await User.findByPk(link.sponsorId, {
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });
//       if (!sponsor) throw new Error("Sponsor not found");

//       const pos = link.position; // ✅ LEFT/RIGHT decided by sponsor when link created

//       await ensureNode(sponsor.id, t);

//       // direct sponsor
//       user.sponsorId = sponsor.id;
//       await user.save({ transaction: t });

//       const placedParent = await findPlacementParent({
//         sponsorUserId: sponsor.id,
//         position: pos,
//         t,
//       });

//       await Referral.create(
//         { sponsorId: sponsor.id, referredUserId: user.id, position: pos, joinBonusPaid: false },
//         { transaction: t }
//       );

//       const myNode = await BinaryNode.findOne({
//         where: { userId: user.id },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       myNode.parentId = placedParent.userId;
//       myNode.position = pos;
//       await myNode.save({ transaction: t });

//       if (pos === "LEFT") placedParent.leftChildId = user.id;
//       else placedParent.rightChildId = user.id;
//       await placedParent.save({ transaction: t });

//       // ✅ join bonus to sponsor
//       await creditWallet({
//         userId: sponsor.id,
//         amount: JOIN_BONUS,
//         reason: "REFERRAL_JOIN_BONUS",
//         meta: { referredUserId: user.id, referredName: user.name },
//         t,
//       });

//       // ✅ pair bonuses
//       await updateUplineCountsAndBonuses({
//         startParentUserId: placedParent.userId,
//         placedPosition: pos,
//         t,
//       });
//     }

//     await t.commit();

//     const token = signToken(user.id);
//     return res.json({
//       msg: "Registered",
//       token,
//       user: { id: user.id, name: user.name, referralCode: user.referralCode },
//     });
//   } catch (err) {
//     await t.rollback();
//     return res.status(400).json({ msg: err.message });
//   }
// });

// // LOGIN (keep yours if already)
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ where: { email } });
//     if (!user) return res.status(400).json({ msg: "Invalid credentials" });

//     const ok = await bcrypt.compare(password, user.password);
//     if (!ok) return res.status(400).json({ msg: "Invalid credentials" });

//     const token = signToken(user.id);
//     return res.json({
//       msg: "Logged in",
//       token,
//       user: { id: user.id, name: user.name, role: user.role, referralCode: user.referralCode },
//     });
//   } catch (err) {
//     return res.status(500).json({ msg: err.message });
//   }
// });

// export default router;
// ========================= routes/auth.js (FULL CODE) =========================
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sequelize } from "../config/db.js";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

import Referral from "../models/Referral.js";
import ReferralLink from "../models/ReferralLink.js";
import ReferralEdge from "../models/ReferralEdge.js";

const router = express.Router();

const JOIN_BONUS = 5000;
const PAIR_BONUS = 3000;
const DOWNLINE_PAIR_BONUS = 3000;

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

const generateReferralCode = () =>
  "R" + Math.random().toString(36).substring(2, 8).toUpperCase();

async function creditWallet({ userId, amount, reason, meta, t }) {
  const wallet = await Wallet.findOne({
    where: { userId },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!wallet) throw new Error("Wallet not found");

  wallet.balance = Number(wallet.balance) + Number(amount);
  await wallet.save({ transaction: t });

  await WalletTransaction.create(
    { walletId: wallet.id, type: "CREDIT", amount, reason, meta: meta || null },
    { transaction: t }
  );
}

// ✅ LEFT/RIGHT list: slot 1..n under sponsor (no spillover)
async function getNextSlot(sponsorId, pos, t) {
  const last = await ReferralEdge.findOne({
    where: { sponsorId, position: pos },
    order: [["slot", "DESC"]],
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  return (last?.slot || 0) + 1;
}

/**
 * ✅ Pair income rules (direct sponsor based):
 * - sponsor.leftCount/rightCount increment based on direct referral position
 * - pairs = min(leftCount, rightCount)
 * - newPairs = pairs - paidPairs => CREDIT newPairs*3000 to that user
 * - if that user has sponsorId => sponsor also gets newPairs*3000 (downline pair bonus)
 */
// async function updateSponsorCountsAndBonuses({ sponsorId, pos, t }) {
//   let currentSponsorId = sponsorId;

//   while (currentSponsorId) {
//     const u = await User.findByPk(currentSponsorId, { transaction: t, lock: t.LOCK.UPDATE });
//     if (!u) break;

//     if (pos === "LEFT") u.leftCount += 1;
//     else u.rightCount += 1;

//     const totalPairs = Math.min(u.leftCount, u.rightCount);

//     // self pair bonus
//     const newSelfPairs = totalPairs - u.paidPairs;
//     if (newSelfPairs > 0) {
//       await creditWallet({
//         userId: u.id,
//         amount: newSelfPairs * PAIR_BONUS,
//         reason: "PAIR_BONUS",
//         meta: { newPairs: newSelfPairs, each: PAIR_BONUS },
//         t,
//       });
//       u.paidPairs += newSelfPairs;
//     }

//     // sponsor gets when downline completes pair
//     if (u.sponsorId) {
//       const newSponsorPairs = totalPairs - u.sponsorPaidPairs;
//       if (newSponsorPairs > 0) {
//         await creditWallet({
//           userId: u.sponsorId,
//           amount: newSponsorPairs * DOWNLINE_PAIR_BONUS,
//           reason: "DOWNLINE_PAIR_BONUS",
//           meta: { fromUserId: u.id, newPairs: newSponsorPairs, each: DOWNLINE_PAIR_BONUS },
//           t,
//         });
//         u.sponsorPaidPairs += newSponsorPairs;
//       }
//     }

//     await u.save({ transaction: t });
//     currentSponsorId = u.sponsorId || null;
//   }
// }


async function updateDirectSponsorCountsAndBonuses({ sponsorId, pos, t }) {
  const u = await User.findByPk(sponsorId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!u) return;

  // ✅ only direct sponsor counts increment
  if (pos === "LEFT") u.leftCount += 1;
  else u.rightCount += 1;

  const totalPairs = Math.min(u.leftCount, u.rightCount);

  // ✅ self pair bonus (only for this user)
  const newSelfPairs = totalPairs - u.paidPairs;
  if (newSelfPairs > 0) {
    await creditWallet({
      userId: u.id,
      amount: newSelfPairs * PAIR_BONUS,
      reason: "PAIR_BONUS",
      meta: { newPairs: newSelfPairs, each: PAIR_BONUS },
      t,
    });
    u.paidPairs += newSelfPairs;
  }

  // ✅ sponsor gets downline pair bonus when THIS user completes new pairs
  if (u.sponsorId) {
    const newSponsorPairs = totalPairs - u.sponsorPaidPairs;
    if (newSponsorPairs > 0) {
      await creditWallet({
        userId: u.sponsorId,
        amount: newSponsorPairs * DOWNLINE_PAIR_BONUS,
        reason: "DOWNLINE_PAIR_BONUS",
        meta: { fromUserId: u.id, newPairs: newSponsorPairs, each: DOWNLINE_PAIR_BONUS },
        t,
      });
      u.sponsorPaidPairs += newSponsorPairs;
    }
  }

  await u.save({ transaction: t });
}

// ========================= REGISTER =========================
// POST /api/auth/register
// Body: { name,email,phone,password, referralCode?: "<LEFT/RIGHT link-code>" }
router.post("/register", async (req, res) => {
  const { name, email, phone, password } = req.body;

  // ✅ referralCode = ReferralLink.code (LEFT/RIGHT link-code created by sponsor)
  const referralCode = req.body.referralCode;

  const t = await sequelize.transaction();
  try {
    if (!name || !email || !phone || !password) {
      throw new Error("name,email,phone,password required");
    }

    // create unique user referralCode (user's own code)
    let myCode = generateReferralCode();
    while (await User.findOne({ where: { referralCode: myCode }, transaction: t })) {
      myCode = generateReferralCode();
    }

    const user = await User.create(
      { name, email, phone, password, referralCode: myCode },
      { transaction: t }
    );

    // wallet
    await Wallet.create({ userId: user.id, balance: 0 }, { transaction: t });

    // ✅ Apply referral if present (NO spillover to B/C, direct under sponsor list)
    if (referralCode) {
      const link = await ReferralLink.findOne({
        where: { code: referralCode, isActive: true },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!link) throw new Error("Invalid referral code");

      const sponsor = await User.findByPk(link.sponsorId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!sponsor) throw new Error("Sponsor not found");

      const pos = String(link.position || "").toUpperCase();
      if (!["LEFT", "RIGHT"].includes(pos)) throw new Error("Invalid referral position");

      // set direct sponsor
      user.sponsorId = sponsor.id;
      await user.save({ transaction: t });

      // store referred users info (audit)
      await Referral.create(
        { sponsorId: sponsor.id, referredUserId: user.id, position: pos, joinBonusPaid: true },
        { transaction: t }
      );

      // store under sponsor left/right unlimited list
      const slot = await getNextSlot(sponsor.id, pos, t);

      await ReferralEdge.create(
        { sponsorId: sponsor.id, childId: user.id, position: pos, slot },
        { transaction: t }
      );

      // join bonus to sponsor
      await creditWallet({
        userId: sponsor.id,
        amount: JOIN_BONUS,
        reason: "REFERRAL_JOIN_BONUS",
        meta: { referredUserId: user.id, referredName: user.name, position: pos, slot },
        t,
      });

      // pair bonuses (direct sponsor based)
      // await updateSponsorCountsAndBonuses({
      //   sponsorId: sponsor.id,
      //   pos,
      //   t,
      // });
      await updateDirectSponsorCountsAndBonuses({
        sponsorId: sponsor.id,
        pos,
        t,
      });

    }

    await t.commit();

    const token = signToken(user.id);
    return res.json({
      msg: "Registered",
      token,
      user: { id: user.id, name: user.name, referralCode: user.referralCode },
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ msg: err.message });
  }
});

// ========================= LOGIN =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: "Invalid credentials" });

    const token = signToken(user.id);
    return res.json({
      msg: "Logged in",
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone, referralCode: user.referralCode },
  
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

export default router;

