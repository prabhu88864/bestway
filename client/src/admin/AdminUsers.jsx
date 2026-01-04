import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

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

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [allUsers, search]);

  const total = users.length;

  // ---------- VIEW (Drawer) ----------
  const openView = async (id) => {
    try {
      setDrawerOpen(true);
      setViewLoading(true);
      setSelectedUser(null);

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
  };

  // ---------- EDIT (Modal) ----------
  const openEdit = (userRow) => {
    setEditForm({
      name: userRow?.name || "",
      email: userRow?.email || "",
      phone: userRow?.phone || "",
    });
    setSelectedUser(userRow);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditForm({ name: "", email: "", phone: "" });
  };

  const saveEdit = async () => {
    if (!selectedUser?.id) return;

    try {
      setEditSaving(true);

      await axiosInstance.put(`/api/users/${selectedUser.id}`, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
      });

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
          placeholder="Search name / email / phone..."
        />
        {search.trim() ? (
          <button type="button" style={styles.clearBtn} onClick={() => setSearch("")} title="Clear">
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
                  {["ID", "Name", "Email", "Phone", "Actions"].map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.id}</td>
                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>{u.phone}</td>

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
                <Row label="ID" value={selectedUser.id} />
                <Row label="Name" value={selectedUser.name} />
                <Row label="Email" value={selectedUser.email} />
                <Row label="Phone" value={selectedUser.phone} />
                <Row label="Role" value={selectedUser.role} />
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
  td: { padding: "10px 8px", borderBottom: "1px solid #f2f2f2" },
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
};
