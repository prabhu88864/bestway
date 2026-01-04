import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function AdminOrders() {
  const navigate = useNavigate();

  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 type-to-search
  const [search, setSearch] = useState("");

  /* ================= AUTH + LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }

    fetchOrders("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= API ================= */
  const fetchOrders = async (q) => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/api/orders/admin", {
        params: {
          search: q?.trim() || undefined,
        },
      });

      setAllOrders(Array.isArray(res.data.orders) ? res.data.orders : []);
    } catch (err) {
      console.log("GET /api/orders/admin error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  /* 🔄 auto search on typing (debounce) */
  useEffect(() => {
    const t = setTimeout(() => {
      fetchOrders(search);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ================= CLIENT FILTER (smooth) ================= */
  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allOrders;

    return allOrders.filter((o) => {
      const id = String(o.id || "").toLowerCase();
      const status = String(o.status || "").toLowerCase();
      const userName = String(o.User?.name || "").toLowerCase();
      const email = String(o.User?.email || "").toLowerCase();
      const phone = String(o.User?.phone || "").toLowerCase();

      const products =
        (o.OrderItems || [])
          .map((it) => it?.Product?.name || "")
          .join(" ")
          .toLowerCase();

      return (
        id.includes(q) ||
        status.includes(q) ||
        userName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        products.includes(q)
      );
    });
  }, [allOrders, search]);

  const total = orders.length;

  const orderTotal = (o) => {
    if (o.totalAmount != null) return `₹${o.totalAmount}`;
    const sum = (o.OrderItems || []).reduce((acc, it) => {
      const price = Number(it.price || it.Product?.price || 0);
      const qty = Number(it.quantity || 0);
      return acc + price * qty;
    }, 0);
    return `₹${sum}`;
  };

  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={{ margin: 0 }}>Orders</h2>
        <button onClick={() => navigate("/admin/dashboard")} style={styles.btn}>
          ← Dashboard
        </button>
      </div>

      {/* 🔍 SEARCH (NO BUTTON) */}
      <div style={styles.searchBar}>
        <span style={{ opacity: 0.7 }}>🔍</span>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order id / user / phone / product / status"
        />
        {search && (
          <button onClick={() => setSearch("")} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : (
          <>
            <div style={styles.meta}>
              Total Orders: <b>{total}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Order ID", "User", "Phone", "Total", "Status", "Items", "Date"].map(
                      (h) => (
                        <th key={h} style={styles.th}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={styles.empty}>
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id}>
                        <td style={styles.td}>{o.id}</td>
                        <td style={styles.td}>{o.User?.name || "-"}</td>
                        <td style={styles.td}>{o.User?.phone || "-"}</td>
                        <td style={styles.td}>{orderTotal(o)}</td>
                        <td style={styles.td}>{o.status}</td>
                        <td style={styles.td}>{(o.OrderItems || []).length}</td>
                        <td style={styles.td}>
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleString()
                            : "-"}
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
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, background: "#f4f6f8", minHeight: "100vh" },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  btn: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#f3f3f3",
  },

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
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 15,
  },
  clearBtn: {
    border: "none",
    background: "#eee",
    borderRadius: 8,
    cursor: "pointer",
    padding: "6px 8px",
  },

  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  info: { padding: 10 },
  meta: { marginBottom: 10, color: "#444" },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
    color: "#444",
  },
  td: { padding: "10px 8px", borderBottom: "1px solid #f2f2f2" },
  empty: { padding: 16, textAlign: "center", color: "#666" },
};
