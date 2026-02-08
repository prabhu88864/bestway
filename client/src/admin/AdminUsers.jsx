import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const USER_TYPES = ["TRAINEE_ENTREPRENEUR", "ENTREPRENEUR"];

export default function AdminUsers() {
  const navigate = useNavigate();

  // list
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // search (type-to-search)
  const [search, setSearch] = useState("");

  // drawer (view)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ✅ NEW: show/hide password in drawer
  const [viewPwdShow, setViewPwdShow] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    userType: "TRAINEE_ENTREPRENEUR",
    password: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // ✅ NEW: show/hide password in edit modal
  const [editPwdShow, setEditPwdShow] = useState(false);

  // ✅ NEW: profile pic (file + preview)
  const [picFile, setPicFile] = useState(null);
  const [picPreview, setPicPreview] = useState("");

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ helper: build absolute image url (works with /uploads/..)
  const API_ORIGIN = useMemo(() => {
    const base = (axiosInstance.defaults.baseURL || "").trim();
    if (!base) return window.location.origin;
    try {
      return new URL(base).origin;
    } catch {
      // if baseURL is like "/api"
      return window.location.origin;
    }
  }, []);

  const buildImgUrl = (path) => {
    if (!path) return "";
    const p = String(path);
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    if (p.startsWith("/")) return `${API_ORIGIN}${p}`;
    return `${API_ORIGIN}/${p}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const r = (user?.role || "").toUpperCase();

    if (!token || r !== "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }

    fetchUsers(""); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async (q = search) => {
    try {
      setLoading(true);

      const query = (q || "").trim();

      const res = await axiosInstance.get("/api/users", {
        params: {
          search: query || undefined,
          role: "USER", // ✅ only users
        },
      });

      const data = res.data;
      setAllUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      console.log("GET /api/users error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Typing lo auto-search (debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchUsers(search);
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ✅ Instant client-side filter (fast UI)
  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;

    return allUsers.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const userType = (u.userType || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        userType.includes(q)
      );
    });
  }, [allUsers, search]);

  const total = users.length;

  // ---------- VIEW (Drawer) ----------
  const openView = async (id) => {
    try {
      setDrawerOpen(true);
      setViewLoading(true);
      setSelectedUser(null);
      setViewPwdShow(false);

      const res = await axiosInstance.get(`/api/users/${id}`);
      setSelectedUser(res.data);
    } catch (err) {
      console.log("GET /api/users/:id error", err);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    setViewPwdShow(false);
  };

  // ---------- EDIT (Modal) ----------
  const openEdit = (userRow) => {
    setEditForm({
      name: userRow?.name || "",
      email: userRow?.email || "",
      phone: userRow?.phone || "",
      userType: userRow?.userType || "TRAINEE_ENTREPRENEUR",
      password: userRow?.password || "", // ✅ show existing (as per your API)
    });
    setEditPwdShow(false);

    // profile pic reset
    setPicFile(null);
    setPicPreview(userRow?.profilePic ? buildImgUrl(userRow.profilePic) : "");

    setSelectedUser(userRow);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditForm({
      name: "",
      email: "",
      phone: "",
      userType: "TRAINEE_ENTREPRENEUR",
      password: "",
    });
    setEditPwdShow(false);
    setPicFile(null);
    setPicPreview("");
  };

  const onPickPic = (e) => {
    const file = e.target.files?.[0] || null;
    setPicFile(file);

    if (!file) {
      setPicPreview(selectedUser?.profilePic ? buildImgUrl(selectedUser.profilePic) : "");
      return;
    }
    const url = URL.createObjectURL(file);
    setPicPreview(url);
  };

  const saveEdit = async () => {
    if (!selectedUser?.id) return;

    try {
      setEditSaving(true);

      const hasFile = !!picFile;

      // ✅ If file exists -> FormData (multipart)
      if (hasFile) {
        const fd = new FormData();
        fd.append("name", editForm.name || "");
        fd.append("email", editForm.email || "");
        fd.append("phone", editForm.phone || "");
        fd.append("userType", editForm.userType || "");
        if (String(editForm.password || "").trim()) {
          fd.append("password", String(editForm.password).trim());
        }
        fd.append("profilePic", picFile);

        await axiosInstance.put(`/api/users/${selectedUser.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // ✅ else -> JSON
        const payload = {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          userType: editForm.userType,
          password: editForm.password, // your API uses plain password, so keep it
        };

        await axiosInstance.put(`/api/users/${selectedUser.id}`, payload);
      }

      closeEdit();
      fetchUsers(search);
    } catch (err) {
      console.log("PUT /api/users/:id error", err);
      alert(err?.response?.data?.msg || "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- DELETE (Confirm) ----------
  const openDelete = (userRow) => {
    setDeleteUser(userRow);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteUser(null);
  };

  const confirmDelete = async () => {
    if (!deleteUser?.id) return;

    try {
      setDeleteLoading(true);
      await axiosInstance.delete(`/api/users/${deleteUser.id}`);
      closeDelete();
      fetchUsers(search);
    } catch (err) {
      console.log("DELETE /api/users/:id error", err);
      alert(err?.response?.data?.msg || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
          ← Dashboard
        </button>
      </div>

      {/* ✅ Search UI (no button) */}
      <div style={styles.searchBar}>
        <div style={styles.searchIcon}>🔍</div>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / email / phone / userType..."
        />
        {search.trim() ? (
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => setSearch("")}
            title="Clear"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total Users: <b>{total}</b>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  {/* ✅ ADDED columns (no redesign) */}
                  {["ID", "Pic", "Name", "Email", "Phone", "UserType", "Password", "Actions"].map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={styles.empty}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.id}</td>

                      {/* ✅ Pic */}
                      <td style={styles.td}>
                        {u.profilePic ? (
                          <img
                            src={buildImgUrl(u.profilePic)}
                            alt="pic"
                            style={styles.avatar}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div style={styles.avatarFallback}>👤</div>
                        )}
                      </td>

                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>{u.phone}</td>

                      {/* ✅ UserType */}
                      <td style={styles.td}>{u.userType || "-"}</td>

                      {/* ✅ Password (masked, show in view/edit) */}
                      <td style={styles.td}>
                        {u.password ? "••••••" : "-"}
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button style={styles.actionBtn} onClick={() => openView(u.id)}>
                            View
                          </button>
                          <button style={styles.actionBtn} onClick={() => openEdit(u)}>
                            Edit
                          </button>
                          <button style={styles.dangerBtn} onClick={() => openDelete(u)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ✅ RIGHT DRAWER (VIEW) */}
      {drawerOpen && (
        <div style={styles.drawerOverlay} onClick={closeView}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h3 style={{ margin: 0 }}>User Details</h3>
              <button style={styles.btn} onClick={closeView}>
                ✕
              </button>
            </div>

            {viewLoading ? (
              <div style={styles.info}>Loading...</div>
            ) : selectedUser ? (
              <div style={styles.drawerBody}>
                {/* ✅ profile pic */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  {selectedUser.profilePic ? (
                    <img
                      src={buildImgUrl(selectedUser.profilePic)}
                      alt="pic"
                      style={{ ...styles.avatar, width: 58, height: 58 }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div style={{ ...styles.avatarFallback, width: 58, height: 58 }}>👤</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800 }}>{selectedUser.name || "-"}</div>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>{selectedUser.userType || "-"}</div>
                  </div>
                </div>

                <Row label="ID" value={selectedUser.id} />
                <Row label="Name" value={selectedUser.name} />
                <Row label="Email" value={selectedUser.email} />
                <Row label="Phone" value={selectedUser.phone} />
                <Row label="Role" value={selectedUser.role} />
                <Row label="UserType" value={selectedUser.userType} />

                {/* ✅ password show/hide */}
                <div style={styles.row}>
                  <div style={styles.rowLabel}>Password</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={styles.rowValue}>
                      {selectedUser.password
                        ? viewPwdShow
                          ? String(selectedUser.password)
                          : "••••••••"
                        : "-"}
                    </div>
                    <button
                      type="button"
                      style={styles.eyeBtn}
                      onClick={() => setViewPwdShow((s) => !s)}
                      disabled={!selectedUser.password}
                      title={viewPwdShow ? "Hide" : "Show"}
                    >
                      {viewPwdShow ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <Row
                  label="Created"
                  value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : "-"}
                />
                <Row
                  label="Updated"
                  value={selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : "-"}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button style={styles.actionBtn} onClick={() => openEdit(selectedUser)}>
                    Edit
                  </button>
                  <button style={styles.dangerBtn} onClick={() => openDelete(selectedUser)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.info}>No data</div>
            )}
          </div>
        </div>
      )}

      {/* ✅ EDIT MODAL */}
      {editOpen && (
        <div style={styles.modalOverlay} onClick={closeEdit}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Edit User</h3>
              <button style={styles.btn} onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* ✅ Profile Pic upload */}
              <label style={styles.label}>Profile Pic</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {picPreview ? (
                  <img src={picPreview} alt="preview" style={{ ...styles.avatar, width: 52, height: 52 }} />
                ) : (
                  <div style={{ ...styles.avatarFallback, width: 52, height: 52 }}>👤</div>
                )}

                <input type="file" accept="image/*" onChange={onPickPic} />
              </div>

              <label style={styles.label}>Name</label>
              <input
                style={styles.modalInput}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />

              <label style={styles.label}>Email</label>
              <input
                style={styles.modalInput}
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />

              <label style={styles.label}>Phone</label>
              <input
                style={styles.modalInput}
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />

              {/* ✅ UserType */}
              <label style={styles.label}>User Type</label>
              <select
                style={styles.modalInput}
                value={editForm.userType}
                onChange={(e) => setEditForm({ ...editForm, userType: e.target.value })}
              >
                {USER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* ✅ Password (show/hide) */}
              <label style={styles.label}>Password</label>
              <div style={styles.pwdWrap}>
                <input
                  style={styles.pwdInput}
                  type={editPwdShow ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setEditPwdShow((s) => !s)}
                  title={editPwdShow ? "Hide" : "Show"}
                >
                  {editPwdShow ? "🙈" : "👁️"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button style={styles.btn} onClick={closeEdit} disabled={editSaving}>
                  Cancel
                </button>
                <button style={styles.primaryBtn} onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DELETE CONFIRM */}
      {deleteOpen && (
        <div style={styles.modalOverlay} onClick={closeDelete}>
          <div style={styles.confirm} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete User?</h3>
            <p style={{ marginTop: 6 }}>
              Are you sure you want to delete <b>{deleteUser?.name}</b>?
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={styles.btn} onClick={closeDelete} disabled={deleteLoading}>
                Cancel
              </button>
              <button style={styles.dangerBtn} onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* small row component */
function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowValue}>{value || "-"}</div>
    </div>
  );
}

const styles = {
  page: { padding: 20, background: "#f4f6f8", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  btn: { padding: "10px 12px", cursor: "pointer", borderRadius: 10, border: "1px solid #cfcfcf", background: "#f3f3f3" },

  // ✅ Search UI (no button)
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #e6e6e6",
    borderRadius: 16,
    padding: "12px 14px",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    marginBottom: 12,
    maxWidth: 620,
  },
  searchIcon: { fontSize: 16, opacity: 0.75 },
  searchInput: { border: "none", outline: "none", fontSize: 15, flex: 1, background: "transparent" },
  clearBtn: { border: "none", background: "#f2f2f2", borderRadius: 10, cursor: "pointer", padding: "8px 10px", fontSize: 14 },

  card: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  info: { padding: 10 },
  meta: { marginBottom: 10, color: "#444" },

  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee", fontSize: 13, color: "#444" },
  td: { padding: "10px 8px", borderBottom: "1px solid #f2f2f2", verticalAlign: "top" },
  empty: { padding: 16, textAlign: "center", color: "#666" },

  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionBtn: { padding: "8px 10px", cursor: "pointer", borderRadius: 8, border: "1px solid #ddd", background: "#fff" },
  dangerBtn: { padding: "8px 10px", cursor: "pointer", borderRadius: 8, border: "1px solid #ffcccc", background: "#ffecec" },

  // drawer
  drawerOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", justifyContent: "flex-end", zIndex: 50 },
  drawer: { width: 380, maxWidth: "90vw", height: "100%", background: "#fff", padding: 14, boxShadow: "-6px 0 18px rgba(0,0,0,0.12)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #eee" },
  drawerBody: { paddingTop: 12 },

  row: { display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "8px 0", borderBottom: "1px dashed #f0f0f0" },
  rowLabel: { color: "#666", fontSize: 13 },
  rowValue: { color: "#111", fontWeight: 600 },

  // modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 },
  modal: { width: 520, maxWidth: "95vw", background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottom: "1px solid #eee" },
  modalBody: { padding: 14 },
  label: { display: "block", fontSize: 13, color: "#666", marginTop: 10, marginBottom: 6 },
  modalInput: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" },

  // confirm
  confirm: { width: 420, maxWidth: "95vw", background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" },

  // ✅ new small style additions only
  avatar: { width: 34, height: 34, borderRadius: 10, objectFit: "cover", border: "1px solid #eee" },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #eee",
    background: "#fafafa",
  },

  pwdWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "6px 8px",
    background: "#fff",
  },
  pwdInput: { flex: 1, border: "none", outline: "none", fontSize: 14, padding: "8px 6px", background: "transparent" },
  eyeBtn: { padding: "8px 10px", cursor: "pointer", borderRadius: 8, border: "1px solid #ddd", background: "#fff", lineHeight: 1 },

  primaryBtn: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    fontWeight: 800,
  },
};
