import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const BADGE_OPTIONS = [
  { value: "", label: "None" },
  { value: "POPULAR", label: "POPULAR" },
  { value: "NEW_ARRIVAL", label: "NEW_ARRIVAL" },
  { value: "BEST_SELLER", label: "BEST_SELLER" },
  { value: "TRENDING", label: "TRENDING" },
  { value: "LIMITED_OFFER", label: "LIMITED_OFFER" },
];

export default function AdminProducts() {
  const navigate = useNavigate();

  // list
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // search
  const [search, setSearch] = useState("");

  // drawer view
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("ADD"); // ADD | EDIT
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(getEmptyForm());
  const [files, setFiles] = useState([]); // max 4

  // delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // previews
  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previewUrls.forEach((u) => URL.revokeObjectURL(u)), [previewUrls]);

  // auth + load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || role !== "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }
    fetchProducts("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================== API ================== */
  const fetchProducts = async (q = search) => {
    try {
      setLoading(true);
      const query = (q || "").trim();
      const res = await axiosInstance.get("/api/products", {
        params: { search: query || undefined },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setAllProducts(list);
    } catch (err) {
      console.log("GET /api/products error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ NO BUTTON: typing lo auto-search (debounce 350ms)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts(search);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ✅ Instant client-side filter (fast UI)
  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProducts;

    return allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const manufacturer = (p.manufacturer || "").toLowerCase();
      return (
        name.includes(q) ||
        sku.includes(q) ||
        category.includes(q) ||
        brand.includes(q) ||
        manufacturer.includes(q)
      );
    });
  }, [allProducts, search]);

  const total = products.length;

  /* ================== HELPERS ================== */
  const imgUrl = (path) => {
    if (!path) return "";
    const base = (axiosInstance.defaults.baseURL || "").replace(/\/$/, "");
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${base}${path}`;
    return `${base}/${path}`;
  };

  const openView = async (row) => {
    try {
      setDrawerOpen(true);
      setViewLoading(true);
      setSelectedProduct(null);

      const res = await axiosInstance.get(`/api/products/${row.id}`);
      setSelectedProduct(res.data);
    } catch (err) {
      console.log("GET /api/products/:id error", err);
      setSelectedProduct(row);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    setDrawerOpen(false);
    setSelectedProduct(null);
  };

  const openAdd = () => {
    setMode("ADD");
    setForm(getEmptyForm());
    setFiles([]);
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const openEdit = async (row) => {
    try {
      const res = await axiosInstance.get(`/api/products/${row.id}`);
      const p = res.data;

      setMode("EDIT");
      setSelectedProduct(p);

      setForm({
        name: p?.name || "",
        brand: p?.brand || "",
        manufacturer: p?.manufacturer || "",
        packSize: p?.packSize || "",
        category: p?.category || "",
        sku: p?.sku || "",
        description: p?.description || "",
        badge: p?.badge || "",
        mrp: p?.mrp ?? "",
        price: p?.price ?? "",
        stockQty: p?.stockQty ?? "",
        featured: !!p?.featured,

        // ✅ NEW FIELDS (percent)
        entrepreneurDiscount: p?.entrepreneurDiscount ?? 0,
        traineeEntrepreneurDiscount: p?.traineeEntrepreneurDiscount ?? 0,
      });

      setFiles([]);
      setModalOpen(true);
    } catch (err) {
      console.log("openEdit error", err);
      alert("Failed to load product");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setFiles([]);
  };

  const clampPct = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  };

  const saveProduct = async () => {
    try {
      if (!form.name.trim()) return alert("Product name required");
      if (form.mrp === "" || isNaN(Number(form.mrp))) return alert("Valid MRP required");
      if (form.price === "" || isNaN(Number(form.price))) return alert("Valid Price required");
      if (files.length > 4) return alert("Max 4 images allowed");

      // ✅ Validate discounts (0..100)
      const entDisc = clampPct(form.entrepreneurDiscount);
      const trDisc = clampPct(form.traineeEntrepreneurDiscount);

      setSaving(true);

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("brand", form.brand || "");
      fd.append("manufacturer", form.manufacturer || "");
      fd.append("packSize", form.packSize || "");
      fd.append("category", form.category || "");
      fd.append("sku", form.sku || "");
      fd.append("description", form.description || "");
      fd.append("badge", form.badge || "");
      fd.append("mrp", String(form.mrp));
      fd.append("price", String(form.price));
      fd.append("stockQty", String(form.stockQty || 0));
      fd.append("featured", form.featured ? "true" : "false");

      // ✅ NEW FIELDS
      fd.append("entrepreneurDiscount", String(entDisc));
      fd.append("traineeEntrepreneurDiscount", String(trDisc));

      files.forEach((f) => fd.append("images", f));

      if (mode === "ADD") {
        await axiosInstance.post("/api/products", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axiosInstance.put(`/api/products/${selectedProduct.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      closeModal();
      fetchProducts(search);
    } catch (err) {
      console.log("saveProduct error", err);
      alert(err?.response?.data?.msg || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (row) => {
    setDeleteProduct(row);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteProduct(null);
  };

  const confirmDelete = async () => {
    if (!deleteProduct?.id) return;
    try {
      setDeleteLoading(true);
      await axiosInstance.delete(`/api/products/${deleteProduct.id}`);
      closeDelete();
      fetchProducts(search);
    } catch (err) {
      console.log("DELETE /api/products/:id error", err);
      alert(err?.response?.data?.msg || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <h2 style={styles.title}>Products</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
            ← Dashboard
          </button>
          <button onClick={openAdd} style={styles.primaryBtn}>
            + Add Product
          </button>
        </div>
      </div>

      {/* ✅ Search UI (no button) */}
      <div style={styles.searchBar}>
        <div style={styles.searchIcon}>🔍</div>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / sku / category / brand / manufacturer..."
        />
        {search.trim() ? (
          <button type="button" style={styles.clearBtn} onClick={() => setSearch("")} title="Clear">
            ✕
          </button>
        ) : null}
      </div>

      {/* Card + Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total Products: <b>{total}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "ID",
                      "Product",
                      "SKU",
                      "Category",
                      "Brand",
                      "MRP",
                      "Price",
                      "Stock",
                      "Ent Disc %",
                      "Trainee Disc %",
                      "Badge",
                      "Featured",
                      "Actions",
                    ].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={styles.empty}>
                        No products found
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const firstImg =
                        Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <tr key={p.id}>
                          <td style={styles.td}>{p.id}</td>

                          <td style={styles.td}>
                            <div style={styles.productCell}>
                              {firstImg ? (
                                <img
                                  src={imgUrl(firstImg)}
                                  alt={p.name}
                                  style={styles.thumb}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div style={styles.thumbPlaceholder}>No Img</div>
                              )}
                              <div>
                                <div style={styles.pName}>{p.name}</div>
                                <div style={styles.pSub}>
                                  {p.manufacturer || p.packSize
                                    ? `${p.manufacturer || ""}${
                                        p.manufacturer && p.packSize ? " • " : ""
                                      }${p.packSize || ""}`
                                    : "-"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={styles.td}>{p.sku || "-"}</td>
                          <td style={styles.td}>{p.category || "-"}</td>
                          <td style={styles.td}>{p.brand || "-"}</td>
                          <td style={styles.td}>{p.mrp != null ? `₹${p.mrp}` : "-"}</td>
                          <td style={styles.td}>{p.price != null ? `₹${p.price}` : "-"}</td>
                          <td style={styles.td}>{p.stockQty ?? 0}</td>

                          {/* ✅ NEW FIELDS */}
                          <td style={styles.td}>
                            {p.entrepreneurDiscount != null ? `${p.entrepreneurDiscount}%` : "0%"}
                          </td>
                          <td style={styles.td}>
                            {p.traineeEntrepreneurDiscount != null
                              ? `${p.traineeEntrepreneurDiscount}%`
                              : "0%"}
                          </td>

                          <td style={styles.td}>{p.badge || "-"}</td>
                          <td style={styles.td}>{p.featured ? "Yes" : "No"}</td>

                          <td style={styles.td}>
                            <div style={styles.actions}>
                              <button style={styles.actionBtn} onClick={() => openView(p)}>
                                View
                              </button>
                              <button style={styles.actionBtn} onClick={() => openEdit(p)}>
                                Edit
                              </button>
                              <button style={styles.dangerBtn} onClick={() => openDelete(p)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* DRAWER VIEW */}
      {drawerOpen && (
        <div style={styles.drawerOverlay} onClick={closeView}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h3 style={{ margin: 0 }}>Product Details</h3>
              <button style={styles.btnSmall} onClick={closeView}>
                ✕
              </button>
            </div>

            {viewLoading ? (
              <div style={styles.info}>Loading...</div>
            ) : selectedProduct ? (
              <div style={styles.drawerBody}>
                <div style={styles.drawerImgsWrap}>
                  {(selectedProduct.images || []).length ? (
                    (selectedProduct.images || []).map((img, idx) => (
                      <img key={idx} src={imgUrl(img)} alt="product" style={styles.drawerImg} />
                    ))
                  ) : (
                    <div style={{ color: "#777", fontSize: 13 }}>No Images</div>
                  )}
                </div>

                <Row label="ID" value={selectedProduct.id} />
                <Row label="Name" value={selectedProduct.name} />
                <Row label="Brand" value={selectedProduct.brand} />
                <Row label="Manufacturer" value={selectedProduct.manufacturer} />
                <Row label="Pack Size" value={selectedProduct.packSize} />
                <Row label="SKU" value={selectedProduct.sku} />
                <Row label="Category" value={selectedProduct.category} />
                <Row label="Badge" value={selectedProduct.badge} />
                <Row label="MRP" value={selectedProduct.mrp != null ? `₹${selectedProduct.mrp}` : "-"} />
                <Row label="Price" value={selectedProduct.price != null ? `₹${selectedProduct.price}` : "-"} />
                <Row label="Stock" value={selectedProduct.stockQty ?? 0} />

                {/* ✅ NEW FIELDS */}
                <Row
                  label="Entrepreneur Discount"
                  value={
                    selectedProduct.entrepreneurDiscount != null
                      ? `${selectedProduct.entrepreneurDiscount}%`
                      : "0%"
                  }
                />
                <Row
                  label="Trainee Discount"
                  value={
                    selectedProduct.traineeEntrepreneurDiscount != null
                      ? `${selectedProduct.traineeEntrepreneurDiscount}%`
                      : "0%"
                  }
                />

                <Row label="Featured" value={selectedProduct.featured ? "Yes" : "No"} />
                <Row label="Description" value={selectedProduct.description} />

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button style={styles.actionBtn} onClick={() => openEdit(selectedProduct)}>
                    Edit
                  </button>
                  <button style={styles.dangerBtn} onClick={() => openDelete(selectedProduct)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.info}>No data</div>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>{mode === "ADD" ? "Add Product" : "Edit Product"}</h3>
              <button style={styles.btnSmall} onClick={closeModal}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <Field label="Name *">
                  <input
                    style={styles.modalInput}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>

                <Field label="SKU (unique)">
                  <input
                    style={styles.modalInput}
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="SKU-001"
                  />
                </Field>

                <Field label="Category">
                  <input
                    style={styles.modalInput}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </Field>

                <Field label="Badge">
                  <select
                    style={styles.modalInput}
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  >
                    {BADGE_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Brand">
                  <input
                    style={styles.modalInput}
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </Field>

                <Field label="Manufacturer">
                  <input
                    style={styles.modalInput}
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  />
                </Field>

                <Field label="Pack Size">
                  <input
                    style={styles.modalInput}
                    value={form.packSize}
                    onChange={(e) => setForm({ ...form, packSize: e.target.value })}
                    placeholder="Strip of 10"
                  />
                </Field>

                <Field label="Stock Qty">
                  <input
                    style={styles.modalInput}
                    value={form.stockQty}
                    onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                    placeholder="100"
                  />
                </Field>

                <Field label="MRP *">
                  <input
                    style={styles.modalInput}
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                    placeholder="60"
                  />
                </Field>

                <Field label="Price *">
                  <input
                    style={styles.modalInput}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="50"
                  />
                </Field>

                {/* ✅ NEW FIELDS IN MODAL */}
                <Field label="Entrepreneur Discount (%)">
                  <input
                    style={styles.modalInput}
                    value={form.entrepreneurDiscount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        entrepreneurDiscount: e.target.value,
                      })
                    }
                    placeholder="0 - 100"
                  />
                </Field>

                <Field label="Trainee Entrepreneur Discount (%)">
                  <input
                    style={styles.modalInput}
                    value={form.traineeEntrepreneurDiscount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        traineeEntrepreneurDiscount: e.target.value,
                      })
                    }
                    placeholder="0 - 100"
                  />
                </Field>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    rows={3}
                    style={styles.textarea}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Featured</span>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Images (max 4)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files || []);
                      if (picked.length > 4) return alert("Max 4 images allowed");
                      setFiles(picked);
                    }}
                  />

                  {files.length > 0 && (
                    <div style={styles.previewWrap}>
                      {previewUrls.map((u, idx) => (
                        <img key={idx} src={u} alt="preview" style={styles.previewImg} />
                      ))}
                    </div>
                  )}

                  {mode === "EDIT" &&
                    files.length === 0 &&
                    Array.isArray(selectedProduct?.images) &&
                    selectedProduct.images.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                          Current Images (upload new to replace)
                        </div>
                        <div style={styles.previewWrap}>
                          {selectedProduct.images.map((img, idx) => (
                            <img key={idx} src={imgUrl(img)} alt="current" style={styles.previewImg} />
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button style={styles.primaryBtn} onClick={saveProduct} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteOpen && (
        <div style={styles.modalOverlay} onClick={closeDelete}>
          <div style={styles.confirm} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete Product?</h3>
            <p style={{ marginTop: 6, fontSize: 14 }}>
              Are you sure you want to delete <b>{deleteProduct?.name}</b>?
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={styles.btn} onClick={closeDelete} disabled={deleteLoading}>
                Cancel
              </button>
              <button style={styles.dangerBtn} onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* helpers */
function getEmptyForm() {
  return {
    name: "",
    brand: "",
    manufacturer: "",
    packSize: "",
    category: "",
    sku: "",
    description: "",
    badge: "",
    mrp: "",
    price: "",
    stockQty: "",
    featured: false,

    // ✅ NEW FIELDS
    entrepreneurDiscount: 0,
    traineeEntrepreneurDiscount: 0,
  };
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowValue}>{value || "-"}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

/* styles */
const styles = {
  page: { padding: 22, background: "#f4f6f8", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -0.5 },

  btn: {
    padding: "12px 14px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #cfcfcf",
    background: "#f3f3f3",
    fontSize: 14,
  },
  btnSmall: {
    padding: "8px 10px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #cfcfcf",
    background: "#f3f3f3",
    fontSize: 13,
  },
  primaryBtn: {
    padding: "12px 16px",
    cursor: "pointer",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
  },

  // ✅ Search UI styles
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #e6e6e6",
    borderRadius: 16,
    padding: "12px 14px",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    marginBottom: 12,
    maxWidth: 720,
  },
  searchIcon: { fontSize: 16, opacity: 0.75 },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: 15,
    flex: 1,
    background: "transparent",
  },
  clearBtn: {
    border: "none",
    background: "#f2f2f2",
    borderRadius: 10,
    cursor: "pointer",
    padding: "8px 10px",
    fontSize: 14,
  },

  card: { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 10px 26px rgba(0,0,0,0.10)" },
  info: { padding: 10, fontSize: 14 },
  meta: { marginBottom: 10, color: "#222", fontSize: 16 },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 1280 },
  th: { textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #eee", fontSize: 14, color: "#333", whiteSpace: "nowrap" },
  td: { padding: "14px 8px", borderBottom: "1px solid #f0f0f0", fontSize: 14, verticalAlign: "middle" },
  empty: { padding: 16, textAlign: "center", color: "#666", fontSize: 14 },

  productCell: { display: "flex", alignItems: "center", gap: 10, minWidth: 260 },
  thumb: { width: 46, height: 46, borderRadius: 12, objectFit: "cover", border: "1px solid #eee", background: "#fff" },
  thumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    border: "1px solid #eee",
    background: "#f3f3f3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#888",
    fontSize: 11,
  },
  pName: { fontWeight: 800, fontSize: 14, lineHeight: 1.2 },
  pSub: { fontSize: 12, color: "#666", marginTop: 2 },

  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  actionBtn: { padding: "9px 12px", cursor: "pointer", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontSize: 13 },
  dangerBtn: { padding: "9px 12px", cursor: "pointer", borderRadius: 10, border: "1px solid #ffcccc", background: "#ffecec", fontSize: 13 },

  // drawer
  drawerOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", justifyContent: "flex-end", zIndex: 50 },
  drawer: { width: 420, maxWidth: "92vw", height: "100%", background: "#fff", padding: 14, boxShadow: "-10px 0 24px rgba(0,0,0,0.14)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #eee" },
  drawerBody: { paddingTop: 12 },
  drawerImgsWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  drawerImg: { width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "1px solid #eee" },

  row: { display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, padding: "10px 0", borderBottom: "1px dashed #f0f0f0" },
  rowLabel: { color: "#666", fontSize: 12 },
  rowValue: { color: "#111", fontWeight: 700, fontSize: 13 },

  // modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 },
  modal: { width: 860, maxWidth: "96vw", background: "#fff", borderRadius: 16, boxShadow: "0 14px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottom: "1px solid #eee" },
  modalBody: { padding: 14, maxHeight: "70vh", overflowY: "auto" },
  modalFooter: { padding: 14, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff", position: "sticky", bottom: 0 },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { display: "block", fontSize: 12, color: "#666", marginBottom: 6 },
  modalInput: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", outline: "none", fontSize: 14 },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", outline: "none", fontSize: 14 },

  previewWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  previewImg: { width: 72, height: 72, borderRadius: 12, objectFit: "cover", border: "1px solid #eee" },

  // confirm
  confirm: { width: 420, maxWidth: "95vw", background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 14px 32px rgba(0,0,0,0.18)" },
};
