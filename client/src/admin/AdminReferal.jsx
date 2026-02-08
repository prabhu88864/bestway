import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/* ===================== ALL SETTINGS KEYS ===================== */
const SETTING_OPTIONS = [
  { key: "JOIN_BONUS", label: "Joining Bonus (₹)", type: "number" },
  { key: "MIN_SPEND_UNLOCK", label: "Min Spend Unlock (₹)", type: "number" },
  { key: "PAIR_BONUS", label: "Pair Bonus (₹)", type: "number" },

  { key: "DAILY_PAIR_CEILING", label: "Daily Pair Ceiling", type: "number" },
  { key: "MIN_WITHDRAWAL", label: "Minimum Withdrawal (₹)", type: "number" },
  { key: "MAX_WITHDRAWAL", label: "Maximum Withdrawal (₹)", type: "number" },

  { key: "ADMIN_FEE_PERCENT", label: "Admin Fee (%)", type: "number" },
  { key: "GST_PERCENT", label: "GST (%)", type: "number" },
];

export default function AdminSettings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ key: "", value: "" });

  const token = useMemo(
    () => localStorage.getItem("token") || localStorage.getItem("authToken"),
    []
  );

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  /* ===================== AUTH CHECK ===================== */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token || user.role !== "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }
    fetchSettings();
    // eslint-disable-next-line
  }, []);

  /* ===================== FETCH ===================== */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/settings", {
        headers,
        params: { _ts: Date.now() },
      });
      setSettings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchSettings error", err);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== OPEN EDIT ===================== */
  const openEdit = (key) => {
    const existing = settings.find((s) => s.key === key);
    setForm({
      key,
      value: existing?.value ?? "",
    });
    setModalOpen(true);
  };

  /* ===================== SAVE (POST OR PUT) ===================== */
  const saveSetting = async () => {
    const key = form.key.trim().toUpperCase();
    const value = String(form.value).trim();

    if (!key || value === "") {
      alert("Key & value required");
      return;
    }

    if (Number.isNaN(Number(value))) {
      alert("Value must be a number");
      return;
    }

    try {
      setSaving(true);

      const exists = settings.find((s) => s.key === key);

      if (exists) {
        // ✅ UPDATE
        await axiosInstance.put(
          `/api/settings/${key}`,
          { value },
          { headers }
        );
      } else {
        // ✅ CREATE
        await axiosInstance.post(
          "/api/settings",
          { key, value },
          { headers }
        );
      }

      await fetchSettings();
      setModalOpen(false);
    } catch (err) {
      console.error("saveSetting error", err);
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ===================== UI ===================== */
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Admin Settings</h2>
        <button style={styles.btn} onClick={fetchSettings}>
          Refresh
        </button>
      </div>

      {/* QUICK CARDS */}
      <div style={styles.grid}>
        {SETTING_OPTIONS.map((opt) => {
          const row = settings.find((s) => s.key === opt.key);
          return (
            <div key={opt.key} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <div style={styles.cardTitle}>{opt.label}</div>
                  <div style={styles.cardKey}>{opt.key}</div>
                </div>
                <button
                  style={styles.primaryBtn}
                  onClick={() => openEdit(opt.key)}
                >
                  Edit
                </button>
              </div>

              <div style={styles.cardValue}>
                {row ? row.value : <span style={{ color: "#777" }}>Not set</span>}
              </div>

              <div style={styles.cardDate}>
                Updated:{" "}
                {row?.updatedAt
                  ? new Date(row.updatedAt).toLocaleString()
                  : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLE */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Key</th>
                <th>Value</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.key}</td>
                  <td>{s.value}</td>
                  <td>{new Date(s.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Edit Setting</h3>

            <label>Key</label>
            <input value={form.key} disabled style={styles.input} />

            <label>Value</label>
            <input
              value={form.value}
              onChange={(e) =>
                setForm({ ...form, value: e.target.value })
              }
              style={styles.input}
            />

            <div style={styles.modalActions}>
              <button onClick={() => setModalOpen(false)} style={styles.btn}>
                Cancel
              </button>
              <button
                onClick={saveSetting}
                disabled={saving}
                style={styles.primaryBtn}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
  page: { padding: 24, background: "#f4f6f8", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", marginBottom: 16 },
  title: { margin: 0, fontSize: 28 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 14,
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 8px 22px rgba(0,0,0,.1)",
  },
  cardTop: { display: "flex", justifyContent: "space-between" },
  cardTitle: { fontWeight: 800 },
  cardKey: { fontSize: 12, color: "#666" },
  cardValue: { marginTop: 10, fontSize: 22, fontWeight: 900 },
  cardDate: { marginTop: 6, fontSize: 12, color: "#666" },

  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#eee",
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  },

  tableWrap: {
    background: "#fff",
    padding: 14,
    borderRadius: 14,
    boxShadow: "0 8px 22px rgba(0,0,0,.1)",
  },
  table: { width: "100%", borderCollapse: "collapse" },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    width: 360,
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
};
