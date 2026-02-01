import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const fmt = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

const prettyKey = (k) =>
  String(k || "")
    .replaceAll("_", " ")
    .toUpperCase();

export default function AdminSettings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [topLoading, setTopLoading] = useState(false);

  const [err, setErr] = useState("");
  const [topValue, setTopValue] = useState(""); // MIN_SPEND_UNLOCK (single API)
  const [rows, setRows] = useState([]);

  // search
  const [search, setSearch] = useState("");

  // edit states
  const [draft, setDraft] = useState({}); // { KEY: value }
  const [savingKey, setSavingKey] = useState("");

  /* ================= AUTH + LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = String(user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }

    loadTopMinSpend();
    loadAllSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= API CALLS ================= */
  const loadTopMinSpend = async () => {
    try {
      setTopLoading(true);
      const res = await axiosInstance.get("/api/settings/MIN_SPEND_UNLOCK");
      setTopValue(String(res?.data?.value ?? ""));
    } catch (e) {
      console.log("GET /api/settings/MIN_SPEND_UNLOCK error", e);
      // don't block UI
      setTopValue("");
    } finally {
      setTopLoading(false);
    }
  };

  const loadAllSettings = async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await axiosInstance.get("/api/settings");
      const list = Array.isArray(res.data) ? res.data : [];

      setRows(list);

      // init draft map
      const d = {};
      list.forEach((r) => {
        d[String(r.key)] = String(r.value ?? "");
      });
      setDraft((prev) => ({ ...d, ...prev }));
    } catch (e) {
      console.log("GET /api/settings error", e);
      setErr(e?.response?.data?.message || "Failed to load settings");
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key) => {
    const k = String(key || "").trim();
    if (!k) return;

    const value = draft[k];
    if (value === undefined) return;

    try {
      setSavingKey(k);
      setErr("");

      // ✅ PUT /api/settings/:key { value }
      const res = await axiosInstance.put(`/api/settings/${k}`, { value: String(value) });

      const updated = res?.data;
      // Update list UI without full refetch
      setRows((prev) => {
        const exists = prev.some((x) => String(x.key) === k);
        if (!exists) return [updated, ...prev];

        return prev.map((x) => (String(x.key) === k ? { ...x, ...updated } : x));
      });

      // Also update the top card if MIN_SPEND_UNLOCK changed
      if (k === "MIN_SPEND_UNLOCK") {
        setTopValue(String(updated?.value ?? value ?? ""));
      }
    } catch (e) {
      console.log("PUT /api/settings/:key error", e);
      setErr(e?.response?.data?.message || e?.response?.data?.msg || "Failed to save setting");
    } finally {
      setSavingKey("");
    }
  };

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const k = String(r.key || "").toLowerCase();
      const v = String(r.value || "").toLowerCase();
      return k.includes(q) || v.includes(q);
    });
  }, [rows, search]);

  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={{ margin: 0 }}>App Settings</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => loadAllSettings()} style={styles.btn}>
            ⟳ Refresh
          </button>
          <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* TOP MIN SPEND CARD */}
      <div style={styles.heroCard}>
        <div style={styles.heroLeft}>
          <div style={styles.heroTitle}>MIN SPEND UNLOCK</div>
          <div style={styles.heroValue}>
            {topLoading ? "Loading..." : topValue ? `₹${topValue}` : "—"}
          </div>
          <div style={styles.heroHint}>
            API: <b>/api/settings/MIN_SPEND_UNLOCK</b>
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.heroEditRow}>
            <label style={styles.label}>Update MIN_SPEND_UNLOCK</label>
            <input
              value={draft["MIN_SPEND_UNLOCK"] ?? topValue ?? ""}
              onChange={(e) =>
                setDraft((p) => ({ ...p, MIN_SPEND_UNLOCK: e.target.value }))
              }
              placeholder="Enter amount (ex: 50000)"
              style={styles.input}
              inputMode="numeric"
            />
            <button
              onClick={() => saveSetting("MIN_SPEND_UNLOCK")}
              style={{
                ...styles.saveBtn,
                ...(savingKey === "MIN_SPEND_UNLOCK" ? styles.saveBtnDisabled : {}),
              }}
              disabled={savingKey === "MIN_SPEND_UNLOCK"}
            >
              {savingKey === "MIN_SPEND_UNLOCK" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div style={styles.searchBar}>
        <span style={{ opacity: 0.7 }}>🔍</span>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by key or value (ex: BONUS, 3000, 50000)"
        />
        {search && (
          <button onClick={() => setSearch("")} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      {/* ERROR */}
      {err ? <div style={styles.errorBox}>⚠️ {err}</div> : null}

      {/* TABLE */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total Settings: <b>{filtered.length}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["ID", "Key", "Value (Edit)", "Created", "Updated", "Action"].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.empty}>
                        No settings found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const k = String(r.key);
                      const isSaving = savingKey === k;

                      return (
                        <tr key={r.id || k}>
                          <td style={styles.td}>{r.id ?? "-"}</td>

                          <td style={styles.td}>
                            <div style={{ fontWeight: 900 }}>{prettyKey(k)}</div>
                            <div style={styles.smallMeta}>Raw: <b>{k}</b></div>
                          </td>

                          <td style={styles.td}>
                            <input
                              value={draft[k] ?? ""}
                              onChange={(e) =>
                                setDraft((p) => ({ ...p, [k]: e.target.value }))
                              }
                              style={styles.tableInput}
                              placeholder="value"
                            />
                            <div style={styles.smallMeta}>
                              Current: <b>{String(r.value ?? "")}</b>
                            </div>
                          </td>

                          <td style={styles.td}>{fmt(r.createdAt)}</td>
                          <td style={styles.td}>{fmt(r.updatedAt)}</td>

                          <td style={styles.td}>
                            <button
                              onClick={() => saveSetting(k)}
                              style={{
                                ...styles.updateBtn,
                                ...(isSaving ? styles.updateBtnDisabled : {}),
                              }}
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              API used: <b>GET /api/settings</b> • <b>GET /api/settings/:key</b> •{" "}
              <b>PUT /api/settings/:key</b>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES (same feel like AdminOrders) ================= */
const styles = {
  page: { padding: 20, background: "#f4f6f8", minHeight: "100vh" },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
    flexWrap: "wrap",
  },

  btn: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#f3f3f3",
    fontWeight: 800,
  },

  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    border: "1px solid #e8eaee",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    marginBottom: 12,
  },
  heroLeft: { minWidth: 240 },
  heroRight: { flex: 1, minWidth: 260 },

  heroTitle: { fontSize: 12, letterSpacing: 1.2, fontWeight: 900, opacity: 0.7 },
  heroValue: { fontSize: 30, fontWeight: 900, marginTop: 6, color: "#111" },
  heroHint: { marginTop: 6, fontSize: 12, opacity: 0.75 },

  heroEditRow: { display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" },
  label: { fontSize: 12, fontWeight: 800, opacity: 0.8, display: "block" },
  input: {
    width: 260,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    background: "#fff",
    fontSize: 14,
  },
  saveBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },
  saveBtnDisabled: { opacity: 0.65, cursor: "not-allowed" },

  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 12,
    maxWidth: 700,
  },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 15 },
  clearBtn: {
    border: "none",
    background: "#eee",
    borderRadius: 8,
    cursor: "pointer",
    padding: "6px 8px",
  },

  errorBox: {
    background: "#fff3f3",
    border: "1px solid #ffd0d0",
    color: "#a40000",
    padding: "10px 12px",
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: 900,
    fontWeight: 800,
  },

  card: {
    background: "#fff",
    borderRadius: 12,
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
  td: { padding: "10px 8px", borderBottom: "1px solid #f2f2f2", verticalAlign: "top" },
  empty: { padding: 16, textAlign: "center", color: "#666" },

  tableInput: {
    width: 240,
    maxWidth: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    background: "#fff",
    fontSize: 14,
  },

  updateBtn: {
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    cursor: "pointer",
    fontWeight: 900,
  },
  updateBtnDisabled: {
    background: "#eee",
    cursor: "not-allowed",
    opacity: 0.8,
  },

  smallMeta: { marginTop: 6, fontSize: 12, opacity: 0.8 },
};
