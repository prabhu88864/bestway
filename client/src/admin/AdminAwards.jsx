// src/pages/AdminAwardsSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * APIs you said:
 * GET  /api/awards/admin/settings
 * POST /api/awards/admin/settings   body: { pairsRequired, cashReward, giftName, isActive }
 *
 * For UPDATE/DELETE (common pattern):
 * PUT    /api/awards/admin/settings/:id
 * DELETE /api/awards/admin/settings/:id
 *
 * ✅ This component will use :id routes first.
 * ✅ If your backend instead uses the SAME URL without :id, it will fallback:
 *    PUT    /api/awards/admin/settings   body includes { id, ... }
 *    DELETE /api/awards/admin/settings  body includes { id }
 */

const safe = (v, fb = "-") => (v === null || v === undefined || v === "" ? fb : v);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AdminAwardsSettings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("ALL"); // ALL / ACTIVE / INACTIVE

  const [openId, setOpenId] = useState(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("CREATE"); // CREATE / EDIT
  const [row, setRow] = useState(null);

  // form
  const [pairsRequired, setPairsRequired] = useState("");
  const [cashReward, setCashReward] = useState("");
  const [giftName, setGiftName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);

  /* ================= AUTH + LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= API ================= */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/awards/admin/settings");
      const list = Array.isArray(res?.data?.settings)
        ? res.data.settings
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setItems(list);
    } catch (err) {
      console.log("awards settings load error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      } else {
        alert(err?.response?.data?.msg || "Failed to load award settings");
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setMode("CREATE");
    setRow(null);
    setPairsRequired("");
    setCashReward("");
    setGiftName("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setMode("EDIT");
    setRow(r);
    setPairsRequired(String(r?.pairsRequired ?? ""));
    setCashReward(String(r?.cashReward ?? ""));
    setGiftName(String(r?.giftName ?? ""));
    setIsActive(Boolean(r?.isActive));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setMode("CREATE");
    setRow(null);
    setPairsRequired("");
    setCashReward("");
    setGiftName("");
    setIsActive(true);
    setSaving(false);
  };

  const validate = () => {
    const p = Number(pairsRequired);
    const c = Number(cashReward);
    if (!Number.isFinite(p) || p <= 0) return "pairsRequired must be a positive number";
    if (!Number.isFinite(c) || c < 0) return "cashReward must be 0 or more";
    if (!giftName.trim()) return "giftName is required";
    return "";
  };

  const submit = async () => {
    const errMsg = validate();
    if (errMsg) return alert(errMsg);

    const payload = {
      pairsRequired: num(pairsRequired),
      cashReward: num(cashReward),
      giftName: giftName.trim(),
      isActive: Boolean(isActive),
    };

    try {
      setSaving(true);

      if (mode === "CREATE") {
        const res = await axiosInstance.post("/api/awards/admin/settings", payload);

        // accept different backend shapes
        const created =
          res?.data?.setting || res?.data?.data || res?.data || null;

        if (created && (created.id || created._id)) {
          setItems((prev) => [created, ...prev]);
        } else {
          await fetchSettings();
        }

        closeModal();
        return;
      }

      // EDIT
      const id = row?.id ?? row?._id;
      if (!id) throw new Error("Missing setting id");

      // 1) Try PUT with :id
      try {
        const res = await axiosInstance.put(`/api/awards/admin/settings/${id}`, payload);
        const updated = res?.data?.setting || res?.data?.data || res?.data || null;

        if (updated) {
          setItems((prev) =>
            prev.map((x) =>
              (x.id ?? x._id) === id ? { ...x, ...updated } : x
            )
          );
        } else {
          await fetchSettings();
        }
        closeModal();
      } catch (e1) {
        // 2) Fallback: PUT same URL (no :id) with id in body
        if (e1?.response?.status === 404 || e1?.response?.status === 405) {
          const res2 = await axiosInstance.put(`/api/awards/admin/settings`, { id, ...payload });
          const updated2 = res2?.data?.setting || res2?.data?.data || res2?.data || null;

          if (updated2) {
            setItems((prev) =>
              prev.map((x) =>
                (x.id ?? x._id) === id ? { ...x, ...updated2 } : x
              )
            );
          } else {
            await fetchSettings();
          }
          closeModal();
        } else {
          throw e1;
        }
      }
    } catch (err) {
      console.log("awards settings save error", err);
      alert(err?.response?.data?.msg || err?.message || "Failed to save setting");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    const id = r?.id ?? r?._id;
    if (!id) return;

    const ok = window.confirm(`Delete this award setting?\n\nID: ${id}`);
    if (!ok) return;

    try {
      setSaving(true);

      // 1) Try DELETE with :id
      try {
        await axiosInstance.delete(`/api/awards/admin/settings/${id}`);
        setItems((prev) => prev.filter((x) => (x.id ?? x._id) !== id));
        if (openId === id) setOpenId(null);
      } catch (e1) {
        // 2) Fallback: DELETE same URL (no :id) with body { id }
        if (e1?.response?.status === 404 || e1?.response?.status === 405) {
          await axiosInstance.delete(`/api/awards/admin/settings`, { data: { id } });
          setItems((prev) => prev.filter((x) => (x.id ?? x._id) !== id));
          if (openId === id) setOpenId(null);
        } else {
          throw e1;
        }
      }
    } catch (err) {
      console.log("awards settings delete error", err);
      alert(err?.response?.data?.msg || "Failed to delete setting");
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveQuick = async (r) => {
    const id = r?.id ?? r?._id;
    if (!id) return;

    const payload = {
      pairsRequired: num(r?.pairsRequired),
      cashReward: num(r?.cashReward),
      giftName: String(r?.giftName || ""),
      isActive: !Boolean(r?.isActive),
    };

    try {
      setSaving(true);

      // try :id
      try {
        const res = await axiosInstance.put(`/api/awards/admin/settings/${id}`, payload);
        const updated = res?.data?.setting || res?.data?.data || res?.data || null;

        setItems((prev) =>
          prev.map((x) => ((x.id ?? x._id) === id ? { ...x, ...(updated || payload) } : x))
        );
      } catch (e1) {
        if (e1?.response?.status === 404 || e1?.response?.status === 405) {
          const res2 = await axiosInstance.put(`/api/awards/admin/settings`, { id, ...payload });
          const updated2 = res2?.data?.setting || res2?.data?.data || res2?.data || null;

          setItems((prev) =>
            prev.map((x) => ((x.id ?? x._id) === id ? { ...x, ...(updated2 || payload) } : x))
          );
        } else {
          throw e1;
        }
      }
    } catch (err) {
      console.log("awards settings toggle error", err);
      alert(err?.response?.data?.msg || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items
      .slice()
      .sort((a, b) => num(a?.pairsRequired) - num(b?.pairsRequired))
      .filter((x) => {
        const act = Boolean(x?.isActive);

        if (filterActive === "ACTIVE" && !act) return false;
        if (filterActive === "INACTIVE" && act) return false;

        if (!q) return true;

        const s = [
          x?.id,
          x?._id,
          x?.pairsRequired,
          x?.cashReward,
          x?.giftName,
          act ? "ACTIVE" : "INACTIVE",
        ]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();

        return s.includes(q);
      });
  }, [items, search, filterActive]);

  const pill = (isOn) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    border: `1px solid ${isOn ? "#bfe6cf" : "#f6c0c0"}`,
    background: isOn ? "#e9f7ef" : "#fdecec",
    color: isOn ? "#17643a" : "#8f1d1d",
    cursor: "pointer",
    userSelect: "none",
  });

  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Awards Settings</div>
          <div style={styles.subtitle}>
            Create / Edit / Delete rank award slabs (pairsRequired → rewards)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => navigate("/admin/dashboard")}>
            ← Dashboard
          </button>
          <button style={styles.btn2} onClick={fetchSettings} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button style={styles.btnPrimary} onClick={openCreate}>
            + Add Setting
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
            placeholder="Search by pairs / cash / gift / status / id"
          />
          {search ? (
            <button style={styles.clearBtn} onClick={() => setSearch("")}>
              ✕
            </button>
          ) : null}
        </div>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          style={styles.select}
        >
          <option value="ALL">ALL</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
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
                    {["ID", "Pairs Required", "Cash Reward", "Gift", "Status", "Actions", "Details"].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={styles.empty}>
                        No award settings found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((x) => {
                      const id = x?.id ?? x?._id;

                      return (
                        <React.Fragment key={id}>
                          <tr>
                            <td style={styles.td}>#{safe(id)}</td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1100, fontSize: 15 }}>
                                {safe(x?.pairsRequired, 0)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                pairs
                              </div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1100, fontSize: 15 }}>
                                ₹{num(x?.cashReward).toFixed(2)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                cash
                              </div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ fontWeight: 1000 }}>{safe(x?.giftName)}</div>
                            </td>

                            <td style={styles.td}>
                              <span
                                style={pill(Boolean(x?.isActive))}
                                onClick={() => !saving && toggleActiveQuick(x)}
                                title="Click to toggle"
                              >
                                {Boolean(x?.isActive) ? "✅ ACTIVE" : "⛔ INACTIVE"}
                              </span>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                                (click to toggle)
                              </div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                  style={styles.actionBtn}
                                  onClick={() => openEdit(x)}
                                  disabled={saving}
                                >
                                  Edit
                                </button>

                                <button
                                  style={{ ...styles.actionBtn, ...styles.dangerBtn }}
                                  onClick={() => remove(x)}
                                  disabled={saving}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>

                            <td style={styles.td}>
                              <button
                                style={styles.detailsBtn}
                                onClick={() => setOpenId((p) => (p === id ? null : id))}
                              >
                                {openId === id ? "Hide" : "View"}
                              </button>
                            </td>
                          </tr>

                          {openId === id && (
                            <tr>
                              <td colSpan={7} style={styles.expandCell}>
                                <div style={styles.expandBox}>
                                  <div className="__aw_grid_fix" style={styles.grid}>
                                    <div style={styles.panel}>
                                      <div style={styles.panelTitle}>Award Details</div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Pairs Required:</span>{" "}
                                        <b>{safe(x?.pairsRequired, 0)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Cash Reward:</span>{" "}
                                        <b>₹{num(x?.cashReward).toFixed(2)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Gift Name:</span>{" "}
                                        <b>{safe(x?.giftName)}</b>
                                      </div>
                                      <div style={styles.line}>
                                        <span style={styles.k}>Status:</span>{" "}
                                        <b>{Boolean(x?.isActive) ? "ACTIVE" : "INACTIVE"}</b>
                                      </div>
                                    </div>

                                    <div style={styles.panel}>
                                      <div style={styles.panelTitle}>Tips</div>
                                      <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
                                        • Keep pairsRequired unique (ex: 10, 20, 30). <br />
                                        • Toggle ACTIVE to enable/disable this slab. <br />
                                        • Use “Edit” to update gift/cash anytime.
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
              <div style={{ fontWeight: 1100, fontSize: 16 }}>
                {mode === "CREATE" ? "Add Award Setting" : "Edit Award Setting"}
              </div>
              <button onClick={closeModal} style={styles.xBtn}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>
              {mode === "EDIT" ? (
                <>
                  Editing <b>#{safe(row?.id ?? row?._id)}</b>
                </>
              ) : (
                <>Create new award slab</>
              )}
            </div>

            <div style={styles.form}>
              <label style={styles.label}>Pairs Required *</label>
              <input
                value={pairsRequired}
                onChange={(e) => setPairsRequired(e.target.value)}
                style={styles.input}
                placeholder="Example: 30"
                type="number"
                disabled={saving}
              />

              <label style={styles.label}>Cash Reward (₹) *</label>
              <input
                value={cashReward}
                onChange={(e) => setCashReward(e.target.value)}
                style={styles.input}
                placeholder="Example: 1000"
                type="number"
                disabled={saving}
              />

              <label style={styles.label}>Gift Name *</label>
              <input
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                style={styles.input}
                placeholder="Example: Smart Watch"
                disabled={saving}
              />

              <label style={styles.label}>Is Active</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  disabled={saving}
                  style={{
                    ...styles.toggleBtn,
                    ...(isActive ? styles.toggleOn : {}),
                  }}
                >
                  ACTIVE
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  disabled={saving}
                  style={{
                    ...styles.toggleBtn,
                    ...(!isActive ? styles.toggleOff : {}),
                  }}
                >
                  INACTIVE
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button style={styles.btn} onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.btnPrimary,
                    ...(saving ? styles.btnDisabled : {}),
                  }}
                  onClick={submit}
                  disabled={saving}
                >
                  {saving ? "Saving..." : mode === "CREATE" ? "Create" : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px){
          .__aw_grid_fix { grid-template-columns: 1fr !important; }
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

  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
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

  actionBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
  },
  dangerBtn: { border: "1px solid #f6c0c0", background: "#fdecec" },

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

  toggleBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    minWidth: 120,
  },
  toggleOn: { border: "1px solid #bfe6cf", background: "#e9f7ef" },
  toggleOff: { border: "1px solid #f6c0c0", background: "#fdecec" },
};
