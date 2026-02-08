import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const STATUS_LIST = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const prettyStatus = (s) => String(s || "").replaceAll("_", " ");

const fmt = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

export default function AdminOrders() {
  const navigate = useNavigate();

  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 type-to-search
  const [search, setSearch] = useState("");

  // ✅ Expand + Address UI + Items panel
  const [openOrderId, setOpenOrderId] = useState(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState("");

  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);

  // ✅ status update
  const [statusDraft, setStatusDraft] = useState({}); // { [orderId]: status }
  const [updatingId, setUpdatingId] = useState(null);

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
        params: { search: q?.trim() || undefined },
      });

      const list = Array.isArray(res.data.orders) ? res.data.orders : [];
      setAllOrders(list);

      // keep drafts in sync (optional)
      const draft = {};
      list.forEach((o) => (draft[o.id] = o.status));
      setStatusDraft((prev) => ({ ...draft, ...prev }));
    } catch (err) {
      console.log("GET /api/orders/admin error", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ admin user addresses list (dropdown)
  const fetchUserAddresses = async (userId) => {
    const res = await axiosInstance.get(`/api/addresses/admin/user/${userId}`);
    return Array.isArray(res?.data?.addresses) ? res.data.addresses : [];
  };

  // ✅ update status API
  const updateOrderStatus = async (orderId) => {
    const next = statusDraft[orderId];
    if (!next) return;

    try {
      setUpdatingId(orderId);

      const res = await axiosInstance.patch(
        `/api/orders/admin/${orderId}/status`,
        { status: next }
      );

      // ✅ update in UI without refetch
      setAllOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: res.data.status,
                confirmedOn: res.data.confirmedOn,
                packedOn: res.data.packedOn,
                shippedOn: res.data.shippedOn,
                outForDeliveryOn: res.data.outForDeliveryOn,
                deliveredOn: res.data.deliveredOn,
                paymentStatus: res.data.paymentStatus ?? o.paymentStatus,
              }
            : o
        )
      );
    } catch (err) {
      console.log("update status error", err);
      alert(err?.response?.data?.msg || "Failed to update status");
      // rollback draft to original
      const orig = allOrders.find((x) => x.id === orderId)?.status;
      if (orig) setStatusDraft((s) => ({ ...s, [orderId]: orig }));
    } finally {
      setUpdatingId(null);
    }
  };

  /* 🔄 auto search on typing (debounce) */
  useEffect(() => {
    const t = setTimeout(() => fetchOrders(search), 350);
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
      const qty = Number(it.quantity || it.qty || 0);
      return acc + price * qty;
    }, 0);
    return `₹${sum.toFixed(2)}`;
  };

  const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

  // ✅ click Address button (opens Address + Items panel)
  const onClickAddress = async (order) => {
    if (openOrderId === order.id) {
      setOpenOrderId(null);
      return;
    }

    const userId = order?.User?.id || order?.userId;
    const orderAddrId = order?.addressId;

    setOpenOrderId(order.id);
    setAddrError("");
    setAddrLoading(true);

    try {
      const list = userId ? await fetchUserAddresses(userId) : [];
      setUserAddresses(list);

      setSelectedAddressId(String(orderAddrId || ""));

      const fromOrder = order?.Address || null;
      const fromList =
        list.find((a) => String(a.id) === String(orderAddrId)) || null;

      setSelectedAddress(fromOrder || fromList);
    } catch (e) {
      console.log("Address panel error:", e);
      setAddrError("Failed to load addresses");
      setUserAddresses([]);
      setSelectedAddressId(String(orderAddrId || ""));
      setSelectedAddress(order?.Address || null);
    } finally {
      setAddrLoading(false);
    }
  };

  // ✅ dropdown change
  const onChangeDropdown = (e) => {
    const id = e.target.value;
    setSelectedAddressId(id);

    if (!id) {
      setSelectedAddress(null);
      return;
    }

    const found = userAddresses.find((a) => String(a.id) === String(id));
    setSelectedAddress(found || null);
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

      {/* 🔍 SEARCH */}
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
                    {[
                      "Order ID",
                      "User",
                      "Phone",
                      "Total",
                      "Status (Update)",
                      "Items",
                      "Ordered On",
                      "Delivered On",
                      "Address & OrderItems",
                    ].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={styles.empty}>
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <React.Fragment key={o.id}>
                        <tr>
                          <td style={styles.td}>{o.id}</td>
                          <td style={styles.td}>{o.User?.name || "-"}</td>
                          <td style={styles.td}>{o.User?.phone || "-"}</td>
                          <td style={styles.td}>{orderTotal(o)}</td>

                          {/* ✅ STATUS UPDATE */}
                          <td style={styles.td}>
                            <div style={styles.statusRow}>
                              <select
                                value={statusDraft[o.id] ?? o.status}
                                onChange={(e) =>
                                  setStatusDraft((s) => ({
                                    ...s,
                                    [o.id]: e.target.value,
                                  }))
                                }
                                style={styles.statusSelect}
                                disabled={updatingId === o.id}
                              >
                                {STATUS_LIST.map((s) => (
                                  <option key={s} value={s}>
                                    {prettyStatus(s)}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => updateOrderStatus(o.id)}
                                style={{
                                  ...styles.updateBtn,
                                  ...(updatingId === o.id
                                    ? styles.updateBtnDisabled
                                    : {}),
                                }}
                                disabled={updatingId === o.id}
                              >
                                {updatingId === o.id ? "Updating..." : "Update"}
                              </button>
                            </div>

                            <div style={styles.smallMeta}>
                              Pay: <b>{o.paymentMethod}</b> •{" "}
                              <b>{o.paymentStatus}</b>
                            </div>
                          </td>

                          <td style={styles.td}>{(o.OrderItems || []).length}</td>

                          <td style={styles.td}>{fmt(o.createdAt)}</td>

                          {/* ✅ Delivered On */}
                          <td style={styles.td}>
                            {o.deliveredOn ? fmt(o.deliveredOn) : "-"}
                          </td>

                          {/* ✅ Address Button */}
                          <td style={styles.td}>
                            <button
                              onClick={() => onClickAddress(o)}
                              style={styles.addrBtn}
                            >
                              {openOrderId === o.id
                                ? "Hide"
                                : "Address & OrderItems"}
                            </button>
                          </td>
                        </tr>

                        {/* ✅ Expand Row: Address + Items */}
                        {openOrderId === o.id && (
                          <tr>
                            <td colSpan={9} style={styles.expandCell}>
                              <div style={styles.expandBox}>
                                {addrLoading ? (
                                  <div>Loading details...</div>
                                ) : addrError ? (
                                  <div style={{ color: "#b00020" }}>
                                    {addrError}
                                  </div>
                                ) : (
                                  <>
                                    {/* ===== ADDRESS HEADER + DROPDOWN ===== */}
                                    <div style={styles.addrTopRow}>
                                      <div style={{ fontWeight: 800 }}>
                                        Order #{o.id} — Address
                                      </div>

                                      <select
                                        value={selectedAddressId}
                                        onChange={onChangeDropdown}
                                        style={styles.select}
                                      >
                                        <option value="">Select Address</option>
                                        {userAddresses.map((a) => (
                                          <option key={a.id} value={a.id}>
                                            #{a.id} • {a.label} • {a.area} •{" "}
                                            {a.pincode}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* ===== ADDRESS DETAILS ===== */}
                                    {selectedAddress ? (
                                      <div style={styles.addrCard}>
                                        <div style={styles.addrLine}>
                                          <b>{selectedAddress.label}</b>{" "}
                                          {selectedAddress.isDefault ? (
                                            <span style={styles.badge}>
                                              Default
                                            </span>
                                          ) : null}
                                        </div>

                                        <div style={styles.addrLine}>
                                          {selectedAddress.receiverFirstName}{" "}
                                          {selectedAddress.receiverLastName ||
                                            ""}{" "}
                                          {" • "}
                                          {selectedAddress.receiverPhone}
                                        </div>

                                        <div style={styles.addrLine}>
                                          {selectedAddress.house},{" "}
                                          {selectedAddress.area}
                                          {selectedAddress.landmark
                                            ? `, ${selectedAddress.landmark}`
                                            : ""}
                                        </div>

                                        <div style={styles.addrLine}>
                                          Pincode:{" "}
                                          <b>{selectedAddress.pincode}</b>
                                        </div>

                                        <div style={{ marginTop: 6, opacity: 0.8 }}>
                                          Address ID:{" "}
                                          <b>{selectedAddress.id}</b> • User ID:{" "}
                                          <b>{selectedAddress.userId}</b>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ opacity: 0.85 }}>
                                        No address selected
                                      </div>
                                    )}

                                    {/* ===== ORDER ITEMS ===== */}
                                    <div style={{ marginTop: 14 }}>
                                      <div style={styles.sectionTitle}>
                                        Order Items
                                      </div>

                                      {(o.OrderItems || []).length === 0 ? (
                                        <div style={{ opacity: 0.85 }}>
                                          No items found
                                        </div>
                                      ) : (
                                        <div style={{ overflowX: "auto" }}>
                                          <table style={styles.itemsTable}>
                                            <thead>
                                              <tr>
                                                <th style={styles.itemsTh}>
                                                  Product
                                                </th>
                                                <th style={styles.itemsTh}>
                                                  Qty
                                                </th>
                                                <th style={styles.itemsTh}>
                                                  Price
                                                </th>
                                                <th style={styles.itemsTh}>
                                                  Total
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(o.OrderItems || []).map((it) => {
                                                const qty = Number(
                                                  it.qty || it.quantity || 0
                                                );
                                                const price = Number(
                                                  it.price ||
                                                    it.Product?.price ||
                                                    0
                                                );
                                                const lineTotal = qty * price;
                                                const name =
                                                  it.Product?.name ||
                                                  `Product #${it.productId}`;

                                                return (
                                                  <tr key={it.id}>
                                                    <td style={styles.itemsTd}>
                                                      <div
                                                        style={{
                                                          fontWeight: 700,
                                                        }}
                                                      >
                                                        {name}
                                                      </div>
                                                      <div
                                                        style={{
                                                          fontSize: 12,
                                                          opacity: 0.75,
                                                        }}
                                                      >
                                                        Product ID:{" "}
                                                        {it.productId}
                                                      </div>
                                                    </td>
                                                    <td style={styles.itemsTd}>
                                                      {qty}
                                                    </td>
                                                    <td style={styles.itemsTd}>
                                                      ₹{price}
                                                    </td>
                                                    <td style={styles.itemsTd}>
                                                      ₹
                                                      {lineTotal.toFixed(2)}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {/* ===== SUMMARY + STATUS TIMELINE ===== */}
                                      <div style={styles.summaryRow}>
                                        <div>
                                          {/* ✅ Order Total */}
                                          <div style={styles.sumLine}>
                                            Order Total:{" "}
                                            <b>{money(o.totalAmount)}</b>
                                          </div>

                                          {/* ✅ NEW: Total Discount (below order total) */}
                                          <div style={styles.sumLine}>
                                            Total Discount:{" "}
                                            <b>{money(o.totalDiscount)}</b>
                                          </div>

                                          <div style={styles.sumLine}>
                                            Delivery:{" "}
                                            <b>{money(o.deliveryCharge)}</b>
                                          </div>

                                          <div style={styles.sumLine}>
                                            Confirmed:{" "}
                                            <b>{fmt(o.confirmedOn)}</b>
                                          </div>
                                          <div style={styles.sumLine}>
                                            Packed: <b>{fmt(o.packedOn)}</b>
                                          </div>
                                          <div style={styles.sumLine}>
                                            Shipped: <b>{fmt(o.shippedOn)}</b>
                                          </div>
                                          <div style={styles.sumLine}>
                                            Out For Delivery:{" "}
                                            <b>{fmt(o.outForDeliveryOn)}</b>
                                          </div>
                                          <div style={styles.sumLine}>
                                            Delivered:{" "}
                                            <b>{fmt(o.deliveredOn)}</b>
                                          </div>
                                        </div>

                                        <div style={styles.statusPill}>
                                          {prettyStatus(o.status)}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 15 },
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

  table: { width: "100%", borderCollapse: "collapse", minWidth: 1200 },
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

  statusRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  statusSelect: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    minWidth: 180,
  },
  updateBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    cursor: "pointer",
    fontWeight: 800,
  },
  updateBtnDisabled: {
    background: "#eee",
    cursor: "not-allowed",
    opacity: 0.8,
  },
  smallMeta: { marginTop: 6, fontSize: 12, opacity: 0.8 },

  addrBtn: {
    border: "1px solid #ddd",
    background: "#f7f7f7",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 13,
  },

  expandCell: { background: "#fbfbfb", padding: 0, borderBottom: "1px solid #eee" },
  expandBox: { padding: 14 },

  addrTopRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  select: {
    minWidth: 280,
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    background: "#fff",
  },

  addrCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
  },
  addrLine: { marginBottom: 6, color: "#333" },
  badge: {
    display: "inline-block",
    marginLeft: 8,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    background: "#e6f4ea",
    color: "#1b5e20",
    border: "1px solid #c9e6d1",
  },

  sectionTitle: { fontWeight: 800, marginBottom: 8, color: "#333" },

  itemsTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 650,
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    overflow: "hidden",
  },
  itemsTh: {
    textAlign: "left",
    padding: "10px 10px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
    color: "#444",
    background: "#fafafa",
  },
  itemsTd: {
    padding: "10px 10px",
    borderBottom: "1px solid #f2f2f2",
    verticalAlign: "top",
  },

  summaryRow: {
    marginTop: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  sumLine: { marginBottom: 4, color: "#333" },
  statusPill: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
};
