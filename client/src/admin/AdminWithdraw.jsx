import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const STATUS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

const fmt = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

const safe = (v, fallback = "-") =>
  v === null || v === undefined || v === "" ? fallback : v;

export default function AdminWithdrawals() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [openId, setOpenId] = useState(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [row, setRow] = useState(null);
  const [actionType, setActionType] = useState("APPROVE"); // APPROVE / REJECT
  const [transactionId, setTransactionId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing] = useState(false);

  /* ================= AUTH + LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }

    fetchWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= API ================= */
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/withdrawals");
      const list = Array.isArray(res?.data?.withdrawals)
        ? res.data.withdrawals
        : [];
      setItems(list);
    } catch (err) {
      console.log("withdrawals load error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      } else {
        alert(err?.response?.data?.msg || "Failed to load withdrawals");
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (w, type) => {
    setRow(w);
    setActionType(type);
    setTransactionId(w?.transactionId || "");
    setAdminNote(w?.adminNote || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setRow(null);
    setActionType("APPROVE");
    setTransactionId("");
    setAdminNote("");
    setActing(false);
  };

  const submitAction = async () => {
    if (!row?.id) return;

    const action = String(actionType || "").toUpperCase();
    if (action === "APPROVE" && !transactionId.trim()) {
      return alert("Transaction ID required for approve");
    }

    try {
      setActing(true);

      const res = await axiosInstance.put(`/api/withdrawals/${row.id}/action`, {
        action,
        transactionId: transactionId.trim() || undefined,
        adminNote: adminNote.trim() || undefined,
      });

      // ✅ if backend returns updated withdrawal object
      const updated = res?.data?.withdrawal || null;

      if (updated) {
        setItems((prev) =>
          prev.map((x) => (x.id === row.id ? { ...x, ...updated } : x))
        );
      } else {
        await fetchWithdrawals();
      }

      closeModal();
    } catch (err) {
      console.log("withdrawal action error", err);
      alert(err?.response?.data?.msg || "Failed to process withdrawal");
    } finally {
      setActing(false);
    }
  };

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((w) => {
      const st = String(w.status || "").toUpperCase();
      if (status !== "ALL" && st !== status) return false;

      if (!q) return true;

      const meta = w.meta || {};
      const s =
        [
          w.id,
          w.amount,
          w.transactionId,
          w.adminNote,
          st,
          meta.userId,
          meta.userName,
          meta.userEmail,
          meta.userPhone,
        ]
          .map((v) => String(v || ""))
          .join(" ")
          .toLowerCase();

      return s.includes(q);
    });
  }, [items, search, status]);

  const badgeStyle = (st) => {
    const s = String(st || "").toUpperCase();
    if (s === "PENDING")
      return { background: "#fff7e6", border: "1px solid #ffe2a8", color: "#8a5a00" };
    if (s === "APPROVED")
      return { background: "#e9f7ef", border: "1px solid #bfe6cf", color: "#17643a" };
    if (s === "REJECTED")
      return { background: "#fdecec", border: "1px solid #f6c0c0", color: "#8f1d1d" };
    return { background: "#f3f3f3", border: "1px solid #ddd", color: "#333" };
  };

  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Withdrawals</div>
          <div style={styles.subtitle}>Approve / Reject withdrawal requests</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => navigate("/admin/dashboard")}>
            ← Dashboard
          </button>
          <button style={styles.btn2} onClick={fetchWithdrawals} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchBar}>
          <span style={{ opacity: 0.7 }}>🔍</span>
          <input
            style={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user / phone / amount / status / txn"
          />
          {search ? (
            <button style={styles.clearBtn} onClick={() => setSearch("")}>
              ✕
            </button>
          ) : null}
        </div>

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total: <b>{filtered.length}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["ID", "User", "Phone", "Amount", "Status", "Requested", "Processed", "Action", "Details"].map(
                      (h) => (
                        <th key={h} style={styles.th}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={styles.empty}>
                        No withdrawals found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((w) => {
                      const meta = w.meta || {};
                      const canAction =
                        String(w.status || "").toUpperCase() === "PENDING";

                      return (
                        <React.Fragment key={w.id}>
                          <tr>
                            <td style={styles.td}>#{w.id}</td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 900 }}>
                                {safe(meta.userName)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                {safe(meta.userEmail)}
                              </div>
                            </td>

                            <td style={styles.td}>{safe(meta.userPhone)}</td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1000 }}>
                                {money(w.amount)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                Wallet: {safe(w.walletId)}
                              </div>
                            </td>

                            <td style={styles.td}>
                              <span style={{ ...styles.badge, ...badgeStyle(w.status) }}>
                                {String(w.status || "").toUpperCase()}
                              </span>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                                Txn: <b>{safe(w.transactionId, "—")}</b>
                              </div>
                            </td>

                            <td style={styles.td}>{fmt(w.createdAt)}</td>
                            <td style={styles.td}>{fmt(w.processedAt)}</td>

                            <td style={styles.td}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                  style={{
                                    ...styles.actionBtn,
                                    ...(canAction ? styles.approveBtn : styles.disabledBtn),
                                  }}
                                  disabled={!canAction}
                                  onClick={() => openModal(w, "APPROVE")}
                                >
                                  Approve
                                </button>

                                <button
                                  style={{
                                    ...styles.actionBtn,
                                    ...(canAction ? styles.rejectBtn : styles.disabledBtn),
                                  }}
                                  disabled={!canAction}
                                  onClick={() => openModal(w, "REJECT")}
                                >
                                  Reject
                                </button>
                              </div>

                              {w.adminNote ? (
                                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                                  Note: {w.adminNote}
                                </div>
                              ) : null}
                            </td>

                            <td style={styles.td}>
                              <button
                                style={styles.detailsBtn}
                                onClick={() => setOpenId((p) => (p === w.id ? null : w.id))}
                              >
                                {openId === w.id ? "Hide" : "View"}
                              </button>
                            </td>
                          </tr>

                          {openId === w.id && (
                            <tr>
                              <td colSpan={9} style={styles.expandCell}>
                                <div style={styles.expandBox}>
                                  <div style={styles.grid}>
                                    <div style={styles.panel}>
                                      <div style={styles.panelTitle}>Payout Details</div>

                                      <div style={styles.line}>
                                        <span style={styles.k}>User ID:</span>{" "}
                                        <b>{safe(meta.userId)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Name:</span>{" "}
                                        <b>{safe(meta.userName)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Email:</span> {safe(meta.userEmail)}
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Phone:</span> {safe(meta.userPhone)}
                                      </div>

                                      <div style={styles.hr} />

                                      <div style={styles.panelTitle2}>Bank Details</div>
                                      {w.bankDetails ? (
                                        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                          <div>
                                            <span style={styles.k}>Holder:</span>{" "}
                                            {safe(w.bankDetails.accountHolderName)}
                                          </div>
                                          <div>
                                            <span style={styles.k}>Acc No:</span>{" "}
                                            {safe(w.bankDetails.accountNumber)}
                                          </div>
                                          <div>
                                            <span style={styles.k}>IFSC:</span>{" "}
                                            {safe(w.bankDetails.ifsc)}
                                          </div>
                                          <div>
                                            <span style={styles.k}>Bank:</span>{" "}
                                            {safe(w.bankDetails.bankName)}
                                          </div>
                                          <div>
                                            <span style={styles.k}>UPI:</span>{" "}
                                            {safe(w.bankDetails.upiId, "—")}
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ opacity: 0.85 }}>
                                          No bank details
                                        </div>
                                      )}
                                    </div>

                                    <div style={styles.panel}>
                                      <div style={styles.panelTitle}>Wallet Summary</div>

                                      <div style={styles.row3}>
                                        <div style={styles.kpi}>
                                          <div style={styles.kpiLabel}>Balance</div>
                                          <div style={styles.kpiValue}>
                                            {money(w.wallet?.balance)}
                                          </div>
                                        </div>
                                        <div style={styles.kpi}>
                                          <div style={styles.kpiLabel}>Locked</div>
                                          <div style={styles.kpiValue}>
                                            {money(w.wallet?.lockedBalance)}
                                          </div>
                                        </div>
                                        <div style={styles.kpi}>
                                          <div style={styles.kpiLabel}>Total</div>
                                          <div style={styles.kpiValue}>
                                            {money(w.wallet?.totalBalance)}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={styles.hr} />

                                      <div style={styles.panelTitle2}>Processed Info</div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Processed At:</span>{" "}
                                        {fmt(w.processedAt)}
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Transaction ID:</span>{" "}
                                        {safe(w.transactionId, "—")}
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Admin Note:</span>{" "}
                                        {safe(w.adminNote, "—")}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={styles.backdrop} onMouseDown={closeModal}>
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalTop}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {actionType === "APPROVE" ? "Approve Withdrawal" : "Reject Withdrawal"}
              </div>
              <button onClick={closeModal} style={styles.xBtn}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>
              Withdrawal <b>#{row?.id}</b> • Amount <b>{money(row?.amount)}</b>
            </div>

            <div style={styles.form}>
              <label style={styles.label}>Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                style={styles.input}
                disabled={acting}
              >
                <option value="APPROVE">APPROVE</option>
                <option value="REJECT">REJECT</option>
              </select>

              <label style={styles.label}>
                Transaction ID {actionType === "APPROVE" ? "*" : "(optional)"}
              </label>
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                style={styles.input}
                placeholder="Example: RZP_PAYOUT_123"
                disabled={acting}
              />

              <label style={styles.label}>Admin Note (optional)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                placeholder="Example: Processed successfully"
                disabled={acting}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <button style={styles.btn} onClick={closeModal} disabled={acting}>
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.btnPrimary,
                    ...(acting ? styles.btnDisabled : {}),
                  }}
                  onClick={submitAction}
                  disabled={acting}
                >
                  {acting ? "Processing..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive tweak */}
      <style>{`
        @media (max-width: 900px){
          .__wd_grid_fix { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 18, background: "#f4f6f8", minHeight: "100vh" },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: 1000, letterSpacing: 0.2 },
  subtitle: { fontSize: 13, opacity: 0.75, marginTop: 2 },

  btn: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 12,
    border: "1px solid #dcdcdc",
    background: "#fff",
    fontWeight: 900,
  },
  btn2: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 12,
    border: "1px solid #dcdcdc",
    background: "#f7f7f7",
    fontWeight: 900,
  },
  btnPrimary: {
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: 12,
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 1000,
  },
  btnDisabled: { opacity: 0.7, cursor: "not-allowed" },

  controls: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 12,
  },

  searchBar: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: "12px 14px",
    maxWidth: 820,
    minWidth: 260,
  },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 15 },
  clearBtn: {
    border: "none",
    background: "#eee",
    borderRadius: 10,
    cursor: "pointer",
    padding: "6px 10px",
    fontWeight: 1000,
  },
  select: {
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    outline: "none",
    minWidth: 180,
    fontWeight: 900,
  },

  card: {
    background: "#fff",
    borderRadius: 14,
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
  },
  empty: { padding: 16, textAlign: "center", color: "#666" },

  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.3,
  },

  actionBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
  },
  approveBtn: { border: "1px solid #bfe6cf", background: "#e9f7ef" },
  rejectBtn: { border: "1px solid #f6c0c0", background: "#fdecec" },
  disabledBtn: { opacity: 0.55, cursor: "not-allowed" },

  detailsBtn: {
    border: "1px solid #ddd",
    background: "#f7f7f7",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 1000,
  },

  expandCell: { background: "#fbfbfb", padding: 0, borderBottom: "1px solid #eee" },
  expandBox: { padding: 14 },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  panel: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
  },
  panelTitle: { fontWeight: 1000, marginBottom: 10, color: "#111", fontSize: 14 },
  panelTitle2: { fontWeight: 1000, marginBottom: 6, color: "#111", fontSize: 13 },

  line: { fontSize: 13, marginBottom: 6, color: "#222" },
  k: { opacity: 0.7, fontWeight: 900 },

  hr: { height: 1, background: "#eee", margin: "10px 0" },

  row3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 6,
  },
  kpi: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 10,
    background: "#fafafa",
  },
  kpiLabel: { fontSize: 12, opacity: 0.75, fontWeight: 1000 },
  kpiValue: { fontSize: 16, fontWeight: 1100, marginTop: 4 },

  // modal
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #eee",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
    padding: 14,
  },
  modalTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  xBtn: {
    border: "1px solid #ddd",
    background: "#f7f7f7",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 1100,
  },
  form: { marginTop: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 1000, margin: "10px 0 6px", opacity: 0.8 },
  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
};
