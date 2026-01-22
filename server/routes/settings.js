import express from "express";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import AppSetting from "../models/AppSetting.js";

const router = express.Router();

// GET /api/settings/admin
router.get("/admin", auth, async (req, res) => {
  const rows = await AppSetting.findAll({ order: [["key", "ASC"]] });
  res.json(rows);
});

// PUT /api/settings/admin
// Body: { key:"WALLET_MIN_SPEND", value:"3000" }
router.post("/admin", auth,async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ msg: "key required" });

  const v = String(value ?? "").trim();
  if (!v) return res.status(400).json({ msg: "value required" });

  const [row] = await AppSetting.findOrCreate({
    where: { key },
    defaults: { value: v },
  });

  if (row.value !== v) {
    row.value = v;
    await row.save();
  }

  res.json({ msg: "Saved", key: row.key, value: row.value });
});

export default router;
