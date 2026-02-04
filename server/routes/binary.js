// routes/tree.js
import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import BinaryNode from "../models/BinaryNode.js";

const router = express.Router();

/**
 * ✅ Ensures BinaryNode row exists for any user (prevents "Tree not initialized" for old users)
 */
async function ensureNode(userId, t = null) {
  const opts = t ? { transaction: t } : {};
  let node = await BinaryNode.findOne({ where: { userId }, ...opts });
  if (node) return node;

  node = await BinaryNode.create(
    {
      userId,
      parentId: null,
      position: null,
      leftChildId: null,
      rightChildId: null,
    },
    opts
  );
  return node;
}

/**
 * ✅ Build tree using numeric IDs internally,
 * but returns BOTH numeric ids and SUN ids (userID) for each node + left/right.
 */
async function buildTree(rootUserId, depth) {
  const maxDepth = Math.max(1, Math.min(Number(depth || 4), 10));

  // userId -> { node, user }
  const map = new Map();
  const levelMap = new Map();

  let frontier = [rootUserId];
  levelMap.set(rootUserId, 0);

  for (let lvl = 0; lvl <= maxDepth; lvl++) {
    if (!frontier.length) break;

    const nodes = await BinaryNode.findAll({
      where: { userId: frontier },
      attributes: ["userId", "leftChildId", "rightChildId"],
    });

    const ids = nodes.map((n) => n.userId);

    const users = await User.findAll({
      where: { id: ids },
      attributes: ["id", "userID", "name", "referralCode"],
    });

    const uMap = new Map(users.map((u) => [u.id, u]));

    for (const n of nodes) {
      map.set(n.userId, { node: n, user: uMap.get(n.userId) });
    }

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
    if (!entry) {
      return {
        id: userId,
        userID: null,
        name: "—",
        referralCode: null,
        leftId: null,
        rightId: null,
        leftUserID: null,
        rightUserID: null,
        missing: true,
        left: null,
        right: null,
      };
    }

    const u = entry.user;
    const n = entry.node;

    const leftEntry = n.leftChildId ? map.get(n.leftChildId) : null;
    const rightEntry = n.rightChildId ? map.get(n.rightChildId) : null;

    const out = {
      // ✅ numeric (DB ids)
      id: u?.id ?? userId,

      // ✅ your "pk id" (SUNxxxxxx)
      userID: u?.userID ?? null,

      name: u?.name ?? "—",
      referralCode: u?.referralCode ?? null,

      // ✅ children numeric ids
      leftId: n.leftChildId ?? null,
      rightId: n.rightChildId ?? null,

      // ✅ children SUN ids (pk ids)
      leftUserID: leftEntry?.user?.userID ?? null,
      rightUserID: rightEntry?.user?.userID ?? null,

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

/**
 * ✅ GET /api/tree?depth=4
 * Returns tree with numeric + SUN ids (userID) for root/left/right nodes.
 */
router.get("/tree", auth, async (req, res) => {
  try {
    const depth = Number(req.query.depth || 4);
    const rootUserId = req.user.id; // ✅ numeric id from JWT

    // ensure root node exists (safety)
    await ensureNode(rootUserId);

    const rootNode = await BinaryNode.findOne({ where: { userId: rootUserId } });
    if (!rootNode) return res.status(404).json({ msg: "Tree not initialized" });

    const tree = await buildTree(rootUserId, depth);

    return res.json({
      rootUserId, // numeric
      depth: Math.max(1, Math.min(depth, 10)),
      tree,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

export default router;
