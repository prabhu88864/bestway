// src/pages/AdminAwardAchievements.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * APIs you gave:
 * GET  /api/awards/admin/achievements
 * PUT  /api/awards/admin/achievements/:id/status
 * Body:
 *  {
 *    "giftStatus": "APPROVED" | "PENDING" | "REJECTED" | "DELIVERED",
 *    "meta": { "remarks": "..." }
 *  }
 */

const STATUS = ["ALL", "PENDING", "APPROVED", "REJECTED", "DELIVERED", "HOLD"];

const safe = (v, fb = "-") => (v === null || v === undefined || v === "" ? fb : v);

const fmt = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

export default function AdminAwardAchievements() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [openId, setOpenId] = useState(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [row, setRow] = useState(null);
  const [giftStatus, setGiftStatus] = useState("APPROVED");
  const [remarks, setRemarks] = useState("");
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

    fetchAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= API ================= */
  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/awards/admin/achievements");

      const list = Array.isArray(res?.data?.achievements)
        ? res.data.achievements
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setItems(list);
    } catch (err) {
      console.log("achievements load error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      } else {
        alert(err?.response?.data?.msg || "Failed to load achievements");
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (a) => {
    setRow(a);
    setGiftStatus(String(a?.giftStatus || "APPROVED").toUpperCase());
    setRemarks(String(a?.meta?.remarks || a?.remarks || ""));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setRow(null);
    setGiftStatus("APPROVED");
    setRemarks("");
    setActing(false);
  };

  const badgeStyle = (st) => {
    const s = String(st || "").toUpperCase();
    if (s === "PENDING")
      return { background: "#fff7e6", border: "1px solid #ffe2a8", color: "#8a5a00" };
    if (s === "APPROVED")
      return { background: "#e9f7ef", border: "1px solid #bfe6cf", color: "#17643a" };
    if (s === "DELIVERED")
      return { background: "#e6f0ff", border: "1px solid #b9d5ff", color: "#1d4ed8" };
    if (s === "REJECTED" || s === "HOLD")
      return { background: "#fdecec", border: "1px solid #f6c0c0", color: "#8f1d1d" };
    return { background: "#f3f3f3", border: "1px solid #ddd", color: "#333" };
  };

  const submitStatus = async () => {
    if (!row?.id) return;

    const st = String(giftStatus || "").toUpperCase();
    if (!st || st === "ALL") return alert("Select valid giftStatus");

    try {
      setActing(true);

      const res = await axiosInstance.put(
        `/api/awards/admin/achievements/${row.id}/status`,
        {
          giftStatus: st,
          meta: { remarks: remarks.trim() || "" },
        }
      );

      const updated = res?.data?.achievement || res?.data?.data || res?.data || null;

      if (updated) {
        setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...updated } : x)));
      } else {
        // fallback refresh
        await fetchAchievements();
      }

      closeModal();
    } catch (err) {
      console.log("achievement status update error", err);
      alert(err?.response?.data?.msg || "Failed to update status");
    } finally {
      setActing(false);
    }
  };

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((a) => {
      const st = String(a?.giftStatus || a?.status || "").toUpperCase();
      if (status !== "ALL" && st !== status) return false;

      if (!q) return true;

      const meta = a?.meta || {};
      const user = a?.user || {}; // if backend includes user object
      const setting = a?.setting || {}; // if backend includes setting object

      const s = [
        a?.id,
        a?.userId,
        user?.name,
        user?.email,
        user?.phone,
        a?.pairsRequired,
        a?.cashReward,
        a?.giftName,
        setting?.pairsRequired,
        setting?.cashReward,
        setting?.giftName,
        st,
        meta?.remarks,
      ]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();

      return s.includes(q);
    });
  }, [items, search, status]);

  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Award Achievements</div>
          <div style={styles.subtitle}>Admin can approve/reject/deliver gift status</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => navigate("/admin/dashboard")}>
            ← Dashboard
          </button>
          <button style={styles.btn2} onClick={fetchAchievements} disabled={loading}>
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
            placeholder="Search user / pairs / gift / cash / remarks / status"
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
                    {["ID", "User", "Pairs", "Cash", "Gift", "Status", "Achieved", "Action", "Details"].map(
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
                        No achievements found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const st = String(a?.giftStatus || a?.status || "").toUpperCase();
                      const user = a?.user || {};
                      const meta = a?.meta || {};

                      const pairs = a?.pairsRequired ?? a?.setting?.pairsRequired ?? "-";
                      const cash = a?.cashReward ?? a?.setting?.cashReward ?? 0;
                      const gift = a?.giftName ?? a?.setting?.giftName ?? "-";

                      return (
                        <React.Fragment key={a.id}>
                          <tr>
                            <td style={styles.td}>#{a.id}</td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 900 }}>
                                {safe(user?.name || a?.userName)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                {safe(user?.email || a?.userEmail)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                {safe(user?.phone || a?.userPhone)}
                              </div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1100 }}>{safe(pairs)}</div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>pairs</div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1100 }}>{money(cash)}</div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>reward</div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1000 }}>{safe(gift)}</div>
                            </td>

                            <td style={styles.td}>
                              <span style={{ ...styles.badge, ...badgeStyle(st) }}>{safe(st, "—")}</span>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                                Remarks: <b>{safe(meta?.remarks, "—")}</b>
                              </div>
                            </td>

                            <td style={styles.td}>{fmt(a?.createdAt || a?.achievedAt)}</td>

                            <td style={styles.td}>
                              <button style={styles.actionBtn} onClick={() => openModal(a)}>
                                Update Status
                              </button>
                            </td>

                            <td style={styles.td}>
                              <button
                                style={styles.detailsBtn}
                                onClick={() => setOpenId((p) => (p === a.id ? null : a.id))}
                              >
                                {openId === a.id ? "Hide" : "View"}
                              </button>
                            </td>
                          </tr>

                          {openId === a.id && (
                            <tr>
                              <td colSpan={9} style={styles.expandCell}>
                                <div style={styles.expandBox}>
                                  <div className="__ach_grid_fix" style={styles.grid}>
                                    <div style={styles.panel}>
                                      <div style={styles.panelTitle}>Achievement Details</div>

                                      <div style={styles.line}>
                                        <span style={styles.k}>Achievement ID:</span> <b>{safe(a?.id)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>User ID:</span> <b>{safe(a?.userId)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Pairs Required:</span> <b>{safe(pairs)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Cash Reward:</span> <b>{money(cash)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Gift Name:</span> <b>{safe(gift)}</b>
                                      </div>
                                    </div>

                                    <div style={styles.panel}>
                                      <div style={styles.panelTitle}>Status + Meta</div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Gift Status:</span> <b>{safe(st, "—")}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Remarks:</span> <b>{safe(meta?.remarks, "—")}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Updated At:</span>{" "}
                                        <b>{fmt(a?.updatedAt)}</b>
                                      </div>

                                      {a?.meta ? (
                                        <>
                                          <div style={styles.hr} />
                                          <div style={{ fontSize: 12, opacity: 0.85 }}>
                                            Meta JSON:
                                          </div>
                                          <pre style={styles.pre}>
                                            {JSON.stringify(a.meta, null, 2)}
                                          </pre>
                                        </>
                                      ) : null}
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
              <div style={{ fontWeight: 1100, fontSize: 16 }}>Update Gift Status</div>
              <button onClick={closeModal} style={styles.xBtn}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>
              Achievement <b>#{row?.id}</b>
            </div>

            <div style={styles.form}>
              <label style={styles.label}>Gift Status *</label>
              <select
                value={giftStatus}
                onChange={(e) => setGiftStatus(e.target.value)}
                style={styles.input}
                disabled={acting}
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="HOLD">HOLD</option>
              </select>

              <label style={styles.label}>Remarks (meta.remarks)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                placeholder="Approved by admin"
                disabled={acting}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button style={styles.btn} onClick={closeModal} disabled={acting}>
                  Cancel
                </button>
                <button
                  style={{ ...styles.btnPrimary, ...(acting ? styles.btnDisabled : {}) }}
                  onClick={submitStatus}
                  disabled={acting}
                >
                  {acting ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px){
          .__ach_grid_fix { grid-template-columns: 1fr !important; }
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
    minWidth: 190,
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

  table: { width: "100%", borderCollapse: "collapse", minWidth: 1250 },
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

  line: { fontSize: 13, marginBottom: 6, color: "#222" },
  k: { opacity: 0.7, fontWeight: 900 },
  hr: { height: 1, background: "#eee", margin: "10px 0" },
  pre: {
    marginTop: 8,
    padding: 10,
    background: "#0b1020",
    color: "#e9eefc",
    borderRadius: 12,
    overflowX: "auto",
    fontSize: 12,
    lineHeight: 1.5,
  },

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
