import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const TYPE = ["", "CREDIT", "DEBIT"];
const REASON = ["", "ORDER_PAYMENT", "WALLET_TOPUP"];

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
  if (Number.isNaN(n)) return "₹0.00";
  return `₹${n.toFixed(2)}`;
};

const safe = (v) => (v == null ? "-" : String(v));

export default function AdminWalletTransactions() {
  const navigate = useNavigate();

  const [allTxns, setAllTxns] = useState([]);
  const [loading, setLoading] = useState(false);

  // search + filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [reason, setReason] = useState("");

  // expand row
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

    fetchTxns({ search: "", type: "", reason: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTxns = async ({ search, type, reason }) => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/api/wallet/admin", {
        params: {
          search: search?.trim() || undefined,
          type: type || undefined,
          reason: reason || undefined,
        },
      });

      setAllTxns(Array.isArray(res.data.transactions) ? res.data.transactions : []);
    } catch (err) {
      console.log("GET /api/wallet-transactions/admin error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      } else {
        alert(err?.response?.data?.msg || "Failed to load wallet transactions");
      }
    } finally {
      setLoading(false);
    }
  };

  /* 🔄 Debounced reload */
  useEffect(() => {
    const t = setTimeout(() => {
      fetchTxns({ search, type, reason });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, reason]);

  /* ================= CLIENT FILTER (extra smooth) ================= */
  const txns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTxns;

    return allTxns.filter((t) => {
      const id = String(t.id || "");
      const wid = String(t.walletId || "");
      const oid = String(t.orderId || "");
      const amt = String(t.amount || "");
      const tp = String(t.type || "").toLowerCase();
      const rs = String(t.reason || "").toLowerCase();
      const uname = String(t.Wallet?.User?.name || "").toLowerCase();
      const uemail = String(t.Wallet?.User?.email || "").toLowerCase();
      const phone = String(t.Wallet?.User?.phone || "");

      return (
        id.includes(q) ||
        wid.includes(q) ||
        oid.includes(q) ||
        amt.includes(q) ||
        tp.includes(q) ||
        rs.includes(q) ||
        uname.includes(q) ||
        uemail.includes(q) ||
        phone.includes(q)
      );
    });
  }, [allTxns, search]);

  const total = txns.length;

  const pill = (t) => {
    const v = String(t || "").toUpperCase();
    if (v === "CREDIT") return { ...styles.pill, ...styles.pillCredit };
    if (v === "DEBIT") return { ...styles.pill, ...styles.pillDebit };
    return styles.pill;
  };

  const toggleExpand = (id) => setOpenId((p) => (p === id ? null : id));

  const clearAll = () => {
    setSearch("");
    setType("");
    setReason("");
    setOpenId(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={{ margin: 0 }}>Wallet Transactions</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
            ← Dashboard
          </button>
          <button onClick={clearAll} style={styles.btnSecondary}>
            Reset
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div style={styles.searchBar}>
        <span style={{ opacity: 0.7 }}>🔍</span>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search txnId / walletId / orderId / user / phone / amount"
        />
        {search && (
          <button onClick={() => setSearch("")} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.filterBox}>
          <div style={styles.filterLabel}>Type</div>
          <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select}>
            {TYPE.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s : "ALL"}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterBox}>
          <div style={styles.filterLabel}>Reason</div>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={styles.select}>
            {REASON.map((s) => (
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
              Total Transactions: <b>{total}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Txn ID",
                      "Type",
                      "Reason",
                      "Amount",
                      "User",
                      "Phone",
                      "Wallet ID",
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
                  {txns.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={styles.empty}>
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    txns.map((t) => (
                      <React.Fragment key={t.id}>
                        <tr>
                          <td style={styles.td}>
                            <b>#{t.id}</b>
                          </td>

                          <td style={styles.td}>
                            <span style={pill(t.type)}>{safe(t.type)}</span>
                          </td>

                          <td style={styles.td}>{safe(t.reason)?.replaceAll("_", " ")}</td>

                          <td style={styles.td}>{money(t.amount)}</td>

                          <td style={styles.td}>{t.Wallet?.User?.name || "-"}</td>

                          <td style={styles.td}>{t.Wallet?.User?.phone || "-"}</td>

                          <td style={styles.td}>#{safe(t.walletId)}</td>

                          <td style={styles.td}>
                            {t.orderId ? (
                              <span
                                style={styles.linkLike}
                                onClick={() => navigate(`/admin/orders?search=${t.orderId}`)}
                              >
                                #{t.orderId}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td style={styles.td}>{fmt(t.createdAt)}</td>

                          <td style={styles.td}>
                            <button onClick={() => toggleExpand(t.id)} style={styles.addrBtn}>
                              {openId === t.id ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {openId === t.id && (
                          <tr>
                            <td colSpan={10} style={styles.expandCell}>
                              <div style={styles.expandBox}>
                                <div style={styles.detailsGrid}>
                                  <div style={styles.detailCard}>
                                    <div style={styles.detailTitle}>User</div>
                                    <div style={styles.detailLine}>
                                      <b>{t.Wallet?.User?.name || "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>{t.Wallet?.User?.email || "-"}</div>
                                    <div style={styles.detailLine}>
                                      Phone: <b>{t.Wallet?.User?.phone || "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      User ID: <b>{t.Wallet?.User?.id || "-"}</b>
                                    </div>
                                  </div>

                                  <div style={styles.detailCard}>
                                    <div style={styles.detailTitle}>Wallet</div>
                                    <div style={styles.detailLine}>
                                      Wallet ID: <b>#{t.walletId}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Type: <b>{safe(t.type)}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Reason: <b>{safe(t.reason)}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Amount: <b>{money(t.amount)}</b>
                                    </div>
                                  </div>

                                  <div style={styles.detailCard}>
                                    <div style={styles.detailTitle}>Order (optional)</div>
                                    <div style={styles.detailLine}>
                                      Order ID: <b>{t.orderId ? `#${t.orderId}` : "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Order Status: <b>{t.Order?.status || "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Pay Method: <b>{t.Order?.paymentMethod || "-"}</b>
                                    </div>
                                    <div style={styles.detailLine}>
                                      Pay Status: <b>{t.Order?.paymentStatus || "-"}</b>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                  <div style={styles.detailTitle}>Raw (debug)</div>
                                  <pre style={styles.pre}>{JSON.stringify(t, null, 2)}</pre>
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
  pillCredit: { background: "#e6f4ea", borderColor: "#c9e6d1" },
  pillDebit: { background: "#fde7ea", borderColor: "#f4b9c2" },

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
