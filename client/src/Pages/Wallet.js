import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function Wallet() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [pairs, setPairs] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem("token");

  const money = (v) => {
    const n = Number(v || 0);
    if (Number.isNaN(n)) return "₹ 0.00";
    return `₹ ${n.toFixed(2)}`;
  };

  const safeUpper = (v) => String(v || "").toUpperCase();

  const unlockAlert = () => {
    alert(
      "🔒 Wallet Locked!\n\nTo release the locked amount, please purchase/spend ₹30,000 using your account.\n\nAfter you complete ₹30,000 spending, the locked money will be released automatically."
    );
  };

  const loadAll = async () => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const authHeader = { Authorization: `Bearer ${token}` };

    try {
      setErr("");
      setLoading(true);

      const [wRes, tRes, pRes] = await Promise.all([
        axiosInstance.get("/api/wallet", { headers: authHeader }),
        axiosInstance.get("/api/wallet/transactions", { headers: authHeader }),
        axiosInstance.get("/api/pairs/my", { headers: authHeader }).catch(() => ({ data: null })),
      ]);

      setWallet(wRes.data || null);

      const list = Array.isArray(tRes.data) ? tRes.data : [];
      list.sort(
        (a, b) =>
          new Date(b?.createdAt || 0).getTime() -
          new Date(a?.createdAt || 0).getTime()
      );
      setTxns(list);

      setPairs(pRes?.data || null);
    } catch (e) {
      setErr(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load wallet"
      );
      setWallet(null);
      setTxns([]);
      setPairs(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  // Map pair matches by walletTransactionId => used inside transactions if needed
  const pairsByTxnId = useMemo(() => {
    const map = new Map();
    const matches = pairs?.matches;
    if (!Array.isArray(matches)) return map;

    for (const m of matches) {
      const key = String(m?.walletTransactionId ?? "");
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return map;
  }, [pairs]);

  const totalBalance = Number(
    wallet?.totalBalance ??
      (Number(wallet?.balance ?? 0) + Number(wallet?.lockedBalance ?? 0))
  );
  const lockedBalance = Number(wallet?.lockedBalance ?? 0);
  const isUnlocked = Boolean(wallet?.isUnlocked);

  // Build readable title + subtitle for each txn
  const buildTxnText = (t) => {
    const reason = safeUpper(t?.reason);
    const meta = t?.meta || {};
    const pending = Boolean(meta?.pending);

    // Join Bonus
    if (reason === "REFERRAL_JOIN_BONUS") {
      const n = meta?.referredName || "—";
      const pos = meta?.placedPosition ? safeUpper(meta.placedPosition) : "—";
      return {
        title: `Referral Join Bonus`,
        sub:
          `From: ${n} • Position: ${pos}` +
          (pending ? ` • 🔒 ${meta?.pendingReason || "PENDING"}` : ""),
      };
    }

    // Pair Bonus
    if (reason === "PAIR_BONUS") {
      const arr = pairsByTxnId.get(String(t?.id)) || [];
      if (arr.length > 0) {
        const first = arr[0];
        const left = first?.leftUser?.name || `#${first?.leftUserId ?? "—"}`;
        const right = first?.rightUser?.name || `#${first?.rightUserId ?? "—"}`;
        return {
          title: `Pair Bonus`,
          sub: `Pairs: ${arr.length} • ${left} ↔ ${right}`,
        };
      }
      const pairsCount = Array.isArray(meta?.pairs) ? meta.pairs.length : null;
      return {
        title: `Pair Bonus`,
        sub: pairsCount != null ? `Pairs: ${pairsCount}` : `Pair matched`,
      };
    }

    // Default
    return {
      title: reason || "Transaction",
      sub: reason ? `Reason: ${reason}` : "",
    };
  };

  return (
    <div style={S.page}>
      <style>{`
        *{ margin:0; padding:0; box-sizing:border-box; }
        .grid2{ display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        @media (max-width: 980px){ .grid3{ grid-template-columns: 1fr; } }
        @media (max-width: 900px){ .grid2{ grid-template-columns: 1fr; } }

        .txGridHead{
          display:grid;
          grid-template-columns: 160px 1fr 190px;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.05);
          font-weight: 900;
          opacity: .85;
          margin-top: 10px;
        }
        .txRow{
          display:grid;
          grid-template-columns: 160px 1fr 190px;
          gap: 10px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.04);
          margin-top: 10px;
          align-items:center;
        }
        @media (max-width: 700px){
          .txGridHead{ display:none; }
          .txRow{ grid-template-columns: 1fr; }
        }

        .lockCard{
          cursor: pointer;
          transition: transform .12s ease, border-color .12s ease;
          position: relative;
          overflow: hidden;
        }
        .lockCard:hover{
          transform: translateY(-1px);
          border-color: rgba(255,210,74,.35);
        }
        .lockBadge{
          position:absolute;
          top:12px;
          right:12px;
          display:flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,74,.28);
          background: rgba(255,210,74,.10);
          font-weight: 950;
          font-size: 12px;
          color: #ffd24a;
        }

        .pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(220,235,255,.14);
          background: rgba(255,255,255,.06);
          font-weight: 900;
          font-size: 12px;
          opacity:.9;
        }

        .pendingPill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,210,74,.28);
          background: rgba(255,210,74,.10);
          color:#ffd24a;
          font-weight: 950;
          font-size: 12px;
        }

        /* Pair Matches */
        .pairHead{
          display:grid;
          grid-template-columns: 170px 1fr 1fr 160px;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.05);
          font-weight: 900;
          opacity: .85;
          margin-top: 10px;
        }
        .pairRow{
          display:grid;
          grid-template-columns: 170px 1fr 1fr 160px;
          gap: 10px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.04);
          margin-top: 10px;
          align-items:center;
        }
        @media (max-width: 900px){
          .pairHead{ display:none; }
          .pairRow{ grid-template-columns: 1fr; }
        }
        .userBox{
          border: 1px dashed rgba(220,235,255,.18);
          border-radius: 14px;
          padding: 10px;
          background: rgba(255,255,255,.03);
        }
        .uName{ font-weight: 950; font-size: 14px; }
        .uMeta{ font-size: 12px; opacity:.8; margin-top: 4px; line-height: 1.4; }
      `}</style>

      <div style={S.container}>
        <div style={S.hero}>
          <div>
            <div style={S.h1}>Wallet</div>
            <div style={S.sub}>Balance + Locked + Pair members names + transactions.</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => navigate(-1)}>← Back</button>
            <button style={S.btn} onClick={() => navigate("/products")}>Products</button>
            <button style={S.btn} onClick={onRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {loading && <div style={S.info}>Loading…</div>}
        {err && <div style={{ ...S.info, color: "#ffb4b4" }}>{err}</div>}

        {!loading && !err && (
          <>
            {/* TOP CARDS */}
            <div className="grid3">
              <div style={S.card}>
                <div style={S.cardTitle}>Current Balance</div>
                <div style={S.balance}>{money(wallet?.balance)}</div>
                <div style={S.cardSub}>
                  Wallet ID: {wallet?.id ?? "—"} • User: {wallet?.userId ?? "—"}
                </div>
              </div>

              <div
                style={{
                  ...S.card,
                  borderColor: isUnlocked ? "rgba(47,210,107,.35)" : "rgba(255,210,74,.25)",
                }}
                className="lockCard"
                onClick={!isUnlocked ? unlockAlert : undefined}
                role={!isUnlocked ? "button" : undefined}
                title={!isUnlocked ? "Click to know unlock rules" : "Unlocked"}
              >
                <div className="lockBadge">
                  <span style={{ fontSize: 14 }}>🔒</span>
                  {isUnlocked ? "UNLOCKED" : "LOCKED"}
                </div>

                <div style={S.cardTitle}>Locked Amount</div>
                <div style={{ ...S.balance, color: isUnlocked ? "#9ff0be" : "#ffd24a" }}>
                  {money(lockedBalance)}
                </div>

                <div style={S.cardSub}>
                  {isUnlocked ? (
                    <span className="pill">✅ Released to wallet</span>
                  ) : (
                    <span className="pill">🔒 Spend ₹30,000 to release</span>
                  )}
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>Total Balance</div>
                <div style={S.balance}>{money(totalBalance)}</div>
                <div style={S.cardSub}>
                  TotalSpent: {money(wallet?.totalSpent)} • Status:{" "}
                  <span style={{ color: isUnlocked ? "#9ff0be" : "#ffd24a", fontWeight: 950 }}>
                    {isUnlocked ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
              </div>
            </div>

            {/* PAIR INCOME DETAILS + MEMBERS */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Pair Income (Members)</div>
              <div style={S.sectionSub}>GET /api/pairs/my</div>

              <div className="grid2" style={{ marginTop: 12 }}>
                <div style={S.card}>
                  <div style={S.cardTitle}>Total Pairs</div>
                  <div style={{ ...S.balance, color: "#ffd24a" }}>
                    {pairs?.totalPairs ?? 0}
                  </div>
                  <div style={S.cardSub}>Your total pair matches.</div>
                </div>

                <div style={S.card}>
                  <div style={S.cardTitle}>Total Pair Amount</div>
                  <div style={{ ...S.balance, color: "#9ff0be" }}>
                    {money(pairs?.totalAmount ?? 0)}
                  </div>
                  <div style={S.cardSub}>Total pair income amount.</div>
                </div>
              </div>

              {!pairs?.matches || pairs.matches.length === 0 ? (
                <div style={{ ...S.info, marginTop: 12 }}>No pair matches yet.</div>
              ) : (
                <>
                  <div className="pairHead">
                    <div>Matched Date</div>
                    <div>LEFT Member</div>
                    <div>RIGHT Member</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                  </div>

                  {pairs.matches.map((m, idx) => {
                    const dt = m?.matchedAt ? new Date(m.matchedAt).toLocaleString() : "—";
                    const left = m?.leftUser || {};
                    const right = m?.rightUser || {};
                    const amt = Number(m?.amount ?? 0);

                    return (
                      <div className="pairRow" key={m?.id ?? idx}>
                        <div style={{ opacity: 0.85, fontWeight: 800 }}>
                          {dt}
                          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                            Pair ID: {m?.id ?? "—"} • WalletTxn: {m?.walletTransactionId ?? "—"}
                          </div>
                        </div>

                        <div className="userBox">
                          <div className="uName" style={{ color: "#ffd24a" }}>
                            {left?.name || `#${m?.leftUserId ?? "—"}`}
                          </div>
                          <div className="uMeta">
                            ID: {left?.id ?? m?.leftUserId ?? "—"} <br />
                            Code: {left?.referralCode ?? "—"} <br />
                            Phone: {left?.phone ?? "—"}
                          </div>
                        </div>

                        <div className="userBox">
                          <div className="uName" style={{ color: "#9ff0be" }}>
                            {right?.name || `#${m?.rightUserId ?? "—"}`}
                          </div>
                          <div className="uMeta">
                            ID: {right?.id ?? m?.rightUserId ?? "—"} <br />
                            Code: {right?.referralCode ?? "—"} <br />
                            Phone: {right?.phone ?? "—"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              ...S.amt,
                              color: "#9ff0be",
                              borderColor: "rgba(47,210,107,.35)",
                              background: "rgba(47,210,107,.12)",
                            }}
                          >
                            + {money(Math.abs(amt))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* WALLET TRANSACTIONS */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Wallet Transactions</div>
              <div style={S.sectionSub}>GET /api/wallet/transactions</div>

              {txns.length === 0 ? (
                <div style={S.info}>No transactions yet.</div>
              ) : (
                <>
                  <div className="txGridHead">
                    <div>Date</div>
                    <div>Details (Names)</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                  </div>

                  {txns.map((t, idx) => {
                    const amount = Number(t?.amount ?? 0);
                    const type = safeUpper(t?.type || t?.txnType || "");
                    const isCredit = type.includes("CREDIT") || amount > 0;

                    const date = t?.createdAt ? new Date(t.createdAt).toLocaleString() : "—";

                    const meta = t?.meta || {};
                    const pending = Boolean(meta?.pending);

                    const { title, sub } = buildTxnText(t);

                    return (
                      <div className="txRow" key={t?.id ?? idx}>
                        <div style={{ opacity: 0.85, fontWeight: 800 }}>{date}</div>

                        <div>
                          <div style={{ fontWeight: 950, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <span>{title}</span>
                            {pending && (
                              <span className="pendingPill" title="Pending / Locked">
                                🔒 PENDING
                              </span>
                            )}
                          </div>

                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
                            {sub ? <div>{sub}</div> : null}
                            <div style={{ marginTop: 4, opacity: 0.75 }}>
                              Txn ID: {t?.id ?? "—"} • Reason: {t?.reason ?? "—"} • Type: {type || "—"}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              ...S.amt,
                              color: isCredit ? "#9ff0be" : "#ffb4b4",
                              borderColor: isCredit ? "rgba(47,210,107,.35)" : "rgba(255,90,90,.35)",
                              background: isCredit ? "rgba(47,210,107,.12)" : "rgba(255,90,90,.12)",
                            }}
                          >
                            {isCredit ? "+" : "-"} {money(Math.abs(amount))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    color: "#e9eefc",
    background: "linear-gradient(180deg,#040915 0%,#060c19 50%,#050914 100%)",
    padding: "18px 0 60px",
  },
  container: { width: "min(1200px, 100%)", margin: "0 auto", padding: "0 16px" },

  hero: {
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  h1: { fontSize: 34, fontWeight: 950 },
  sub: { marginTop: 6, fontSize: 13, opacity: 0.8 },

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },

  info: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    marginBottom: 14,
  },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    padding: 14,
    position: "relative",
  },
  cardTitle: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
  balance: { fontSize: 28, fontWeight: 950, marginTop: 8, color: "#ffd24a" },
  cardSub: { marginTop: 8, fontSize: 12, opacity: 0.75 },

  section: { marginTop: 18 },
  sectionTitle: { fontSize: 18, fontWeight: 950 },
  sectionSub: { marginTop: 4, fontSize: 12, opacity: 0.7 },

  amt: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(220,235,255,.14)",
    fontWeight: 950,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
};
