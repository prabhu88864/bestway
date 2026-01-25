import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import BinaryNode from "../models/BinaryNode.js";

const router = express.Router();

// Build binary tree up to depth (max 10)
async function buildTree(rootUserId, depth) {
  const maxDepth = Math.max(1, Math.min(Number(depth || 4), 10));

  const map = new Map();      // userId -> { node, user }
  const levelMap = new Map(); // userId -> level
  let frontier = [rootUserId];
  levelMap.set(rootUserId, 0);

  for (let lvl = 0; lvl <= maxDepth; lvl++) {
    if (!frontier.length) break;

    // get BinaryNode rows for this frontier
    const nodes = await BinaryNode.findAll({
      where: { userId: frontier },
      attributes: ["userId", "leftChildId", "rightChildId", "parentId", "position"],
    });

    const ids = nodes.map((n) => n.userId);

    // get User rows for this frontier
    const users = await User.findAll({
      where: { id: ids },
      attributes: ["id", "name", "referralCode"],
    });
    const uMap = new Map(users.map((u) => [u.id, u]));

    for (const n of nodes) map.set(n.userId, { node: n, user: uMap.get(n.userId) });

    // prepare next frontier
    const next = [];
    for (const n of nodes) {
      const curLevel = levelMap.get(n.userId) ?? lvl;
      if (curLevel >= maxDepth) continue;

      if (n.leftChildId && !levelMap.has(n.leftChildId)) {
        levelMap.set(n.leftChildId, curLevel + 1);
        next.push(n.leftChildId);
      }
      if (n.rightChildId && !levelMap.has(n.rightChildId)) {
        levelMap.set(n.rightChildId, curLevel + 1);
        next.push(n.rightChildId);
      }
    }
    frontier = next;
  }

  const toJson = (userId, curDepth) => {
    const entry = map.get(userId);
    if (!entry) return { userId, missing: true, left: null, right: null };

    const u = entry.user;
    const n = entry.node;

    const out = {
      userId,
      name: u?.name || "—",
      referralCode: u?.referralCode || null,

      leftUserId: n.leftChildId || null,
      rightUserId: n.rightChildId || null,

      left: null,
      right: null,
    };

    if (curDepth >= maxDepth) return out;

    out.left = n.leftChildId ? toJson(n.leftChildId, curDepth + 1) : null;
    out.right = n.rightChildId ? toJson(n.rightChildId, curDepth + 1) : null;

    return out;
  };

  return toJson(rootUserId, 0);
}

// GET /api/binary/tree?depth=4
router.get("/tree", auth, async (req, res) => {
  try {
    const depth = Number(req.query.depth || 4);
    const rootUserId = req.user.id;

    const rootNode = await BinaryNode.findOne({ where: { userId: rootUserId } });
    if (!rootNode) return res.status(404).json({ msg: "Binary tree not initialized" });

    const tree = await buildTree(rootUserId, depth);
    return res.json({ rootUserId, depth: Math.max(1, Math.min(depth, 10)), tree });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

export default router;
