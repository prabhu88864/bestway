import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const BADGE_ORDER = ["POPULAR", "NEW_ARRIVAL", "BEST_SELLER", "TRENDING", "LIMITED_OFFER"];

export default function ProductsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ cart map: productId -> { cartItemId, qty }
  const [cartMap, setCartMap] = useState({});
  const [busyKey, setBusyKey] = useState("");

  const [toast, setToast] = useState("");

  // ✅ Build ORIGIN
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
    showToast._t = window.setTimeout(() => setToast(""), 1800);
  };

  // ---------------- LOAD PRODUCTS ----------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await axiosInstance.get("/api/products");
        const list = Array.isArray(res.data) ? res.data : res.data?.products || [];
        if (mounted) setProducts(list);
      } catch (e) {
        if (mounted) setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, []);

  // ---------------- LOAD CART (for qty controls) ----------------
  const loadCart = async () => {
    try {
      const res = await axiosInstance.get("/api/cart");
      const d = res.data || {};
      const items = (d.CartItems || d.cartItems || d.items || []) ?? [];

      const next = {};
      for (const it of items) {
        const p = it?.product || it?.Product || it?.productDetails || {};
        const pid = p?.id ?? it?.productId ?? it?.ProductId ?? it?.product_id;
        const cartItemId = it?.id ?? it?.cartItemId ?? it?._id;
        const qty = Number(it?.qty ?? it?.quantity ?? it?.cartQty ?? 1);

        if (pid != null) next[String(pid)] = { cartItemId, qty };
      }
      setCartMap(next);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) loadCart();
  }, []);

  // ---------------- API ACTIONS ----------------
  const addToCart = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setBusyKey(`add:${productId}`);
      await axiosInstance.post("/api/cart", { productId });
      await loadCart();
      showToast("✅ Added to cart");
    } catch (er) {
      const msg = er?.response?.data?.msg || er?.response?.data?.message || er?.message || "Add to cart failed";
      showToast(`❌ ${msg}`);
    } finally {
      setBusyKey("");
    }
  };

  const updateCartQty = async (e, productId, newQty) => {
    e.preventDefault();
    e.stopPropagation();

    const pid = String(productId);
    const row = cartMap[pid];

    if (!row?.cartItemId) {
      if (newQty >= 1) return addToCart(e, productId);
      return;
    }
    if (newQty < 1) return; // no delete here

    try {
      setBusyKey(`qty:${productId}`);
      await axiosInstance.put(`/api/cart/${row.cartItemId}`, { qty: newQty });

      setCartMap((prev) => ({
        ...prev,
        [pid]: { ...prev[pid], qty: newQty },
      }));
    } catch (er) {
      const msg = er?.response?.data?.msg || er?.response?.data?.message || er?.message || "Qty update failed";
      showToast(`❌ ${msg}`);
      await loadCart();
    } finally {
      setBusyKey("");
    }
  };

  // ✅ Group by badge
  const grouped = useMemo(() => {
    const active = (products || []).filter((p) => p?.isActive !== false);

    const map = new Map();
    for (const p of active) {
      const b = p?.badge || "OTHER";
      if (!map.has(b)) map.set(b, []);
      map.get(b).push(p);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
      map.set(k, arr);
    }

    const orderedKeys = [
      ...BADGE_ORDER.filter((k) => map.has(k)),
      ...Array.from(map.keys()).filter((k) => !BADGE_ORDER.includes(k)),
    ];

    return orderedKeys.map((badge) => ({ badge, items: map.get(badge) || [] }));
  }, [products]);

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.fullBleed}>
        <div style={S.container}>
          {/* HEADER */}
          <div style={S.hero}>
            <div>
              <div style={S.h1}>Products</div>
              <div style={S.sub}>Image • Name • Price • Add / + / −</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={S.topBtn} onClick={() => loadCart()}>
                ↻ Sync Qty
              </button>
              <button style={S.topBtn} onClick={() => navigate("/Cart")}>
                🛒 Cart
              </button>
            </div>
          </div>

          {toast && <div style={S.toast}>{toast}</div>}

          {loading && <div style={S.info}>Loading…</div>}
          {err && <div style={{ ...S.info, color: "#ffb4b4" }}>{err}</div>}
          {!loading && !err && grouped.length === 0 && <div style={S.info}>No products found.</div>}

          {!loading &&
            !err &&
            grouped.map((section) => (
              <ProductSection
                key={section.badge}
                title={prettyBadge(section.badge)}
                badge={section.badge}
                items={section.items}
                money={money}
                imgUrl={imgUrl}
                cartMap={cartMap}
                busyKey={busyKey}
                onAdd={addToCart}
                onQty={updateCartQty}
                onOpen={(id) => navigate(`/ProductDetails/${id}`)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function ProductSection({ title, badge, items, money, imgUrl, cartMap, busyKey, onAdd, onQty, onOpen }) {
  if (!items?.length) return null;

  return (
    <div style={S.section}>
      <div style={S.sectionHead}>
        <div>
          <div className="sectionTitle" style={S.sectionTitle}>
            {title}
          </div>
          <div style={S.sectionSub}>
            Badge: <span style={{ color: "#e9eefc", fontWeight: 900 }}>{badge}</span>
          </div>
        </div>
      </div>

      <div style={S.panel}>
        <div className="gridWrap" role="list">
          {items.map((p) => {
            const inStock = Number(p?.stockQty || 0) > 0;
            const pid = String(p?.id);
            const row = cartMap[pid];
            const qty = Number(row?.qty || 0);

            const isBusy = busyKey === `add:${p.id}` || busyKey === `qty:${p.id}`;

            const firstImage = p?.images?.[0];
            const image = imgUrl(firstImage);

            return (
              <button
                key={p.id}
                className="cardBtn"
                style={S.cardBtn}
                type="button"
                onClick={() => onOpen(p.id)}
                title="Open"
              >
                <div style={S.card}>
                  {/* ✅ IMAGE */}
                  <div style={S.imgWrap}>
                    <img
                      src={image || "https://via.placeholder.com/600x400?text=No+Image"}
                      alt={p?.name || "Product"}
                      style={S.img}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/600x400?text=No+Image";
                      }}
                    />
                    {/* small stock pill */}
                    <div
                      style={{
                        ...S.stockPill,
                        background: inStock ? "rgba(47,210,107,.18)" : "rgba(255,90,90,.18)",
                        borderColor: inStock ? "rgba(47,210,107,.35)" : "rgba(255,90,90,.35)",
                        color: inStock ? "#9ff0be" : "#ffb4b4",
                      }}
                    >
                      {inStock ? `Stock: ${p.stockQty}` : "Out"}
                    </div>
                  </div>

                  {/* ✅ BIGGER BODY BOX (you asked increase size) */}
                  <div style={S.body}>
                    <div style={S.name} title={p.name}>
                      {p.name}
                    </div>

                    <div style={S.priceRow}>
                      <div style={S.price}>₹ {money(p.price)}</div>
                      {p?.mrp ? <div style={S.mrp}>₹ {money(p.mrp)}</div> : <div />}
                    </div>

                    <div style={S.controlsRow}>
                      {!inStock ? (
                        <div style={S.oos}>Out of stock</div>
                      ) : qty <= 0 ? (
                        <button
                          type="button"
                          onClick={(e) => onAdd(e, p.id)}
                          disabled={isBusy}
                          style={{
                            ...S.addBtn,
                            opacity: isBusy ? 0.7 : 1,
                            cursor: isBusy ? "not-allowed" : "pointer",
                          }}
                        >
                          {isBusy ? "Adding…" : "Add"}
                        </button>
                      ) : (
                        <div
                          style={S.qtyBox}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            style={{ ...S.qtyBtn, opacity: isBusy ? 0.6 : 1 }}
                            disabled={isBusy}
                            onClick={(e) => onQty(e, p.id, qty - 1)}
                            title="Decrease"
                          >
                            −
                          </button>

                          <div style={S.qtyValue}>{qty}</div>

                          <button
                            type="button"
                            style={{ ...S.qtyBtn, opacity: isBusy ? 0.6 : 1 }}
                            disabled={isBusy}
                            onClick={(e) => onQty(e, p.id, qty + 1)}
                            title="Increase"
                          >
                            +
                          </button>
                        </div>
                      )}

                      <div style={S.tapText}>Tap for details</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function prettyBadge(b) {
  if (!b) return "Items";
  return String(b).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const css = `
  *{ margin:0; padding:0; box-sizing:border-box; }
  html,body,#root{ height:100%; width:100%; }
  body{
    overflow-x:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
    background: linear-gradient(180deg,#040915 0%,#060c19 50%,#050914 100%);
    color: #e9eefc;
  }
  button{ font-family: inherit; }

  /* ✅ Desktop 6 columns, Mobile 3 columns */
  .gridWrap{
    display:grid;
    gap: 12px;
    padding: 12px;
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  @media (max-width: 1200px){
    .gridWrap{ grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (max-width: 900px){
    .gridWrap{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .sectionTitle{ font-size: 22px !important; }
  }
  @media (max-width: 560px){
    .gridWrap{ grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 10px; }
  }

  .cardBtn{
    width:100%;
    border:0;
    padding:0;
    background:transparent;
    cursor:pointer;
    text-align:left;
  }
  .cardBtn:focus{
    outline: 2px solid rgba(74,140,255,.55);
    outline-offset: 2px;
    border-radius: 18px;
  }
`;

const S = {
  page: {
    minHeight: "100vh",
    color: "#e9eefc",
    background: "linear-gradient(180deg,#040915 0%,#060c19 50%,#050914 100%)",
  },
  fullBleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    overflow: "hidden",
    padding: "18px 0 60px",
  },
  container: {
    width: "min(1400px, 100%)",
    margin: "0 auto",
    padding: "0 16px",
  },

  hero: {
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  h1: { fontSize: 34, fontWeight: 950, color: "#e9eefc" },
  sub: { marginTop: 6, fontSize: 13, opacity: 0.85, color: "rgba(233,238,252,.85)" },

  topBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },

  toast: {
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    color: "#e9eefc",
  },

  info: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    marginBottom: 14,
    color: "#e9eefc",
  },

  section: { marginTop: 18 },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    padding: "0 4px",
  },
  sectionTitle: { fontSize: 26, fontWeight: 950, color: "#e9eefc" },
  sectionSub: { marginTop: 6, fontSize: 13, opacity: 0.85, color: "rgba(233,238,252,.85)" },

  panel: {
    marginTop: 12,
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.65)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    overflow: "hidden",
  },

  cardBtn: {},

  card: {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    boxShadow: "0 10px 24px rgba(0,0,0,.22)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  /* ✅ bigger image space */
  imgWrap: { position: "relative", height: 150, background: "rgba(255,255,255,.04)" },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  stockPill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    border: "1px solid rgba(220,235,255,.14)",
    backdropFilter: "blur(6px)",
  },

  /* ✅ increased size below image */
  body: { padding: 14, color: "#e9eefc", minHeight: 150 },

  name: {
    fontSize: 14,
    fontWeight: 950,
    color: "#e9eefc",
    lineHeight: 1.2,
    minHeight: 36,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  priceRow: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  price: { fontSize: 16, fontWeight: 950, color: "#ffd24a" },
  mrp: { fontSize: 11, color: "rgba(233,238,252,.65)", textDecoration: "line-through" },

  controlsRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },

  addBtn: {
    width: "100%",
    padding: "11px 10px",
    borderRadius: 12,
    border: "1px solid rgba(74,140,255,.35)",
    background: "rgba(74,140,255,.12)",
    color: "#e9eefc",
    fontWeight: 950,
    fontSize: 13,
  },

  qtyBox: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "46px 1fr 46px",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
  },
  qtyBtn: {
    height: 42,
    border: "none",
    background: "rgba(255,255,255,.05)",
    color: "#e9eefc",
    fontSize: 20,
    fontWeight: 950,
    cursor: "pointer",
  },
  qtyValue: {
    height: 42,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    color: "#e9eefc",
    fontSize: 14,
  },

  tapText: { fontSize: 12, color: "rgba(233,238,252,.75)" },

  oos: {
    width: "100%",
    padding: "11px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,90,90,.35)",
    background: "rgba(255,90,90,.12)",
    color: "#ffb4b4",
    fontWeight: 950,
    fontSize: 13,
    textAlign: "center",
  },
};
