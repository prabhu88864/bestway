import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const SETTING_OPTIONS = [
  { key: "JOIN_BONUS", label: "Joining Bonus (₹)", type: "number", hint: "Example: 5000" },
  { key: "MIN_SPEND_UNLOCK", label: "Min Spend Unlock (₹)", type: "number", hint: "Example: 50000" },
  { key: "PAIR_BONUS", label: "Pair Bonus (₹)", type: "number", hint: "Example: 3000" },
];

export default function AdminSettings() {
  const navigate = useNavigate();

  // list
  const [allSettings, setAllSettings] = useState([]);
  const [loading, setLoading] = useState(false);

  // drawer view
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("EDIT"); // EDIT | ADD_CUSTOM
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ key: "JOIN_BONUS", value: "" });

  // ✅ token + auth headers
  const token = useMemo(
    () => localStorage.getItem("token") || localStorage.getItem("authToken") || "",
    []
  );

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // auth + load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || role !== "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }
    fetchSettings();
    // eslint-disable-next-line
  }, []);

  /* ================== API ================== */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/settings", {
        headers: authHeaders,
        params: { _ts: Date.now() },
      });
      setAllSettings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("GET /api/settings error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const openView = async (row) => {
    try {
      setDrawerOpen(true);
      setViewLoading(true);
      setSelected(null);

      const res = await axiosInstance.get(`/api/settings/${row.key}`, {
        headers: authHeaders,
        params: { _ts: Date.now() },
      });

      const value = res?.data?.value ?? row?.value ?? "";
      setSelected({ ...row, value });
    } catch (err) {
      console.log("GET /api/settings/:key error", err);
      setSelected(row);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    setDrawerOpen(false);
    setSelected(null);
  };

  const openEdit = async (key) => {
    try {
      setMode("EDIT");
      setModalOpen(true);
      setSaving(false);

      const res = await axiosInstance.get(`/api/settings/${key}`, {
        headers: authHeaders,
        params: { _ts: Date.now() },
      });

      const value = res?.data?.value ?? "";
      setForm({ key, value: String(value ?? "") });
    } catch (err) {
      console.log("openEdit load error", err);
      const fromList = allSettings.find((s) => s.key === key);
      setForm({ key, value: String(fromList?.value ?? "") });
    }
  };

  const openQuickEditFromRow = (row) => {
    setMode("EDIT");
    setForm({ key: row.key, value: String(row.value ?? "") });
    setModalOpen(true);
    setSaving(false);
  };

  const openAddCustom = () => {
    setMode("ADD_CUSTOM");
    setForm({ key: "", value: "" });
    setModalOpen(true);
    setSaving(false);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSaving(false);
  };

  const saveSetting = async () => {
    const k = String(form.key || "").trim().toUpperCase();
    const v = String(form.value ?? "").trim();

    if (!k) return alert("Key required");
    if (v === "") return alert("Value required");

    // numeric validate for known keys
    const known = SETTING_OPTIONS.find((x) => x.key === k);
    if (known?.type === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) return alert("Value must be a number");
      if (n < 0) return alert("Value must be >= 0");
    }

    try {
      setSaving(true);

      if (mode === "EDIT") {
        // ✅ PUT /api/settings/:key   body: { value }
        const res = await axiosInstance.put(
          `/api/settings/${k}`,
          { value: v },
          { headers: { ...authHeaders, "Content-Type": "application/json" } }
        );

        // backend returns: { msg:"Updated", setting:{...} }
        const updatedSetting = res?.data?.setting;

        // ✅ update list instantly with updatedAt from response
        setAllSettings((prev) => {
          const exists = prev.find((x) => x.key === k);
          if (!exists) {
            // if somehow missing, add it
            return [
              {
                id: updatedSetting?.id ?? Date.now(),
                key: k,
                value: v,
                createdAt: updatedSetting?.createdAt ?? new Date().toISOString(),
                updatedAt: updatedSetting?.updatedAt ?? new Date().toISOString(),
              },
              ...prev,
            ];
          }
          return prev.map((x) =>
            x.key === k
              ? {
                  ...x,
                  value: updatedSetting?.value ?? v,
                  updatedAt: updatedSetting?.updatedAt ?? new Date().toISOString(),
                }
              : x
          );
        });

        // drawer opened same key? update it also
        setSelected((prev) => {
          if (!prev || prev.key !== k) return prev;
          return {
            ...prev,
            value: updatedSetting?.value ?? v,
            updatedAt: updatedSetting?.updatedAt ?? new Date().toISOString(),
          };
        });
      } else {
        // ✅ ADD CUSTOM uses POST /api/settings { key, value }
        await axiosInstance.post(
          "/api/settings",
          { key: k, value: v },
          { headers: { ...authHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ force refresh (server truth)
      await fetchSettings();

      setModalOpen(false);
    } catch (err) {
      console.log("saveSetting error", err);
      alert(err?.response?.data?.msg || err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const prettyLabel = useMemo(() => {
    const found = SETTING_OPTIONS.find((x) => x.key === String(form.key || "").toUpperCase());
    return found?.label || "Key";
  }, [form.key]);

  return (
    <div style={styles.page}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <h2 style={styles.title}>App Settings</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
            ← Dashboard
          </button>
          <button onClick={openAddCustom} style={styles.btn}>
            + Add Custom Key
          </button>
        </div>
      </div>

      {/* Quick cards */}
      <div style={styles.quickGrid}>
        {SETTING_OPTIONS.map((s) => {
          const row = allSettings.find((x) => x.key === s.key);
          return (
            <div key={s.key} style={styles.quickCard}>
              <div style={styles.quickTop}>
                <div>
                  <div style={styles.quickTitle}>{s.label}</div>
                  <div style={styles.quickKey}>{s.key}</div>
                </div>
                <button style={styles.primaryBtn} onClick={() => openEdit(s.key)}>
                  Edit
                </button>
              </div>

              <div style={styles.quickValue}>
                {row?.value != null && row?.value !== "" ? (
                  <span>
                    ₹ <b>{row.value}</b>
                  </span>
                ) : (
                  <span style={{ color: "#777" }}>Not set</span>
                )}
              </div>

              <div style={styles.quickHint}>{s.hint}</div>
              <div style={styles.quickUpdated}>
                Updated:{" "}
                <b>{row?.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</b>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total Keys: <b>{allSettings.length}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["ID", "Key", "Value", "Updated At", "Actions"].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {allSettings.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={styles.empty}>
                        No settings found
                      </td>
                    </tr>
                  ) : (
                    allSettings.map((s) => (
                      <tr key={s.id || s.key}>
                        <td style={styles.td}>{s.id ?? "-"}</td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 900 }}>{s.key}</div>
                        </td>
                        <td style={styles.td}>{s.value ?? "-"}</td>
                        <td style={styles.td}>
                          {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "-"}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button style={styles.actionBtn} onClick={() => openView(s)}>
                              View
                            </button>
                            <button style={styles.actionBtn} onClick={() => openQuickEditFromRow(s)}>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* DRAWER */}
      {drawerOpen && (
        <div style={styles.drawerOverlay} onClick={closeView}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h3 style={{ margin: 0 }}>Setting Details</h3>
              <button style={styles.btnSmall} onClick={closeView}>
                ✕
              </button>
            </div>

            {viewLoading ? (
              <div style={styles.info}>Loading...</div>
            ) : selected ? (
              <div style={styles.drawerBody}>
                <Row label="ID" value={selected.id} />
                <Row label="Key" value={selected.key} />
                <Row label="Value" value={selected.value} />
                <Row
                  label="Updated"
                  value={selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "-"}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button style={styles.primaryBtn} onClick={() => openQuickEditFromRow(selected)}>
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.info}>No data</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>
                {mode === "ADD_CUSTOM" ? "Add Custom Setting" : `Edit: ${prettyLabel}`}
              </h3>
              <button style={styles.btnSmall} onClick={closeModal} disabled={saving}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <Field label={mode === "ADD_CUSTOM" ? "Key *" : "Key"}>
                  {mode === "ADD_CUSTOM" ? (
                    <input
                      style={styles.modalInput}
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      placeholder="EX: DOWNLINE_PAIR_BONUS"
                      disabled={saving}
                    />
                  ) : (
                    <select
                      style={styles.modalInput}
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      disabled={saving}
                    >
                      {SETTING_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.key}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field label="Value *">
                  <input
                    style={styles.modalInput}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="Example: 6000"
                    disabled={saving}
                  />
                </Field>

                <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                  <div style={styles.note}>
                    ✅ Update API: <b>PUT /api/settings/:key</b> with{" "}
                    <code style={styles.code}>{"{ value }"}</code>
                    <br />
                    ✅ List API: <b>GET /api/settings</b>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button style={styles.primaryBtn} onClick={saveSetting} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* helpers */
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

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  quickCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 26px rgba(0,0,0,0.10)",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  quickTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  quickTitle: { fontSize: 14, fontWeight: 900, color: "#111" },
  quickKey: { fontSize: 12, color: "#666", marginTop: 2 },
  quickValue: { marginTop: 10, fontSize: 20, fontWeight: 900, letterSpacing: -0.3 },
  quickHint: { marginTop: 6, fontSize: 12, color: "#666" },
  quickUpdated: { marginTop: 8, fontSize: 12, color: "#555" },

  card: { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 10px 26px rgba(0,0,0,0.10)" },
  info: { padding: 10, fontSize: 14 },
  meta: { marginBottom: 10, color: "#222", fontSize: 16 },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  th: { textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #eee", fontSize: 14, color: "#333", whiteSpace: "nowrap" },
  td: { padding: "14px 8px", borderBottom: "1px solid #f0f0f0", fontSize: 14, verticalAlign: "middle" },
  empty: { padding: 16, textAlign: "center", color: "#666", fontSize: 14 },

  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  actionBtn: { padding: "9px 12px", cursor: "pointer", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontSize: 13 },

  drawerOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", justifyContent: "flex-end", zIndex: 50 },
  drawer: { width: 420, maxWidth: "92vw", height: "100%", background: "#fff", padding: 14, boxShadow: "-10px 0 24px rgba(0,0,0,0.14)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #eee" },
  drawerBody: { paddingTop: 12 },

  row: { display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "10px 0", borderBottom: "1px dashed #f0f0f0" },
  rowLabel: { color: "#666", fontSize: 12 },
  rowValue: { color: "#111", fontWeight: 700, fontSize: 13, wordBreak: "break-word" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 },
  modal: { width: 720, maxWidth: "96vw", background: "#fff", borderRadius: 16, boxShadow: "0 14px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottom: "1px solid #eee" },
  modalBody: { padding: 14, maxHeight: "70vh", overflowY: "auto" },
  modalFooter: { padding: 14, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff", position: "sticky", bottom: 0 },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { display: "block", fontSize: 12, color: "#666", marginBottom: 6 },
  modalInput: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", outline: "none", fontSize: 14 },

  note: {
    background: "#f7f7f7",
    border: "1px solid #eee",
    padding: 10,
    borderRadius: 12,
    fontSize: 12,
    color: "#444",
    lineHeight: 1.45,
  },
  code: {
    background: "#fff",
    border: "1px solid #e7e7e7",
    padding: "2px 6px",
    borderRadius: 8,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
};
