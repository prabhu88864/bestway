import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const PLACEMENTS = ["HOME_TOP", "HOME_MIDDLE", "PRODUCTS_TOP"];
const TYPES = ["SLIDER", "CAROUSEL"];

export default function AdminBanners() {
  const navigate = useNavigate();

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState("");
  const [type, setType] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("ADD");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  const [form, setForm] = useState(getEmpty());

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();
    if (!token || role !== "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Instant search (no button) - debounce
  useEffect(() => {
    const t = setTimeout(() => fetchBanners(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, placement, type]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/banners", {
        params: {
          search: search.trim() || undefined,
          placement: placement || undefined,
          type: type || undefined,
        },
      });
      setAll(res.data?.banners || []);
    } catch (e) {
      console.log(e);
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const imgUrl = (path) => {
    if (!path) return "";
    const base = (axiosInstance.defaults.baseURL || "").replace(/\/$/, "");
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${base}${path}`;
    return `${base}/${path}`;
  };

  const openAdd = () => {
    setMode("ADD");
    setSelected(null);
    setForm(getEmpty());
    setFile(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setMode("EDIT");
    setSelected(row);
    setForm({
      title: row.title || "",
      subtitle: row.subtitle || "",
      linkUrl: row.linkUrl || "",
      placement: row.placement || "HOME_TOP",
      type: row.type || "SLIDER",
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive !== false,
      startsAt: row.startsAt ? toInputDate(row.startsAt) : "",
      endsAt: row.endsAt ? toInputDate(row.endsAt) : "",
    });
    setFile(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setFile(null);
  };

  const save = async () => {
    try {
      if (!form.placement) return alert("Placement required");
      if (!form.type) return alert("Type required");
      if (mode === "ADD" && !file) return alert("Image required");

      setSaving(true);

      const fd = new FormData();
      fd.append("title", form.title || "");
      fd.append("subtitle", form.subtitle || "");
      fd.append("linkUrl", form.linkUrl || "");
      fd.append("placement", form.placement);
      fd.append("type", form.type);
      fd.append("sortOrder", String(form.sortOrder || 0));
      fd.append("isActive", form.isActive ? "true" : "false");
      if (form.startsAt) fd.append("startsAt", form.startsAt);
      if (form.endsAt) fd.append("endsAt", form.endsAt);
      if (file) fd.append("image", file);

      if (mode === "ADD") {
        await axiosInstance.post("/api/banners", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axiosInstance.put(`/api/banners/${selected.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      closeModal();
      fetchBanners();
    } catch (e) {
      console.log(e);
      alert(e?.response?.data?.msg || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm("Disable this banner?")) return;
    try {
      await axiosInstance.delete(`/api/banners/${row.id}`);
      fetchBanners();
    } catch (e) {
      alert(e?.response?.data?.msg || "Delete failed");
    }
  };

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <h2 style={{ margin: 0 }}>Ads Banners</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/admin/dashboard")} style={s.btn}>
            ← Dashboard
          </button>
          <button onClick={openAdd} style={s.primary}>
            + Add Banner
          </button>
        </div>
      </div>

      {/* ✅ Search UI (no button) */}
      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔎</span>
          <input
            style={s.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search title..."
          />
          {search && (
            <button style={s.clearBtn} onClick={() => setSearch("")} title="Clear">
              ✕
            </button>
          )}
        </div>

        <select style={s.select} value={placement} onChange={(e) => setPlacement(e.target.value)}>
          <option value="">All Placements</option>
          {PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select style={s.select} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.info}>Loading...</div>
        ) : (
          <>
            <div style={s.meta}>
              Total: <b>{all.length}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ID", "Preview", "Title", "Placement", "Type", "Order", "Active", "Actions"].map(
                      (h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {all.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={s.empty}>
                        No banners found
                      </td>
                    </tr>
                  ) : (
                    all.map((b) => (
                      <tr key={b.id}>
                        <td style={s.td}>{b.id}</td>
                        <td style={s.td}>
                          <img src={imgUrl(b.image)} alt="banner" style={s.thumb} />
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 900 }}>{b.title || "-"}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>{b.subtitle || ""}</div>
                        </td>
                        <td style={s.td}>{b.placement}</td>
                        <td style={s.td}>{b.type}</td>
                        <td style={s.td}>{b.sortOrder}</td>
                        <td style={s.td}>{b.isActive ? "Yes" : "No"}</td>
                        <td style={s.td}>
                          <div style={s.actions}>
                            <button style={s.actionBtn} onClick={() => openEdit(b)}>
                              Edit
                            </button>
                            <button style={s.dangerBtn} onClick={() => remove(b)}>
                              Disable
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

      {/* ✅ Better Modal */}
      {modalOpen && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={s.modalHead}>
              <div>
                <div style={s.modalTitle}>{mode === "ADD" ? "Add Banner" : "Edit Banner"}</div>
                <div style={s.modalSub}>Create slider/carousel ad for frontend</div>
              </div>
              <button style={s.iconBtn} onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {/* Body scroll */}
            <div style={s.modalBody}>
              <div style={s.grid}>
                <Field label="Title">
                  <input
                    style={s.input}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Big Offer"
                  />
                </Field>

                <Field label="Subtitle">
                  <input
                    style={s.input}
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="Up to 30% off"
                  />
                </Field>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Link URL">
                    <input
                      style={s.input}
                      value={form.linkUrl}
                      onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                      placeholder="/products"
                    />
                  </Field>
                </div>

                <Field label="Placement *">
                  <select
                    style={s.input}
                    value={form.placement}
                    onChange={(e) => setForm({ ...form, placement: e.target.value })}
                  >
                    {PLACEMENTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Type *">
                  <select
                    style={s.input}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Sort Order">
                  <input
                    style={s.input}
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    placeholder="0"
                  />
                </Field>

                <div style={s.activeRow}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <div>
                    <div style={{ fontWeight: 900 }}>Active</div>
                    <div style={{ fontSize: 12, color: "#777" }}>Show this banner on frontend</div>
                  </div>
                </div>

                <Field label="Starts At (optional)">
                  <input
                    type="datetime-local"
                    style={s.input}
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </Field>

                <Field label="Ends At (optional)">
                  <input
                    type="datetime-local"
                    style={s.input}
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  />
                </Field>

                {/* Upload card */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={s.uploadCard}>
                    <div style={s.uploadLeft}>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>
                        Image {mode === "ADD" ? "*" : "(optional)"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Recommended: 1200x400 (slider), 800x300 (carousel)
                      </div>
                      <input
                        style={s.file}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div style={s.previewBox}>
                      {preview ? (
                        <img src={preview} alt="preview" style={s.bigPreview} />
                      ) : mode === "EDIT" && selected?.image ? (
                        <img src={imgUrl(selected.image)} alt="current" style={s.bigPreview} />
                      ) : (
                        <div style={{ fontSize: 12, color: "#777", textAlign: "center" }}>
                          No Image Selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer sticky */}
            <div style={s.modalFooter}>
              <button style={s.btn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button style={s.primary} onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={s.label}>{label}</div>
      {children}
    </div>
  );
}

function getEmpty() {
  return {
    title: "",
    subtitle: "",
    linkUrl: "",
    placement: "HOME_TOP",
    type: "SLIDER",
    sortOrder: 0,
    isActive: true,
    startsAt: "",
    endsAt: "",
  };
}

function toInputDate(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const s = {
  page: { padding: 20, background: "#f4f6f8", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  btn: { padding: "10px 12px", cursor: "pointer", borderRadius: 10, border: "1px solid #ddd", background: "#fff" },
  primary: { padding: "10px 12px", cursor: "pointer", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontWeight: 900 },

  // search
  searchRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  searchBox: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", minWidth: 320 },
  searchIcon: { opacity: 0.7 },
  searchInput: { border: "none", outline: "none", fontSize: 14, width: 240 },
  clearBtn: { border: "none", background: "transparent", cursor: "pointer", fontSize: 14, opacity: 0.7 },
  select: { padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" },

  // table
  card: { background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  info: { padding: 10 },
  meta: { marginBottom: 10, color: "#444" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee", fontSize: 13, color: "#444", whiteSpace: "nowrap" },
  td: { padding: "10px 8px", borderBottom: "1px solid #f2f2f2", verticalAlign: "middle" },
  empty: { padding: 16, textAlign: "center", color: "#666" },

  thumb: { width: 72, height: 42, borderRadius: 10, objectFit: "cover", border: "1px solid #eee" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionBtn: { padding: "8px 10px", cursor: "pointer", borderRadius: 8, border: "1px solid #ddd", background: "#fff" },
  dangerBtn: { padding: "8px 10px", cursor: "pointer", borderRadius: 8, border: "1px solid #ffcccc", background: "#ffecec" },

  // modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 14 },
  modal: { width: 860, maxWidth: "96vw", background: "#fff", borderRadius: 16, boxShadow: "0 14px 36px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column" },

  modalHead: { padding: 14, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: 950 },
  modalSub: { marginTop: 3, fontSize: 12, color: "#666" },
  iconBtn: { border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "8px 10px", cursor: "pointer" },

  modalBody: { padding: 14, maxHeight: "72vh", overflowY: "auto" },
  modalFooter: { padding: 14, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff" },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 700 },
  input: { width: "100%", padding: "11px 12px", borderRadius: 12, border: "1px solid #ddd", outline: "none" },

  activeRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
    marginTop: 22,
  },

  uploadCard: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 12,
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fafafa",
  },
  uploadLeft: { display: "flex", flexDirection: "column", gap: 10 },
  file: { width: "100%" },

  previewBox: {
    border: "1px dashed #d9d9d9",
    borderRadius: 12,
    padding: 10,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    minHeight: 180,
  },
  bigPreview: { width: "100%", height: 180, objectFit: "cover", borderRadius: 10 },

  // responsive
  "@media (max-width: 820px)": {},
};
