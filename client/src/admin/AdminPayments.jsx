import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const STATUS = ["", "INITIATED", "SUCCESS", "FAILED"];
const PROVIDER = ["", "RAZORPAY", "WALLET", "COD"];
const PURPOSE = ["", "ORDER_PAYMENT", "WALLET_TOPUP"];

const fmt = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

const money = (v) => {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "₹0";
  return `₹${n.toFixed(2)}`;
};

const safe = (v) => (v == null ? "-" : String(v));

export default function AdminPayments() {
  const navigate = useNavigate();

  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 search
  const [search, setSearch] = useState("");

  // 🎛 filters (server side)
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState("");

  // expand
  const [openId, setOpenId] = useState(null);

  /* ================= AUTH + LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }

    fetchPayments({ search: "", status: "", provider: "", purpose: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= API ================= */
  const fetchPayments = async ({ search, status, provider, purpose }) => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/api/payments/admin", {
        params: {
          search: search?.trim() || undefined,
          status: status || undefined,
          provider: provider || undefined,
          purpose: purpose || undefined,
        },
      });

      const list = Array.isArray(res.data.payments) ? res.data.payments : [];
      setAllPayments(list);
    } catch (err) {
      console.log("GET /api/payments/admin error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      } else {
        alert(err?.response?.data?.msg || "Failed to load payments");
      }
    } finally {
      setLoading(false);
    }
  };

  /* 🔄 Debounced search + filter reload */
  useEffect(() => {
    const t = setTimeout(() => {
      fetchPayments({ search, status, provider, purpose });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, provider, purpose]);

  /* ================= CLIENT FILTER (optional extra smooth) ================= */
  const payments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPayments;

    return allPayments.filter((p) => {
      const pid = String(p.id || "");
      const rpOrder = String(p.razorpayOrderId || "").toLowerCase();
      const rpPay = String(p.razorpayPaymentId || "").toLowerCase();
      const oId = String(p.orderId || "");
      const uName = String(p.User?.name || "").toLowerCase();
      const uPhone = String(p.User?.phone || "");
      const st = String(p.status || "").toLowerCase();
      const prov = String(p.provider || "").toLowerCase();
      const pur = String(p.purpose || "").toLowerCase();

      return (
        pid.includes(q) ||
        oId.includes(q) ||
        rpOrder.includes(q) ||
        rpPay.includes(q) ||
        uName.includes(q) ||
        uPhone.includes(q) ||
        st.includes(q) ||
        prov.includes(q) ||
        pur.includes(q)
      );
    });
  }, [allPayments, search]);

  const total = payments.length;

  const pillStyle = (s) => {
    const v = String(s || "").toUpperCase();
    if (v === "SUCCESS") return { ...styles.pill, ...styles.pillSuccess };
    if (v === "FAILED") return { ...styles.pill, ...styles.pillFailed };
    if (v === "INITIATED") return { ...styles.pill, ...styles.pillInit };
    return styles.pill;
  };

  const toggleExpand = (id) => setOpenId((prev) => (prev === id ? null : id));

  const clearAll = () => {
    setSearch("");
    setStatus("");
    setProvider("");
    setPurpose("");
    setOpenId(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={{ margin: 0 }}>Payments</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
            ← Dashboard
          </button>
          <button onClick={clearAll} style={styles.btnSecondary}>
            Reset
          </button>
        </div>
      </div>

      {/* 🔍 SEARCH */}
      <div style={styles.searchBar}>
        <span style={{ opacity: 0.7 }}>🔍</span>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search paymentId / orderId / razorpay order/pay id / user / phone / status"
        />
        {search && (
          <button onClick={() => setSearch("")} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      {/* 🎛 Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.filterBox}>
          <div style={styles.filterLabel}>Status</div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
            {STATUS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s : "ALL"}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterBox}>
          <div style={styles.filterLabel}>Provider</div>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={styles.select}>
            {PROVIDER.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s : "ALL"}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterBox}>
          <div style={styles.filterLabel}>Purpose</div>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={styles.select}>
            {PURPOSE.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s.replaceAll("_", " ") : "ALL"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total Payments: <b>{total}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Pay ID",
                      "Purpose",
                      "Provider",
                      "Status",
                      "Amount",
                      "User",
                      "Phone",
                      "Order ID",
                      "Created",
                      "Details",
                    ].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={styles.empty}>
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <React.Fragment key={p.id}>
                        <tr>
                          <td style={styles.td}><b>#{p.id}</b></td>
                          <td style={styles.td}>{safe(p.purpose)?.replaceAll("_", " ")}</td>
                          <td style={styles.td}>{safe(p.provider)}</td>
                          <td style={styles.td}>
                            <span style={pillStyle(p.status)}>{safe(p.status)}</span>
                          </td>
                          <td style={styles.td}>{money(p.amount)}</td>
                          <td style={styles.td}>{p.User?.name || "-"}</td>
                          <td style={styles.td}>{p.User?.phone || "-"}</td>
                          <td style={styles.td}>
                            {p.orderId ? (
                              <span style={styles.linkLike} onClick={() => navigate(`/admin/orders?search=${p.orderId}`)}>
                                #{p.orderId}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={styles.td}>{fmt(p.createdAt)}</td>
                          <td style={styles.td}>
                            <button onClick={() => toggleExpand(p.id)} style={styles.addrBtn}>
                              {openId === p.id ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {openId === p.id && (
                          <tr>
                            <td colSpan={10} style={styles.expandCell}>
                              <div style={styles.expandBox}>
                                <div style={styles.detailsGrid}>
                                  <div style={styles.detailCard}>
                                    <div style={styles.detailTitle}>User</div>
                                    <div style={styles.detailLine}><b>{p.User?.name || "-"}</b></div>
                                    <div style={styles.detailLine}>{p.User?.email || "-"}</div>
                                    <div style={styles.detailLine}>Phone: <b>{p.User?.phone || "-"}</b></div>
                                    <div style={styles.detailLine}>User ID: <b>{p.userId}</b></div>
                                  </div>

                                  <div style={styles.detailCard}>
                                    <div style={styles.detailTitle}>Razorpay</div>
                                    <div style={styles.detailLine}>
                                      Razorpay Order: <b>{p.razorpayOrderId || "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Razorpay Pay: <b>{p.razorpayPaymentId || "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Signature: <span style={{ fontFamily: "monospace" }}>{p.razorpaySignature ? "✔ saved" : "-"}</span>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Failure Reason: <b>{p.failureReason || "-"}</b>
                                    </div>
                                  </div>

                                  <div style={styles.detailCard}>
                                    <div style={styles.detailTitle}>Order Snapshot</div>
                                    <div style={styles.detailLine}>Order ID: <b>{p.orderId || "-"}</b></div>
                                    <div style={styles.detailLine}>Order Status: <b>{p.Order?.status || "-"}</b></div>
                                    <div style={styles.detailLine}>Pay Method: <b>{p.Order?.paymentMethod || "-"}</b></div>
                                    <div style={styles.detailLine}>Pay Status: <b>{p.Order?.paymentStatus || "-"}</b></div>
                                  </div>
                                </div>

                                {/* RAW JSON */}
                                <div style={{ marginTop: 12 }}>
                                  <div style={styles.detailTitle}>Raw (debug)</div>
                                  <pre style={styles.pre}>
                                    {JSON.stringify(p.raw || {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, background: "#f4f6f8", minHeight: "100vh" },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
    flexWrap: "wrap",
  },

  btn: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#f3f3f3",
    fontWeight: 700,
  },
  btnSecondary: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: 700,
  },

  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 12,
    maxWidth: 900,
  },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 15 },
  clearBtn: {
    border: "none",
    background: "#eee",
    borderRadius: 8,
    cursor: "pointer",
    padding: "6px 8px",
  },

  filtersRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
    maxWidth: 1100,
  },
  filterBox: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 12,
    minWidth: 220,
  },
  filterLabel: { fontSize: 12, opacity: 0.75, marginBottom: 6, fontWeight: 800 },
  select: {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    background: "#fff",
  },

  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  info: { padding: 10 },
  meta: { marginBottom: 10, color: "#444" },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 1200 },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
    color: "#444",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #f2f2f2",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  empty: { padding: 16, textAlign: "center", color: "#666" },

  addrBtn: {
    border: "1px solid #ddd",
    background: "#f7f7f7",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
  },

  pill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    fontWeight: 800,
    fontSize: 12,
  },
  pillSuccess: { background: "#e6f4ea", borderColor: "#c9e6d1" },
  pillFailed: { background: "#fde7ea", borderColor: "#f4b9c2" },
  pillInit: { background: "#fff6e5", borderColor: "#f2d7a7" },

  expandCell: { background: "#fbfbfb", padding: 0, borderBottom: "1px solid #eee" },
  expandBox: { padding: 14 },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(240px, 1fr))",
    gap: 12,
  },
  detailCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
    minHeight: 120,
  },
  detailTitle: { fontWeight: 900, marginBottom: 8, color: "#333" },
  detailLine: { marginBottom: 6, color: "#333" },

  pre: {
    background: "#0b1020",
    color: "#e9eefc",
    padding: 12,
    borderRadius: 12,
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 12,
  },

  linkLike: {
    color: "#0b5cff",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "underline",
  },
};
