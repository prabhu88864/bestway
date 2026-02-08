// src/pages/Wallet.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * ✅ Wallet Page (FULL)
 * - Loads: /api/users/me, /api/wallet, /api/wallet/transactions, /api/pairs/my, /api/withdrawals, /api/settings
 * - Withdraw submit validates MIN_WITHDRAWAL + MAX_WITHDRAWAL from settings
 * - After withdrawal created: shows in history
 * - Click a withdrawal row -> opens small popup modal with full details:
 *    gross, gst %, gst amount, admin fee %, admin fee amount, total deduction, net amount,
 *    status, bank/upi, createdAt, adminNote, transactionId (if present)
 */

export default function Wallet() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [pairs, setPairs] = useState(null);

  // ✅ USER (for bank details check)
  const [me, setMe] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  // ✅ Withdraw list (to read status/adminNote/transactionId etc)
  const [withdrawals, setWithdrawals] = useState([]);

  // ✅ SETTINGS: min/max withdrawal + fees (optional)
  const [appSettings, setAppSettings] = useState({
    MIN_WITHDRAWAL: 0,
    MAX_WITHDRAWAL: 0,
    GST_PERCENT: 0,
    ADMIN_FEE_PERCENT: 0,
  });

  // ✅ Withdraw UI
  const [wdOpen, setWdOpen] = useState(false);
  const [wdSaving, setWdSaving] = useState(false);
  const [wdErr, setWdErr] = useState("");
  const [wdOk, setWdOk] = useState("");
  const [wdAmount, setWdAmount] = useState("500");
  const [wdMethod, setWdMethod] = useState("UPI"); // UPI / BANK
  const [wdUpiId, setWdUpiId] = useState(""); // if method is UPI

  // ✅ Withdrawal detail modal (click history row)
  const [wdViewOpen, setWdViewOpen] = useState(false);
  const [wdSelected, setWdSelected] = useState(null);

  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";

  const money = (v) => {
    const n = Number(v || 0);
    if (Number.isNaN(n)) return "₹ 0.00";
    return `₹ ${n.toFixed(2)}`;
  };

  const safeUpper = (v) => String(v || "").toUpperCase();

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unlockAlert = () => {
    alert(
      "🔒 Wallet Locked!\n\nTo release the locked amount, please purchase/spend ₹30,000 using your account.\n\nAfter you complete ₹30,000 spending, the locked money will be released automatically."
    );
  };

  const hasBankDetails = useMemo(() => {
    const u = me || {};
    const ok =
      String(u?.bankAccountNumber || "").trim() &&
      String(u?.ifscCode || "").trim() &&
      String(u?.accountHolderName || "").trim() &&
      String(u?.panNumber || "").trim();
    return Boolean(ok);
  }, [me]);

  /* ================= SETTINGS HELPERS ================= */
  const parseSettings = (list) => {
    const out = { MIN_WITHDRAWAL: 0, MAX_WITHDRAWAL: 0, GST_PERCENT: 0, ADMIN_FEE_PERCENT: 0 };
    const arr = Array.isArray(list?.settings) ? list.settings : Array.isArray(list) ? list : [];
    for (const s of arr) {
      const k = safeUpper(s?.key);
      const v = Number(s?.value ?? 0);
      const num = Number.isNaN(v) ? 0 : v;
      if (k === "MIN_WITHDRAWAL") out.MIN_WITHDRAWAL = num;
      if (k === "MAX_WITHDRAWAL") out.MAX_WITHDRAWAL = num;
      if (k === "GST_PERCENT") out.GST_PERCENT = num;
      if (k === "ADMIN_FEE_PERCENT") out.ADMIN_FEE_PERCENT = num;
    }
    return out;
  };

  /* ================= LOAD ALL ================= */
  const loadAll = async () => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const authHeader = { Authorization: `Bearer ${token}` };

    try {
      setErr("");
      setLoading(true);

      const [meRes, wRes, tRes, pRes, wdRes, setRes] = await Promise.all([
        axiosInstance.get("/api/users/me", { headers: authHeader }).catch(() => ({ data: null })),
        axiosInstance.get("/api/wallet", { headers: authHeader }),
        axiosInstance.get("/api/wallet/transactions", { headers: authHeader }),
        axiosInstance.get("/api/pairs/my", { headers: authHeader }).catch(() => ({ data: null })),
        axiosInstance.get("/api/withdrawals", { headers: authHeader }).catch(() => ({
          data: { withdrawals: [] },
        })),
        axiosInstance.get("/api/settings", { headers: authHeader }).catch(() => ({ data: [] })),
      ]);

      const u = meRes?.data?.user || meRes?.data || null;
      setMe(u);

      setWallet(wRes.data || null);

      const list = Array.isArray(tRes.data) ? tRes.data : [];
      list.sort(
        (a, b) =>
          new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
      );
      setTxns(list);

      setPairs(pRes?.data || null);

      const wdList = Array.isArray(wdRes?.data?.withdrawals)
        ? wdRes.data.withdrawals
        : Array.isArray(wdRes?.data)
        ? wdRes.data
        : [];
      wdList.sort(
        (a, b) =>
          new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
      );
      setWithdrawals(wdList);

      setAppSettings(parseSettings(setRes?.data));
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
      setWithdrawals([]);
      setAppSettings({ MIN_WITHDRAWAL: 0, MAX_WITHDRAWAL: 0, GST_PERCENT: 0, ADMIN_FEE_PERCENT: 0 });
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

  /* ================= AUTO REFRESH WHEN PENDING WITHDRAW EXISTS ================= */
  const hasPendingWithdrawal = useMemo(() => {
    return withdrawals.some((w) => safeUpper(w?.status) === "PENDING");
  }, [withdrawals]);

  useEffect(() => {
    if (!token) return;
    if (!hasPendingWithdrawal) return;

    const id = window.setInterval(() => {
      loadAll();
    }, 6000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingWithdrawal, token]);

  /* ================= MAPS ================= */
  const withdrawalsById = useMemo(() => {
    const m = new Map();
    for (const w of withdrawals) {
      if (w?.id != null) m.set(String(w.id), w);
    }
    return m;
  }, [withdrawals]);

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
    wallet?.totalBalance ?? Number(wallet?.balance ?? 0) + Number(wallet?.lockedBalance ?? 0)
  );
  const lockedBalance = Number(wallet?.lockedBalance ?? 0);
  const isUnlocked = Boolean(wallet?.isUnlocked);

  /* ================= TXN DISPLAY HELPERS ================= */
  const buildTxnText = (t) => {
    const reason = safeUpper(t?.reason);
    const meta = t?.meta || {};
    const dt = fmtDate(t?.createdAt);

    if (reason === "WITHDRAWAL_REQUEST") {
      const wd = withdrawalsById.get(String(t?.id));
      const st = safeUpper(wd?.status || t?.status || "PENDING");

      return {
        title: `Withdrawal${dt ? ` (${dt})` : ""}`,
        sub: `Withdrawal request / processing`,
        extra: {
          kind: "WITHDRAWAL",
          status: st,
          adminNote: wd?.adminNote || null,
          transactionId: wd?.transactionId || null,
          withdrawal: wd || null,
        },
      };
    }

    if (reason === "REFERRAL_JOIN_BONUS") {
      const n = meta?.referredName || "—";
      const pos = meta?.placedPosition ? safeUpper(meta.placedPosition) : "—";
      return {
        title: `Referral Join Bonus${dt ? ` (${dt})` : ""}`,
        sub: `From: ${n} • Position: ${pos}`,
        extra: null,
      };
    }

    if (reason === "PAIR_BONUS") {
      const arr = pairsByTxnId.get(String(t?.id)) || [];
      if (arr.length > 0) {
        const first = arr[0];
        const left = first?.leftUser?.name || `#${first?.leftUserId ?? "—"}`;
        const right = first?.rightUser?.name || `#${first?.rightUserId ?? "—"}`;
        return {
          title: `Pair Bonus${dt ? ` (${dt})` : ""}`,
          sub: `Pairs: ${arr.length} • ${left} ↔ ${right}`,
          extra: null,
        };
      }
      return { title: `Pair Bonus${dt ? ` (${dt})` : ""}`, sub: `Pair matched`, extra: null };
    }

    if (reason.includes("ADD") || reason.includes("DEPOSIT") || reason.includes("TOPUP")) {
      return { title: `Wallet Added${dt ? ` (${dt})` : ""}`, sub: "Money added to wallet", extra: null };
    }

    return { title: `${reason || "Transaction"}${dt ? ` (${dt})` : ""}`, sub: reason ? `Reason: ${reason}` : "", extra: null };
  };

  const getTxnDirection = (t) => {
    const type = safeUpper(t?.type || t?.txnType || "");
    if (type.includes("CREDIT")) return "CREDIT";
    if (type.includes("DEBIT")) return "DEBIT";
    const amt = Number(t?.amount ?? 0);
    return amt >= 0 ? "CREDIT" : "DEBIT";
  };

  const AmountBadge = ({ direction, amount, pending }) => {
    const isCredit = direction === "CREDIT";

    if (pending) {
      return (
        <span
          style={{
            ...S.amt,
            borderColor: "rgba(255,210,74,.28)",
            background: "rgba(255,210,74,.10)",
            color: "#ffd24a",
          }}
          title="Pending / Processing"
        >
          <span style={S.arrowPill} aria-hidden="true">
            ⏳
          </span>
          <span style={{ fontWeight: 950 }}>
            {isCredit ? "+" : "-"} {money(Math.abs(amount))}
          </span>
        </span>
      );
    }

    return (
      <span
        style={{
          ...S.amt,
          borderColor: isCredit ? "rgba(47,210,107,.35)" : "rgba(255,90,90,.35)",
          background: isCredit ? "rgba(47,210,107,.12)" : "rgba(255,90,90,.12)",
          color: isCredit ? "#9ff0be" : "#ffb4b4",
        }}
        title={isCredit ? "Money In" : "Money Out"}
      >
        <span style={S.arrowPill} aria-hidden="true">
          {isCredit ? "↗" : "↘"}
        </span>
        <span style={{ fontWeight: 950 }}>
          {isCredit ? "+" : "-"} {money(Math.abs(amount))}
        </span>
      </span>
    );
  };

  /* ================= WITHDRAW MODAL ================= */
  const openWithdraw = () => {
    setWdErr("");
    setWdOk("");
    const minW = Number(appSettings.MIN_WITHDRAWAL || 0);
    setWdAmount(String(minW > 0 ? minW : 500));
    setWdMethod("UPI");
    setWdUpiId(me?.upiId || "");
    setWdOpen(true);
  };

  const closeWithdraw = () => {
    if (wdSaving) return;
    setWdOpen(false);
  };

  const submitWithdraw = async () => {
    try {
      setWdSaving(true);
      setWdErr("");
      setWdOk("");

      const amt = Number(wdAmount || 0);
      if (!amt || Number.isNaN(amt) || amt <= 0) {
        alert("Enter valid amount");
        return;
      }

      const minW = Number(appSettings.MIN_WITHDRAWAL || 0);
      const maxW = Number(appSettings.MAX_WITHDRAWAL || 0);

      if (minW > 0 && amt < minW) {
        alert(`Enter minimum withdrawal amount ₹${minW}`);
        return;
      }
      if (maxW > 0 && amt > maxW) {
        alert(`Maximum withdrawal allowed is ₹${maxW}`);
        return;
      }

      const method = safeUpper(wdMethod);
      if (!["UPI", "BANK"].includes(method)) {
        alert("payoutMethod must be UPI or BANK");
        return;
      }

      if (method === "BANK" && !hasBankDetails) {
        alert("⚠️ Please update bank details first (Account No, IFSC, Holder Name, PAN).");
        navigate("/profile", { replace: false });
        return;
      }

      // ✅ If UPI, allow sending upiId if your backend expects it (safe: only send if present)
      const payload = { amount: amt, payoutMethod: method };
      const upi = String(wdUpiId || "").trim();
      if (method === "UPI" && upi) payload.upiId = upi;

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axiosInstance.post("/api/withdrawals", payload, { headers });

      setWdOk(res?.data?.msg || "Withdrawal request created successfully ✅");

      // ✅ update wallet instantly if backend returns wallet object
      if (res?.data?.wallet) setWallet((prev) => ({ ...(prev || {}), ...(res.data.wallet || {}) }));

      // ✅ refresh lists (to show new history)
      await loadAll();

      window.clearTimeout(window.__wd_ok__);
      window.__wd_ok__ = window.setTimeout(() => {
        setWdOpen(false);
        setWdOk("");
      }, 900);
    } catch (e) {
      setWdErr(
        e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Withdrawal failed"
      );
    } finally {
      setWdSaving(false);
    }
  };

  /* ================= WITHDRAWAL HISTORY + DETAILS MODAL ================= */
  const openWdView = (w) => {
    setWdSelected(w || null);
    setWdViewOpen(true);
  };
  const closeWdView = () => {
    setWdViewOpen(false);
    setWdSelected(null);
  };

  const statusPill = (st) => {
    const s = safeUpper(st);
    if (s === "APPROVED") return <span className="approvedPill">✅ APPROVED</span>;
    if (s === "REJECTED") return <span className="rejectedPill">❌ REJECTED</span>;
    return <span className="pendingPill">⏳ PENDING</span>;
  };

  /* ================= UI ================= */
  return (
    <div style={S.page}>
      <style>{`
        *{ margin:0; padding:0; box-sizing:border-box; }
        .grid2{ display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        @media (max-width: 980px){ .grid3{ grid-template-columns: 1fr; } }
        @media (max-width: 900px){ .grid2{ grid-template-columns: 1fr; } }

        /* Transactions style */
        .txHead{
          display:grid;
          grid-template-columns: 1fr 190px;
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
          grid-template-columns: 1fr 190px;
          gap: 10px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.04);
          margin-top: 10px;
          align-items:center;
        }
        @media (max-width: 700px){
          .txHead{ display:none; }
          .txRow{ grid-template-columns: 1fr; }
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
        .approvedPill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(47,210,107,.30);
          background: rgba(47,210,107,.12);
          color:#9ff0be;
          font-weight: 950;
          font-size: 12px;
        }
        .rejectedPill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,90,90,.30);
          background: rgba(255,90,90,.12);
          color:#ffb4b4;
          font-weight: 950;
          font-size: 12px;
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

        /* Withdraw button */
        .cardTopRow{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .wdBtn{
          height: 32px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,74,.30);
          background: rgba(255,210,74,.10);
          color: #ffd24a;
          font-weight: 950;
          cursor: pointer;
          white-space:nowrap;
        }
        .wdBtn:disabled{ opacity:.65; cursor:not-allowed; }

        /* Withdraw modal */
        .wdOverlay{
          position:fixed; inset:0;
          background: rgba(0,0,0,.62);
          display:grid; place-items:center;
          padding:14px; z-index:9999;
        }
        .wdModal{
          width:min(520px,100%);
          border-radius:18px;
          border:1px solid rgba(220,235,255,.16);
          background: rgba(12,18,36,.96);
          box-shadow: 0 20px 70px rgba(0,0,0,.55);
          overflow:hidden;
        }
        .wdTop{
          padding:14px;
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          border-bottom: 1px solid rgba(220,235,255,.10);
        }
        .wdTitle{ font-size:16px; font-weight:950; }
        .wdX{
          width:40px;height:40px;border-radius:12px;
          border:1px solid rgba(220,235,255,.14);
          background: rgba(255,255,255,.06);
          color:#e9eefc;font-weight:950;cursor:pointer;
        }
        .wdBody{ padding:14px; display:grid; gap:12px; }
        .wdField{ display:grid; gap:8px; }
        .wdLabel{ font-size:12px; opacity:.8; font-weight:900; }
        .wdInput{
          height:44px; border-radius:14px;
          border:1px solid rgba(220,235,255,.14);
          background: rgba(255,255,255,.06);
          color:#e9eefc; padding:0 12px; outline:none;
        }
        .wdToast{
          padding:10px 12px; border-radius:14px;
          border:1px solid rgba(220,235,255,.12);
          background: rgba(255,255,255,.06);
          font-size:12px;
        }
        .wdActions{
          padding:14px;
          border-top: 1px solid rgba(220,235,255,.10);
          display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;
        }
        .wdHint{ font-size: 12px; opacity: .82; line-height: 1.4; }

        /* ✅ Withdrawal history rows */
        .wdHead{
          display:grid;
          grid-template-columns: 1fr 220px;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.05);
          font-weight: 900;
          opacity: .85;
          margin-top: 10px;
        }
        .wdRow{
          display:grid;
          grid-template-columns: 1fr 220px;
          gap: 10px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.04);
          margin-top: 10px;
          align-items:center;
          cursor:pointer;
          transition: transform .12s ease, border-color .12s ease;
        }
        .wdRow:hover{
          transform: translateY(-1px);
          border-color: rgba(109,91,255,.35);
        }
        @media (max-width: 780px){
          .wdHead{ display:none; }
          .wdRow{ grid-template-columns: 1fr; }
        }

        /* ✅ Details modal (small) */
        .miniModal{
          width:min(560px,100%);
          border-radius:18px;
          border:1px solid rgba(220,235,255,.16);
          background: rgba(12,18,36,.96);
          box-shadow: 0 20px 70px rgba(0,0,0,.55);
          overflow:hidden;
        }
        .miniGrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 560px){
          .miniGrid{ grid-template-columns: 1fr; }
        }
        .kv{
          border:1px solid rgba(220,235,255,.10);
          background: rgba(255,255,255,.05);
          border-radius:14px;
          padding:10px 12px;
        }
        .k{ font-size:11px; opacity:.75; font-weight:900; }
        .v{ margin-top:4px; font-size:13px; font-weight:950; }
      `}</style>

      <div style={S.container}>
        <div style={S.hero}>
          <div>
            <div style={S.h1}>Wallet</div>
            <div style={S.sub}>
              Min Withdraw: <b>{appSettings.MIN_WITHDRAWAL ? `₹${appSettings.MIN_WITHDRAWAL}` : "—"}</b>{" "}
              • Max Withdraw: <b>{appSettings.MAX_WITHDRAWAL ? `₹${appSettings.MAX_WITHDRAWAL}` : "—"}</b>{" "}
              • GST: <b>{appSettings.GST_PERCENT ? `${appSettings.GST_PERCENT}%` : "—"}</b>{" "}
              • Admin Fee: <b>{appSettings.ADMIN_FEE_PERCENT ? `${appSettings.ADMIN_FEE_PERCENT}%` : "—"}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button style={S.btn} onClick={() => navigate("/products")}>
              Products
            </button>
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
                <div className="cardTopRow">
                  <div style={S.cardTitle}>Current Balance</div>
                  <button
                    className="wdBtn"
                    onClick={openWithdraw}
                    disabled={!token || Number(wallet?.balance ?? 0) <= 0}
                  >
                    Withdraw
                  </button>
                </div>

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
                  {isUnlocked ? <span className="pill">✅ Released to wallet</span> : <span className="pill">🔒 Spend ₹30,000 to release</span>}
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

            {/* ✅ WITHDRAWAL HISTORY */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Withdrawal History</div>

              {withdrawals.length === 0 ? (
                <div style={S.info}>No withdrawals yet.</div>
              ) : (
                <>
                  <div className="wdHead">
                    <div>Details</div>
                    <div style={{ textAlign: "right" }}>Net Amount</div>
                  </div>

                  {withdrawals.map((w) => {
                    const st = safeUpper(w?.status || "PENDING");
                    return (
                      <div className="wdRow" key={w?.id} onClick={() => openWdView(w)}>
                        <div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ fontWeight: 950 }}>
                              Withdrawal #{w?.id ?? "—"} {w?.createdAt ? `(${fmtDate(w.createdAt)})` : ""}
                            </div>
                            {statusPill(st)}
                          </div>

                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
                            <div>
                              Gross: <b>{money(w?.grossAmount)}</b> • Deduction:{" "}
                              <b>{money(w?.totalDeduction)}</b> • Net: <b>{money(w?.netAmount)}</b>
                            </div>
                            <div style={{ marginTop: 4, opacity: 0.8 }}>
                              GST {w?.gstPercent ?? "—"}% ({money(w?.gstAmount)}) • Admin Fee{" "}
                              {w?.adminFeePercent ?? "—"}% ({money(w?.adminFeeAmount)})
                            </div>
                            {w?.transactionId ? <div style={{ marginTop: 4 }}>TxnId: {w.transactionId}</div> : null}
                            {w?.adminNote ? <div style={{ marginTop: 4 }}>Note: {w.adminNote}</div> : null}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", fontWeight: 950, color: "#ffd24a" }}>
                          {money(w?.netAmount)}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* TRANSACTIONS */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Transactions</div>

              {txns.length === 0 ? (
                <div style={S.info}>No transactions yet.</div>
              ) : (
                <>
                  <div className="txHead">
                    <div>Details</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                  </div>

                  {txns.map((t, idx) => {
                    const amount = Number(t?.amount ?? 0);
                    const direction = getTxnDirection(t);

                    const { title, sub, extra } = buildTxnText(t);

                    const wdStatus = extra?.kind === "WITHDRAWAL" ? safeUpper(extra.status) : "";
                    const isWdPending = wdStatus === "PENDING";
                    const isWdApproved = wdStatus === "APPROVED";
                    const isWdRejected = wdStatus === "REJECTED";

                    return (
                      <div className="txRow" key={t?.id ?? idx}>
                        <div>
                          <div
                            style={{
                              fontWeight: 950,
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span>{title}</span>

                            {extra?.kind === "WITHDRAWAL" && isWdPending && (
                              <span className="pendingPill">⏳ PENDING</span>
                            )}
                            {extra?.kind === "WITHDRAWAL" && isWdApproved && (
                              <span className="approvedPill">✅ APPROVED</span>
                            )}
                            {extra?.kind === "WITHDRAWAL" && isWdRejected && (
                              <span className="rejectedPill">❌ REJECTED</span>
                            )}

                            {/* click to open details from txn if we can map it */}
                            {extra?.kind === "WITHDRAWAL" && extra?.withdrawal ? (
                              <button
                                style={{ ...S.smallBtn, marginLeft: 2 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWdView(extra.withdrawal);
                                }}
                              >
                                View
                              </button>
                            ) : null}
                          </div>

                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
                            {sub ? <div>{sub}</div> : null}

                            <div style={{ marginTop: 4, opacity: 0.75 }}>
                              Txn ID: {t?.id ?? "—"} • Reason: {t?.reason ?? "—"} • Type:{" "}
                              {safeUpper(t?.type || "") || "—"}
                            </div>

                            {extra?.kind === "WITHDRAWAL" && (extra?.transactionId || extra?.adminNote) ? (
                              <div style={{ marginTop: 6, opacity: 0.8 }}>
                                {extra?.transactionId ? <div>TransactionId: {extra.transactionId}</div> : null}
                                {extra?.adminNote ? <div>Note: {extra.adminNote}</div> : null}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <AmountBadge
                            direction={direction}
                            amount={amount}
                            pending={extra?.kind === "WITHDRAWAL" && isWdPending}
                          />
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

      {/* ✅ Withdraw Create Modal */}
      {wdOpen && (
        <div className="wdOverlay" onMouseDown={closeWithdraw}>
          <div className="wdModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="wdTop">
              <div>
                <div className="wdTitle">Create Withdrawal</div>
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82 }}>
                  Your request will show as <b>PENDING</b> until admin approves.
                </div>
                <div className="wdHint" style={{ marginTop: 6 }}>
                  Min: <b>{appSettings.MIN_WITHDRAWAL ? `₹${appSettings.MIN_WITHDRAWAL}` : "—"}</b> •
                  Max: <b>{appSettings.MAX_WITHDRAWAL ? `₹${appSettings.MAX_WITHDRAWAL}` : "—"}</b>
                </div>
              </div>

              <button className="wdX" onClick={closeWithdraw} disabled={wdSaving}>
                ✕
              </button>
            </div>

            <div className="wdBody">
              {wdErr ? (
                <div className="wdToast" style={{ borderColor: "rgba(255,90,90,.35)", color: "#ffb4b4" }}>
                  {wdErr}
                </div>
              ) : null}

              {wdOk ? (
                <div className="wdToast" style={{ borderColor: "rgba(80,255,160,.25)", color: "#bdf8d1" }}>
                  {wdOk}
                </div>
              ) : null}

              <div className="wdField">
                <div className="wdLabel">Amount</div>
                <input
                  className="wdInput"
                  type="number"
                  min="1"
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  placeholder="500"
                  disabled={wdSaving}
                />
              </div>

              <div className="wdField">
                <div className="wdLabel">Payout Method</div>
                <select className="wdInput" value={wdMethod} onChange={(e) => setWdMethod(e.target.value)} disabled={wdSaving}>
                  <option value="UPI">UPI</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>

              {safeUpper(wdMethod) === "UPI" ? (
                <div className="wdField">
                  <div className="wdLabel">UPI ID (optional)</div>
                  <input
                    className="wdInput"
                    value={wdUpiId}
                    onChange={(e) => setWdUpiId(e.target.value)}
                    placeholder="example@upi"
                    disabled={wdSaving}
                  />
                </div>
              ) : null}

              {safeUpper(wdMethod) === "BANK" && !hasBankDetails ? (
                <div className="wdToast" style={{ borderColor: "rgba(255,90,90,.25)", color: "#ffb4b4" }}>
                  ⚠️ Bank details missing. Please update in Profile (Account No, IFSC, Holder Name, PAN).
                </div>
              ) : null}
            </div>

            <div className="wdActions">
              <button style={S.btn} onClick={closeWithdraw} disabled={wdSaving}>
                Cancel
              </button>
              <button
                style={{
                  ...S.btn,
                  borderColor: "rgba(255,210,74,.30)",
                  background: "rgba(255,210,74,.10)",
                  color: "#ffd24a",
                }}
                onClick={submitWithdraw}
                disabled={wdSaving}
              >
                {wdSaving ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Withdrawal Details Modal (CLICK HISTORY ROW) */}
      {wdViewOpen && wdSelected && (
        <div className="wdOverlay" onMouseDown={closeWdView}>
          <div className="miniModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="wdTop">
              <div>
                <div className="wdTitle">Withdrawal Details #{wdSelected?.id ?? "—"}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {statusPill(wdSelected?.status)}
                  <span style={{ fontSize: 12, opacity: 0.82 }}>
                    {wdSelected?.createdAt ? `Created: ${fmtDate(wdSelected.createdAt)}` : ""}
                  </span>
                </div>
              </div>
              <button className="wdX" onClick={closeWdView}>
                ✕
              </button>
            </div>

            <div className="wdBody">
              <div className="miniGrid">
                <div className="kv">
                  <div className="k">Gross Amount</div>
                  <div className="v">{money(wdSelected?.grossAmount)}</div>
                </div>
                <div className="kv">
                  <div className="k">Net Amount</div>
                  <div className="v" style={{ color: "#ffd24a" }}>{money(wdSelected?.netAmount)}</div>
                </div>

                <div className="kv">
                  <div className="k">GST Percent</div>
                  <div className="v">{wdSelected?.gstPercent ?? "—"}%</div>
                </div>
                <div className="kv">
                  <div className="k">GST Amount</div>
                  <div className="v">{money(wdSelected?.gstAmount)}</div>
                </div>

                <div className="kv">
                  <div className="k">Admin Fee Percent</div>
                  <div className="v">{wdSelected?.adminFeePercent ?? "—"}%</div>
                </div>
                <div className="kv">
                  <div className="k">Admin Fee Amount</div>
                  <div className="v">{money(wdSelected?.adminFeeAmount)}</div>
                </div>

                <div className="kv">
                  <div className="k">Total Deduction</div>
                  <div className="v">{money(wdSelected?.totalDeduction)}</div>
                </div>
                <div className="kv">
                  <div className="k">Status</div>
                  <div className="v">{safeUpper(wdSelected?.status)}</div>
                </div>
              </div>

              {/* payout details */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Payout Details</div>

                {wdSelected?.upiId ? (
                  <div className="kv">
                    <div className="k">UPI ID</div>
                    <div className="v">{wdSelected.upiId}</div>
                  </div>
                ) : null}

                {wdSelected?.bankDetails ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="kv">
                      <div className="k">Account Holder</div>
                      <div className="v">{wdSelected?.bankDetails?.accountHolderName || "—"}</div>
                    </div>
                    <div className="miniGrid">
                      <div className="kv">
                        <div className="k">Account Number</div>
                        <div className="v">{wdSelected?.bankDetails?.bankAccountNumber || "—"}</div>
                      </div>
                      <div className="kv">
                        <div className="k">IFSC</div>
                        <div className="v">{wdSelected?.bankDetails?.ifscCode || "—"}</div>
                      </div>
                    </div>
                    <div className="kv">
                      <div className="k">PAN</div>
                      <div className="v">{wdSelected?.bankDetails?.panNumber || "—"}</div>
                    </div>
                  </div>
                ) : null}

                {!wdSelected?.upiId && !wdSelected?.bankDetails ? (
                  <div className="kv">
                    <div className="k">Payout</div>
                    <div className="v">—</div>
                  </div>
                ) : null}
              </div>

              {/* admin info */}
              {wdSelected?.transactionId || wdSelected?.adminNote ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 8 }}>Admin / Transfer</div>
                  {wdSelected?.transactionId ? (
                    <div className="kv">
                      <div className="k">Transaction ID</div>
                      <div className="v">{wdSelected.transactionId}</div>
                    </div>
                  ) : null}
                  {wdSelected?.adminNote ? (
                    <div className="kv" style={{ marginTop: 10 }}>
                      <div className="k">Admin Note</div>
                      <div className="v" style={{ fontWeight: 800 }}>{wdSelected.adminNote}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="wdActions">
              <button style={S.btn} onClick={closeWdView}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
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
  smallBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
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

  amt: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(220,235,255,.14)",
    fontWeight: 950,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  arrowPill: {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.08)",
    fontWeight: 950,
    lineHeight: 1,
  },
};
