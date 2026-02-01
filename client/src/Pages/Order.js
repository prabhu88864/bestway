import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function MyOrders() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState([]);
  const [openId, setOpenId] = useState(null);

  const money = (v) => {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return "0.00";
    return n.toFixed(2);
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const pillStyle = (status, paymentStatus) => {
    const s = String(status || "").toUpperCase();
    const p = String(paymentStatus || "").toUpperCase();

    if (p === "SUCCESS") return { bg: "rgba(47,210,107,.18)", bd: "rgba(47,210,107,.35)", tx: "#bdf8d1", label: "PAID" };
    if (p === "FAILED") return { bg: "rgba(255,90,90,.18)", bd: "rgba(255,90,90,.35)", tx: "#ffb4b4", label: "FAILED" };
    if (s === "DELIVERED") return { bg: "rgba(34,211,238,.18)", bd: "rgba(34,211,238,.35)", tx: "#c9fbff", label: "DELIVERED" };
    return { bg: "rgba(255,210,74,.14)", bd: "rgba(255,210,74,.35)", tx: "#ffe7a6", label: p === "PENDING" ? "PENDING" : s || "PENDING" };
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await axiosInstance.get("/api/orders");
      const list = res?.data?.orders || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const totalOrders = orders.length;
    const totalItems = orders.reduce((s, o) => s + Number((o?.OrderItems || []).length || 0), 0);
    const totalAmount = orders.reduce((s, o) => s + Number(o?.totalAmount || 0), 0);
    return { totalOrders, totalItems, totalAmount };
  }, [orders]);

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.container}>
        {/* HEADER */}
        <div style={S.hero}>
          <div>
            <div style={S.h1}>My Orders</div>
            <div style={S.sub}>Items + Address + Paid Amount</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => navigate(-1)}>← Back</button>
            <button style={S.btn} onClick={() => navigate("/products")}>Products</button>
            <button style={S.btn} onClick={loadOrders}>↻ Refresh</button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="sumGrid" style={S.summary}>
          <div style={S.sumCard}>
            <div style={S.sumLabel}>Orders</div>
            <div style={S.sumValue}>{totals.totalOrders}</div>
          </div>
          <div style={S.sumCard}>
            <div style={S.sumLabel}>Items</div>
            <div style={S.sumValue}>{totals.totalItems}</div>
          </div>
          <div style={S.sumCard}>
            <div style={S.sumLabel}>Total Paid</div>
            <div style={S.sumValue}>₹ {money(totals.totalAmount)}</div>
          </div>
        </div>

        {loading && <div style={S.info}>Loading orders…</div>}
        {err && <div style={{ ...S.info, color: "#ffb4b4" }}>{err}</div>}
        {!loading && !err && orders.length === 0 && <div style={S.info}>No orders found.</div>}

        {/* ORDERS LIST */}
        {!loading && !err && orders.length > 0 && (
          <div style={S.list}>
            {orders.map((o) => {
              const id = o?.id;
              const addr = o?.Address || null;
              const items = o?.OrderItems || [];
              const isOpen = String(openId) === String(id);

              const pill = pillStyle(o?.status, o?.paymentStatus);

              // paid amount display (simple)
              const paidAmount = money(o?.paymentStatus === "SUCCESS" ? o?.totalAmount : 0);

              return (
                <div key={id} style={S.orderCard}>
                  {/* TOP */}
                  <div className="orderTopGrid" style={S.orderTop}>
                    <div style={{ minWidth: 0 }}>
                      <div style={S.orderTitleRow}>
                        <div style={S.orderTitle}>Order #{id}</div>

                        <span
                          style={{
                            ...S.pill,
                            background: pill.bg,
                            borderColor: pill.bd,
                            color: pill.tx,
                          }}
                        >
                          {pill.label}
                        </span>
                      </div>

                      <div style={S.orderMeta}>
                        <span><b>Method:</b> {o?.paymentMethod || "—"}</span>
                        <span><b>Payment:</b> {o?.paymentStatus || "—"}</span>
                        <span><b>Status:</b> {o?.status || "—"}</span>
                      </div>

                      <div style={S.orderMeta2}>
                        <span><b>Created:</b> {fmtDate(o?.createdAt)}</span>
                        <span><b>Delivered:</b> {o?.deliveredOn ? fmtDate(o?.deliveredOn) : "—"}</span>
                      </div>
                    </div>

                    <div style={S.amountBox}>
                      <div style={S.amountLabel}>Total</div>
                      <div style={S.amountValue}>₹ {money(o?.totalAmount)}</div>

                      <div style={S.amountSub}>
                        Paid: <b style={{ color: "#bdf8d1" }}>₹ {paidAmount}</b>
                      </div>

                      <button
                        type="button"
                        style={S.smallBtn}
                        onClick={() => setOpenId(isOpen ? null : id)}
                      >
                        {isOpen ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>

                  {/* DETAILS */}
                  {isOpen && (
                    <div className="detailsGrid" style={S.detailsWrap}>
                      {/* ADDRESS */}
                      <div style={S.detailsCard}>
                        <div style={S.detailsTitle}>Delivery Address</div>

                        {!addr ? (
                          <div style={{ opacity: 0.8 }}>No address</div>
                        ) : (
                          <div style={S.addrText}>
                            <div style={{ fontWeight: 950 }}>
                              {addr.label || "Address"}{" "}
                              {addr.isDefault ? <span style={S.pillTiny}>DEFAULT</span> : null}
                            </div>

                            <div style={{ marginTop: 8, lineHeight: 1.5, opacity: 0.92 }}>
                              {addr.receiverFirstName} {addr.receiverLastName || ""} • {addr.receiverPhone}
                              <br />
                              {addr.house}, {addr.area}
                              {addr.landmark ? `, ${addr.landmark}` : ""} - {addr.pincode}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ITEMS (NO IMAGES) */}
                      <div style={S.detailsCard}>
                        <div style={S.detailsTitle}>Items ({items.length})</div>

                        {items.length === 0 ? (
                          <div style={{ opacity: 0.8 }}>No items</div>
                        ) : (
                          <div style={S.itemsGrid}>
                            {items.map((it) => {
                              const p = it?.Product || {};
                              const qty = Number(it?.qty || 0);
                              const price = Number(it?.price || p?.price || 0);
                              const lineTotal = price * qty;

                              return (
                                <div key={it?.id} style={S.itemRowTextOnly}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={S.itemNameText} title={p?.name || ""}>
                                      {p?.name || "—"}
                                    </div>
                                    <div style={S.itemSubText}>
                                      {p?.brand ? p.brand : "—"} {p?.category ? `• ${p.category}` : ""}
                                    </div>
                                  </div>

                                  <div style={S.itemRight}>
                                    <div style={S.itemQtyPill}>Qty: {qty}</div>
                                    <div style={S.itemLineTotal}>₹ {money(lineTotal)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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

  /* ✅ responsive grids */
  @media (max-width: 900px){
    .sumGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .orderTopGrid{ grid-template-columns: 1fr !important; }
    .detailsGrid{ grid-template-columns: 1fr !important; }
  }
  @media (max-width: 560px){
    .sumGrid{ grid-template-columns: 1fr !important; }
  }
`;

const S = {
  page: { minHeight: "100vh", color: "#e9eefc" },
  container: { width: "min(1200px, 100%)", margin: "0 auto", padding: "18px 16px 60px" },

  hero: {
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  h1: { fontSize: 34, fontWeight: 950 },
  sub: { marginTop: 6, fontSize: 13, opacity: 0.82 },

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },

  info: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    marginBottom: 10,
  },

  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  sumCard: {
    borderRadius: 16,
    padding: 14,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
  },
  sumLabel: { fontSize: 12, opacity: 0.75 },
  sumValue: { fontSize: 20, fontWeight: 950, marginTop: 6, color: "#ffd24a" },

  list: { display: "grid", gap: 12 },

  orderCard: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    overflow: "hidden",
  },

  orderTop: {
    padding: 14,
    display: "grid",
    gridTemplateColumns: "1fr 260px",
    gap: 14,
    alignItems: "start",
  },

  orderTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  orderTitle: { fontSize: 18, fontWeight: 950 },

  pill: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
  },

  orderMeta: {
    marginTop: 10,
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    fontSize: 12,
    opacity: 0.92,
  },
  orderMeta2: {
    marginTop: 8,
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    fontSize: 12,
    opacity: 0.82,
  },

  amountBox: {
    borderRadius: 16,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(10,16,35,.55)",
    padding: 12,
    display: "grid",
    gap: 6,
  },
  amountLabel: { fontSize: 12, opacity: 0.75 },
  amountValue: { fontSize: 18, fontWeight: 950, color: "#ffd24a" },
  amountSub: { fontSize: 12, opacity: 0.9 },

  smallBtn: {
    marginTop: 6,
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 950,
    cursor: "pointer",
  },

  detailsWrap: {
    borderTop: "1px solid rgba(220,235,255,.10)",
    padding: 14,
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 12,
  },

  detailsCard: {
    borderRadius: 16,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(10,16,35,.55)",
    padding: 12,
  },
  detailsTitle: { fontSize: 14, fontWeight: 950, marginBottom: 10 },

  addrText: { fontSize: 13 },
  pillTiny: {
    marginLeft: 8,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    border: "1px solid rgba(34,211,238,.35)",
    background: "rgba(34,211,238,.10)",
    color: "#bff7ff",
  },

  itemsGrid: { display: "grid", gap: 10 },

  itemRowTextOnly: {
    borderRadius: 14,
    border: "1px solid rgba(220,235,255,.10)",
    background: "rgba(255,255,255,.05)",
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  itemNameText: {
    fontWeight: 950,
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 520,
  },

  itemSubText: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.8,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  itemRight: { display: "grid", gap: 6, justifyItems: "end" },

  itemQtyPill: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(74,140,255,.35)",
    background: "rgba(74,140,255,.10)",
    color: "#a9c8ff",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  itemLineTotal: { fontWeight: 950, color: "#ffd24a", fontSize: 13 },
};
