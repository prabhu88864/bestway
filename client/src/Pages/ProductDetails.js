import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [activeImg, setActiveImg] = useState(0);

  // add-to-cart states
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  // related products
  const [relLoading, setRelLoading] = useState(false);
  const [related, setRelated] = useState([]);

  const API_ORIGIN = useMemo(() => {
    const base = (axiosInstance.defaults.baseURL || "").trim();
    if (!base) return "http://localhost:3000";
    const noSlash = base.replace(/\/$/, "");
    return noSlash.replace(/\/api$/, "");
  }, []);

  const imgUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
    return `${API_ORIGIN}/${path}`;
  };

  const money = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toFixed(2);
  };

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  };

  // Load product
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        setRelated([]);
        setActiveImg(0);

        const res = await axiosInstance.get(`/api/products/${id}`);
        const item = res.data?.product || res.data;

        if (mounted) {
          setP(item);
          setActiveImg(0);
        }
      } catch (e) {
        if (mounted) setErr(e?.response?.data?.message || e?.response?.data?.msg || e?.message || "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, [id]);

  // Load related products (same category)
  useEffect(() => {
    let mounted = true;

    const loadRelated = async () => {
      if (!p?.category) return;

      try {
        setRelLoading(true);

        // ✅ If your backend supports query, use it.
        // If not, we still handle by filtering after fetch.
        const res = await axiosInstance.get("/api/products", {
          params: { category: p.category }, // if backend ignores, ok
        });

        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.products) ? res.data.products : [];

        const filtered = list
          .filter((x) => String(x?.id) !== String(p?.id))
          .filter((x) => (x?.isActive ?? true) === true)
          .filter((x) => (x?.category || "") === (p?.category || ""))
          .slice(0, 8);

        if (mounted) setRelated(filtered);
      } catch (e) {
        if (mounted) setRelated([]);
      } finally {
        if (mounted) setRelLoading(false);
      }
    };

    loadRelated();
    return () => (mounted = false);
  }, [p?.category, p?.id]);

  // Add to cart
  const addToCart = async () => {
    if (!p?.id) return;

    try {
      setAdding(true);
      await axiosInstance.post("/api/cart", { productId: p.id });
      showToast("✅ Added to cart");
    } catch (e) {
      const msg = e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Add to cart failed";
      showToast(`❌ ${msg}`);
    } finally {
      setAdding(false);
    }
  };

  const images = (p?.images || []).map(imgUrl).filter(Boolean);
  const mainImage = images[activeImg] || images[0] || "https://via.placeholder.com/900x600?text=No+Image";

  const inStock = Number(p?.stockQty || 0) > 0;

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.info}>Loading…</div>
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ ...S.info, color: "#ffb4b4" }}>{err}</div>
        </div>
      </div>
    );
  }
  if (!p) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.info}>Product not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* ✅ CSS inside file */}
      <style>{`
        *{ box-sizing: border-box; }
        .pd-card{
          display:grid;
          grid-template-columns: 1.05fr .95fr;
          gap: 0;
        }
        @media (max-width: 900px){
          .pd-card{ grid-template-columns: 1fr; }
        }

        .rel-grid{
          display:grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 12px;
        }
        @media (max-width: 900px){
          .rel-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
      `}</style>

      <div style={S.container}>
        <div style={S.topRow}>
          <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>
          <div style={{ fontSize: 12, opacity: 0.7 }}>#{p.id} • SKU: {p.sku || "—"}</div>
        </div>

        {toast ? <div style={S.toast}>{toast}</div> : null}

        {/* ✅ MAIN PRODUCT CARD */}
        <div style={S.card} className="pd-card">
          {/* LEFT (image first on mobile too) */}
          <div style={S.left}>
            <div style={S.imageBox}>
              <img
                src={mainImage}
                alt={p.name}
                style={S.mainImg}
                onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/900x600?text=No+Image")}
              />

              {p?.badge ? <div style={S.badge}>{p.badge}</div> : null}

              <div
                style={{
                  ...S.stock,
                  background: inStock ? "rgba(47,210,107,.18)" : "rgba(255,90,90,.18)",
                  borderColor: inStock ? "rgba(47,210,107,.35)" : "rgba(255,90,90,.35)",
                  color: inStock ? "#9ff0be" : "#ffb4b4",
                }}
              >
                {inStock ? `Stock: ${p.stockQty}` : "Out of stock"}
              </div>
            </div>

            {images.length > 1 && (
              <div style={S.thumbs}>
                {images.map((u, idx) => (
                  <button
                    key={u + idx}
                    onClick={() => setActiveImg(idx)}
                    style={{
                      ...S.thumbBtn,
                      outline:
                        idx === activeImg
                          ? "2px solid rgba(255,210,74,.65)"
                          : "1px solid rgba(220,235,255,.14)",
                    }}
                    type="button"
                  >
                    <img
                      src={u}
                      alt="thumb"
                      style={S.thumbImg}
                      onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/120x90?text=No")}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT (details) */}
          <div style={S.right}>
            <div style={S.title}>{p.name}</div>

            <div style={S.meta}>
              <span><b>Brand:</b> {p.brand || "—"}</span>
              <span><b>Category:</b> {p.category || "—"}</span>
              <span><b>Pack:</b> {p.packSize || "—"}</span>
              <span><b>Manufacturer:</b> {p.manufacturer || "—"}</span>
            </div>

            <div style={S.priceRow}>
              <div style={S.price}>₹ {money(p.price)}</div>
              {!!p.mrp && <div style={S.mrp}>MRP ₹ {money(p.mrp)}</div>}
            </div>

            <div style={S.descTitle}>Description</div>
            <div style={S.desc}>{p.description || "—"}</div>

            {/* ✅ DETAILS TABLE */}
            <div style={S.specCard}>
              <div style={S.specTitle}>Product Details</div>
              <div style={S.specGrid}>
                <Spec label="SKU" value={p.sku || "—"} />
                <Spec label="Pack Size" value={p.packSize || "—"} />
                <Spec label="Category" value={p.category || "—"} />
                <Spec label="Stock" value={inStock ? String(p.stockQty) : "0"} />
              </div>
            </div>

            <div style={S.actions}>
              <button
                type="button"
                style={{
                  ...S.primaryBtn,
                  opacity: (!inStock || adding) ? 0.6 : 1,
                  cursor: (!inStock || adding) ? "not-allowed" : "pointer",
                }}
                disabled={!inStock || adding}
                onClick={addToCart}
              >
                {adding ? "Adding..." : inStock ? "Add to Cart" : "Out of Stock"}
              </button>

              <button type="button" style={S.secondaryBtn} onClick={() => navigate("/cart")}>
                Go to Cart
              </button>

              <button type="button" style={S.secondaryBtn} onClick={() => navigate("/products")}>
                Go to Products
              </button>
            </div>
          </div>
        </div>

        {/* ✅ RELATED PRODUCTS */}
        <div style={S.relWrap}>
          <div style={S.relHead}>
            <div style={S.relTitle}>Related Products</div>
            <div style={S.relSub}>More items in “{p.category || "same category"}”</div>
          </div>

          {relLoading ? (
            <div style={S.info}>Loading related products…</div>
          ) : related.length === 0 ? (
            <div style={S.info}>No related products found.</div>
          ) : (
            <div className="rel-grid">
              {related.map((rp) => {
                const img = imgUrl(rp?.images?.[0]);
                return (
                  <button
                    key={rp.id}
                    style={S.relCard}
                    onClick={() => navigate(`/products/${rp.id}`)}
                    type="button"
                  >
                    <div style={S.relImgWrap}>
                      <img
                        src={img || "https://via.placeholder.com/400x300?text=No+Image"}
                        alt={rp.name}
                        style={S.relImg}
                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400x300?text=No+Image")}
                      />
                      {rp?.badge ? <div style={S.relBadge}>{rp.badge}</div> : null}
                    </div>

                    <div style={S.relBody}>
                      <div style={S.relName}>{rp.name}</div>
                      <div style={S.relMeta}>
                        <span style={{ opacity: 0.85 }}>{rp.brand || "—"}</span>
                        <span style={{ color: "#ffd24a", fontWeight: 950 }}>₹ {money(rp.price)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div style={S.specItem}>
      <div style={S.specLabel}>{label}</div>
      <div style={S.specValue}>{value}</div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#040915 0%,#060c19 50%,#050914 100%)",
    color: "#e9eefc",
    padding: "18px 0 50px",
  },
  container: {
    width: "min(1200px, 100%)",
    margin: "0 auto",
    padding: "0 16px",
  },
  info: {
    width: "min(100%, 980px)",
    margin: "14px auto 0",
    padding: "14px 16px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
  },
  toast: {
    margin: "0 0 14px",
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
    flexWrap: "wrap",
  },
  backBtn: {
    border: "1px solid rgba(220,235,255,.18)",
    background: "rgba(15,23,42,.7)",
    color: "#e9eefc",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    overflow: "hidden",
  },
  left: { padding: 14, borderRight: "1px solid rgba(220,235,255,.10)" },
  right: { padding: 18 },

  imageBox: { position: "relative", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,.06)" },
  mainImg: { width: "100%", height: 420, objectFit: "cover", display: "block" },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    border: "1px solid rgba(255,210,74,.35)",
    background: "rgba(255,210,74,.12)",
    color: "#ffd24a",
  },
  stock: {
    position: "absolute",
    bottom: 12,
    left: 12,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    border: "1px solid rgba(220,235,255,.14)",
  },

  thumbs: { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" },
  thumbBtn: {
    width: 72,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  title: { fontSize: 26, fontWeight: 950, marginBottom: 10 },
  meta: { display: "grid", gap: 8, fontSize: 13, opacity: 0.9 },
  priceRow: { display: "flex", alignItems: "baseline", gap: 12, marginTop: 14, flexWrap: "wrap" },
  price: { fontSize: 28, fontWeight: 950, color: "#ffd24a" },
  mrp: { fontSize: 14, opacity: 0.7, textDecoration: "line-through" },

  descTitle: { marginTop: 16, fontSize: 14, fontWeight: 900, opacity: 0.9 },
  desc: { marginTop: 8, fontSize: 14, lineHeight: 1.6, opacity: 0.85 },

  specCard: {
    marginTop: 16,
    borderRadius: 14,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.05)",
    padding: 12,
  },
  specTitle: { fontWeight: 950, marginBottom: 10, opacity: 0.95 },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 10,
  },
  specItem: {
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.10)",
    background: "rgba(10,16,35,.55)",
    padding: 10,
  },
  specLabel: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
  specValue: { marginTop: 6, fontWeight: 900, opacity: 0.95 },

  actions: { marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" },
  primaryBtn: {
    border: 0,
    background: "#ffd24a",
    color: "#081023",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 950,
  },
  secondaryBtn: {
    border: "1px solid rgba(220,235,255,.18)",
    background: "rgba(15,23,42,.7)",
    color: "#e9eefc",
    padding: "12px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
  },

  // related
  relWrap: { marginTop: 18 },
  relHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  relTitle: { fontSize: 18, fontWeight: 950 },
  relSub: { fontSize: 12, opacity: 0.7 },

  relCard: {
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(12,18,36,.72)",
    borderRadius: 16,
    overflow: "hidden",
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },
  relImgWrap: { position: "relative", background: "rgba(255,255,255,.05)" },
  relImg: { width: "100%", height: 160, objectFit: "cover", display: "block" },
  relBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    border: "1px solid rgba(255,210,74,.35)",
    background: "rgba(255,210,74,.12)",
    color: "#ffd24a",
  },
  relBody: { padding: 12 },
  relName: {
    fontSize: 14,
    fontWeight: 950,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  relMeta: { marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 },
};
