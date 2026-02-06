import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import BinaryNode from "../models/BinaryNode.js";

const router = express.Router();

// Build binary tree up to depth (max 10)
async function buildTree(rootUserId, depth) {
  const maxDepth = Math.max(1, Math.min(Number(depth || 4), 10));

  // 1) root node by userId
  const rootNode = await BinaryNode.findOne({
    where: { userId: rootUserId },
    attributes: ["id", "userId", "leftChildId", "rightChildId"],
  });
  if (!rootNode) return null;

  const nodeMap = new Map(); // nodeId -> node
  const userMap = new Map(); // userId -> user
  const levelMap = new Map(); // nodeId -> level
  let frontier = [rootNode.id];
  levelMap.set(rootNode.id, 0);

  for (let lvl = 0; lvl <= maxDepth; lvl++) {
    if (!frontier.length) break;

    // 2) fetch nodes by nodeId (NOT userId)
    const nodes = await BinaryNode.findAll({
      where: { id: frontier },
      attributes: ["id", "userId", "leftChildId", "rightChildId"],
    });

    // 3) fetch users for these nodes
    const userIds = nodes.map((n) => n.userId);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ["id", "userID", "name", "referralCode", "userType", "role", "profilePic"],
    });

    for (const n of nodes) nodeMap.set(n.id, n);
    for (const u of users) userMap.set(u.id, u);

    // 4) prepare next frontier using child nodeIds
    const next = [];
    for (const n of nodes) {
      const curLevel = levelMap.get(n.id) ?? lvl;
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

  const toJson = (nodeId, curDepth) => {
    const n = nodeMap.get(nodeId);
    if (!n) return null;

    const u = userMap.get(n.userId);

    const out = {
      userPkId: u?.id ?? null,
      userID: u?.userID ?? null,
      name: u?.name ?? "—",
      referralCode: u?.referralCode ?? null,
      userType: u?.userType ?? null,
      role: u?.role ?? null,
      profilePic: u?.profilePic ?? null,

      leftNodeId: n.leftChildId ?? null,
      rightNodeId: n.rightChildId ?? null,

      left: null,
      right: null,
    };

    if (curDepth >= maxDepth) return out;

    out.left = n.leftChildId ? toJson(n.leftChildId, curDepth + 1) : null;
    out.right = n.rightChildId ? toJson(n.rightChildId, curDepth + 1) : null;

    return out;
  };

  return toJson(rootNode.id, 0);
}

// GET /api/binary/tree?depth=4
router.get("/tree", auth, async (req, res) => {
  try {
    const depth = Number(req.query.depth || 4);
    const tree = await buildTree(req.user.id, depth);
    if (!tree) return res.status(404).json({ msg: "Binary tree not initialized" });

    return res.json({ rootUserId: req.user.id, depth: Math.max(1, Math.min(depth, 10)), tree });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

export default router;
