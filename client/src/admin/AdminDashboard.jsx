import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [counts, setCounts] = useState({
    users: 0,
    orders: 0,
    products: 0,
    banners: 0,
    revenue: "₹—",
    addresses: 0,
    payments: 0,
    walletTxns: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = (user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }

    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const logout = () => {
    localStorage.clear();
    navigate("/admin", { replace: true });
  };

  // ✅ Fetch counts (safe fallback if any API missing)
  const fetchCounts = async () => {
    try {
      // Users count (your users api returns { total, users })
      const usersReq = axiosInstance
        .get("/api/users", { params: { role: "USER" } })
        .then((r) => r.data?.total ?? (r.data?.users?.length || 0))
        .catch(() => 0);
        const walletTxnsReq = axiosInstance
  .get("/api/wallet-transactions/admin")
  .then((r) => r.data?.total ?? (r.data?.transactions?.length || 0))
  .catch(() => 0);


      // Products count (if your products api returns array)
      const productsReq = axiosInstance
        .get("/api/products")
        .then((r) => (Array.isArray(r.data) ? r.data.length : r.data?.total || 0))
        .catch(() => 0);

      // Orders count (Admin orders API should exist - if not, 0)
      // (If your API returns array -> length)
      const ordersReq = axiosInstance
        .get("/api/orders/admin") // ✅ if you have admin orders route
        .then((r) => (Array.isArray(r.data) ? r.data.length : r.data?.total || 0))
        .catch(() => 0);

      // ✅ Banners count (our banners admin api returns { total, banners })
      const bannersReq = axiosInstance
        .get("/api/banners")
        .then((r) => r.data?.total ?? (r.data?.banners?.length || 0))
        .catch(() => 0);


        const addressesReq = axiosInstance
        .get("/api/addresses/admin/all")
        .then((r) => r.data?.total ?? (r.data?.addresses?.length || 0))
        .catch(() => 0);
        const paymentsReq = axiosInstance
      .get("/api/payments/admin") // ✅ admin payments api
      .then((r) => r.data?.total ?? (r.data?.payments?.length || 0))
      .catch(() => 0);

      const pairsReq = axiosInstance
      .get("/api/pairs/admin") // ✅ admin pairs api
      .then((r) => r.data?.total ?? (r.data?.pairs?.length || 0))
      .catch(() => 0);


      const referalReq = axiosInstance
        .get("/api/referal/admin")
        .then((r) => r.data?.total ?? (r.data?.referals?.length || 0))
        .catch(() => 0);


      const deliveryReq = axiosInstance
        .get("/api/delivery/admin")
        .then((r) => r.data?.total ?? (r.data?.deliveryCharges?.length || 0))
        .catch(() => 0);
     
        const withdrawReq = axiosInstance
        .get("/api/withdraw/admin")
        .then((r) => r.data?.total ?? (r.data?.withdrawals?.length || 0))
        .catch(() => 0);

        const awardsReq = axiosInstance
        .get("/api/awards/admin")
        .then((r) => r.data?.total ?? (r.data?.awards?.length || 0))
        .catch(() => 0);
        

        const achivementReq = axiosInstance
        .get("/api/achivement/admin")
        .then((r) => r.data?.total ?? (r.data?.achivements?.length || 0))
        .catch(() => 0);

        const treeReq = axiosInstance
        .get("/api/tree/admin")
        .then((r) => r.data?.total ?? (r.data?.treeData?.length || 0))
        .catch(() => 0);


      const [users, products, orders, banners, addresses,payments, walletTxns, pairs, referal, delivery, withdraw, awards, achivements, tree  ] = await Promise.all([
        usersReq,
        productsReq,
        ordersReq,
        bannersReq,
        addressesReq,
         paymentsReq,
          walletTxnsReq,
          pairsReq,
          referalReq,
          deliveryReq,
          withdrawReq,
          awardsReq,
          achivementReq,
          treeReq

      ]);

      setCounts((prev) => ({
        ...prev,
        users,
        products,
        orders,
        banners,
         addresses,
          payments,
          walletTxns,
          pairs,
          referal,
          delivery,
          withdraw,
          awards,
          achivements,
          tree
      }));
    } catch (e) {
      console.log("fetchCounts error", e);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
          <div style={styles.sub}>Manage users, orders, products & ads</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
         
          <button onClick={logout} style={styles.logout}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.stats}>
        <StatCard title="Users" value={counts.users} onClick={() => navigate("/admin/users")} />
        <StatCard title="Orders" value={counts.orders} onClick={() => navigate("/admin/orders")} />
        <StatCard
          title="Products"
          value={counts.products}
          onClick={() => navigate("/admin/products")}
        />
        <StatCard title="Revenue" value={counts.revenue} onClick={() => navigate("/admin/orders")} />

        {/* ✅ NEW: Ads/Banners */}
        <StatCard
          title="Ads / Banners"
          value={counts.banners}
          onClick={() => navigate("/admin/banners")}
         
        />
        <StatCard
      title="Payments"
      value={counts.payments}
      onClick={() => navigate("/admin/payments")}
  
    />
    <StatCard
  title="Wallet Txns"
  value={counts.walletTxns}
  onClick={() => navigate("/admin/wallet-transactions")}
  
/>
    <StatCard
  title="Pairs"
  value={counts.pairs}
  onClick={() => navigate("/admin/pairs")}
/>
    <StatCard
  title="Referal"
  value={counts.referal}
  onClick={() => navigate("/admin/referal")}
/>
    <StatCard
  title="Delivery Charges"
  value={counts.delivery}
  onClick={() => navigate("/admin/delivery")}
/>
    <StatCard
  title="Withdrawals"  value={counts.withdraw}
  onClick={() => navigate("/admin/withdraw")}
/>
    <StatCard
  title="Awards"  value={counts.awards}
  onClick={() => navigate("/admin/awards")}
/>

    <StatCard
  title="Achivements"  value={counts.achivements}
  onClick={() => navigate("/admin/achivement")}
/>
   <StatCard
  title="Tree"  value={0}
  onClick={() => navigate("/admin/tree")}
/>


      </div>
      


     


      <div style={styles.hintBox}>
        <b>Tip:</b> Card meeda click cheste respective page open avutundi.
      </div>
    </div>
  );
}

function StatCard({ title, value, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      style={styles.statCard}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div style={styles.cardTop}>
        <div style={styles.cardTitle}>{title}</div>
        {badge ? <span style={styles.badge}>{badge}</span> : null}
      </div>

      <div style={styles.cardValue}>{value}</div>
      <div style={styles.cardHint}>Click to open →</div>
    </div>
  );
}

const styles = {
  page: { padding: 20, background: "#f4f6f8", minHeight: "100vh" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  sub: { marginTop: 4, color: "#666", fontSize: 13 },

  btn: {
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
  },
  logout: {
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 800,
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 12,
    marginTop: 18,
  },

  statCard: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    cursor: "pointer",
    userSelect: "none",
    transition: "transform .08s ease",
    border: "1px solid rgba(0,0,0,0.06)",
  },

  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 13, color: "#666", fontWeight: 700 },
  badge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#111",
    color: "#fff",
    fontWeight: 900,
  },

  cardValue: { fontSize: 28, fontWeight: 900, marginTop: 8, color: "#111" },
  cardHint: { marginTop: 6, fontSize: 12, color: "#888" },

  hintBox: {
    marginTop: 16,
    background: "#fff",
    padding: 14,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
};
