import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import ReferralEdge from "../models/ReferralEdge.js";

const router = express.Router();

async function buildSideTree(userId, depth, perSide) {
  const u = await User.findByPk(userId, { attributes: ["id", "name", "referralCode"] });
  if (!u) return null;

  const node = { userId: u.id, name: u.name, referralCode: u.referralCode, left: [], right: [] };
  if (depth <= 0) return node;

  const edges = await ReferralEdge.findAll({
    where: { sponsorId: userId },
    order: [["position", "ASC"], ["slot", "ASC"]],
  });

  const leftEdges = edges.filter(e => e.position === "LEFT").slice(0, perSide);
  const rightEdges = edges.filter(e => e.position === "RIGHT").slice(0, perSide);

  for (const e of leftEdges) {
    const childTree = await buildSideTree(e.childId, depth - 1, perSide);
    if (childTree) node.left.push({ slot: e.slot, ...childTree });
  }
  for (const e of rightEdges) {
    const childTree = await buildSideTree(e.childId, depth - 1, perSide);
    if (childTree) node.right.push({ slot: e.slot, ...childTree });
  }

  return node;
}

// GET /api/referrals-tree/me?depth=2&perSide=50
router.get("/me", auth, async (req, res) => {
  try {
    const depth = Math.max(1, Math.min(Number(req.query.depth || 2), 6));
    const perSide = Math.max(1, Math.min(Number(req.query.perSide || 50), 200));

    const tree = await buildSideTree(req.user.id, depth, perSide);
    return res.json({ rootUserId: req.user.id, depth, perSide, tree });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

export default router;
