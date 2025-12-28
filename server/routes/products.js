import express from "express";
import Product from "../models/Product.js";
import { uploadProductImages } from "../config/upload.js";
import { Op } from "sequelize";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

/* ================= GET ALL PRODUCTS ================= */
// GET /api/products?search=&category=&badge=&featured=true&inStock=true
router.get("/", auth, async (req, res) => {
  try {
    const { search, category, badge, featured, inStock } = req.query;

    const where = { isActive: true };

    if (search) where.name = { [Op.like]: `%${search}%` };
    if (category) where.category = category;
    if (badge) where.badge = badge;
    if (featured === "true") where.featured = true;
    if (inStock === "true") where.stockQty = { [Op.gt]: 0 };

    const products = await Product.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ================= GET SINGLE PRODUCT ================= */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ================= CREATE PRODUCT ================= */
router.post("/",auth, (req, res) => {
  uploadProductImages(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ msg: err.message });

      const images = (req.files || []).map(
        (f) => `/${f.path.replaceAll("\\", "/")}`
      );

      const product = await Product.create({
        ...req.body,
        stockQty: req.body.stockQty || 0,
        featured: req.body.featured === "true",
        images,
      });

      res.status(201).json(product);
    } catch (e) {
      console.error(e);
      res.status(500).json({ msg: "Create failed" });
    }
  });
});

/* ================= UPDATE PRODUCT ================= */
router.put("/:id", auth,(req, res) => {
  uploadProductImages(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ msg: err.message });

      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ msg: "Not found" });

      const newImages = (req.files || []).map(
        (f) => `/${f.path.replaceAll("\\", "/")}`
      );

      await product.update({
        ...req.body,
        featured:
          req.body.featured != null
            ? req.body.featured === "true"
            : product.featured,
        images: newImages.length ? newImages : product.images,
      });

      res.json(product);
    } catch (e) {
      console.error(e);
      res.status(500).json({ msg: "Update failed" });
    }
  });
});



/* ================= DELETE (SOFT DELETE) ================= */
router.delete("/:id",auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ msg: "Not found" });

    product.isActive = false;
    await product.save();

    res.json({ msg: "Product hidden" });
  } catch (err) {
    res.status(500).json({ msg: "Delete failed" });
  }
});

export default router;
