import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function AdminDeliveryCharges() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    minAmount: "",
    maxAmount: "",
    charge: "",
  });

  /* ================= AUTH + LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || role !== "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }
    fetchCharges();
    // eslint-disable-next-line
  }, []);

  /* ================= API ================= */
  const fetchCharges = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/deliverycharges");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("GET deliverycharges error", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCharge = async () => {
    if (form.minAmount === "" || form.maxAmount === "" || form.charge === "") {
      return alert("All fields are required");
    }

    try {
      setSaving(true);
      await axiosInstance.post("/api/deliverycharges", {
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        charge: Number(form.charge),
      });
      setModalOpen(false);
      setForm({ minAmount: "", maxAmount: "", charge: "" });
      fetchCharges();
    } catch (err) {
      console.log("POST deliverycharges error", err);
      alert(err?.response?.data?.msg || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <h2 style={styles.title}>Delivery Charges</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.btn} onClick={() => navigate("/admin/dashboard")}>
            ← Dashboard
          </button>
          <button style={styles.primaryBtn} onClick={() => setModalOpen(true)}>
            + Add Charge
          </button>
        </div>
      </div>

      {/* Card */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["ID", "Min Amount", "Max Amount", "Charge", "Active", "Created"].map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.empty}>
                      No delivery charges found
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td style={styles.td}>{r.id}</td>
                      <td style={styles.td}>₹{r.minAmount}</td>
                      <td style={styles.td}>₹{r.maxAmount}</td>
                      <td style={styles.td}>₹{r.charge}</td>
                      <td style={styles.td}>{r.isActive ? "Yes" : "No"}</td>
                      <td style={styles.td}>
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Add Delivery Charge</h3>
              <button style={styles.btnSmall} onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <Field label="Min Amount (₹)">
                <input
                  style={styles.input}
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                />
              </Field>

              <Field label="Max Amount (₹)">
                <input
                  style={styles.input}
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                />
              </Field>

              <Field label="Charge (₹)">
                <input
                  style={styles.input}
                  value={form.charge}
                  onChange={(e) => setForm({ ...form, charge: e.target.value })}
                />
              </Field>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button style={styles.primaryBtn} onClick={saveCharge} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 22, background: "#f4f6f8", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { margin: 0, fontSize: 32, fontWeight: 800 },

  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#f3f3f3",
    cursor: "pointer",
  },
  btnSmall: {
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#f3f3f3",
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  },

  card: { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 10px 26px rgba(0,0,0,.1)" },
  info: { padding: 10 },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 700 },
  th: { textAlign: "left", padding: 12, borderBottom: "1px solid #eee" },
  td: { padding: 12, borderBottom: "1px solid #f0f0f0" },
  empty: { textAlign: "center", padding: 20, color: "#777" },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: { width: 420, background: "#fff", borderRadius: 16, overflow: "hidden" },
  modalHeader: { padding: 14, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" },
  modalBody: { padding: 14 },
  modalFooter: { padding: 14, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 10 },

  label: { fontSize: 12, color: "#666", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" },
};
