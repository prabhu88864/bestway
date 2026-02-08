// src/pages/ProfileAndActivation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function ProfileAndActivation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);

  // ✅ only editable: bank + pan + upi
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [upiId, setUpiId] = useState("");

  const token = useMemo(
    () => localStorage.getItem("token") || localStorage.getItem("authToken"),
    []
  );

  const safeNum = (v) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const pct = (num, den) => {
    const n = safeNum(num);
    const d = safeNum(den);
    if (!d) return 0;
    const p = (n / d) * 100;
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, p));
  };

  const toast = (msg) => {
    setOk(msg);
    window.clearTimeout(window.__t_ok__);
    window.__t_ok__ = window.setTimeout(() => setOk(""), 1700);
  };

  const setFromUser = (u) => {
    setUser(u);
    setBankAccountNumber(u?.bankAccountNumber || "");
    setIfscCode(u?.ifscCode || "");
    setAccountHolderName(u?.accountHolderName || "");
    setPanNumber(u?.panNumber || "");
    setUpiId(u?.upiId || "");
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setErr("");

      const [meRes, statsRes] = await Promise.all([
        axiosInstance.get("/api/users/me"),
        axiosInstance.get("/api/binary/stats"),
      ]);

      const u = meRes?.data?.user || meRes?.data || null;
      if (!u) throw new Error("User not found");
      setFromUser(u);

      const st = statsRes?.data || null;
      setStats(st);
    } catch (e) {
      setUser(null);
      setStats(null);
      setErr(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======= MAP ACTIVE/INACTIVE =======
  // ENTREPRENEUR => ACTIVE
  // TRAINEE_ENTREPRENEUR => INACTIVE
  const leftActive = safeNum(stats?.left?.ENTREPRENEUR);
  const rightActive = safeNum(stats?.right?.ENTREPRENEUR);
  const overallActive = safeNum(stats?.overall?.ENTREPRENEUR);

  const leftInactive = safeNum(stats?.left?.TRAINEE_ENTREPRENEUR);
  const rightInactive = safeNum(stats?.right?.TRAINEE_ENTREPRENEUR);
  const overallInactive = safeNum(stats?.overall?.TRAINEE_ENTREPRENEUR);

  const leftTotal = safeNum(stats?.left?.TOTAL);
  const rightTotal = safeNum(stats?.right?.TOTAL);
  const overallTotal = safeNum(stats?.overall?.TOTAL);

  // ✅ percentages
  const leftActivePct = pct(leftActive, leftTotal);
  const rightActivePct = pct(rightActive, rightTotal);
  const overallActivePct = pct(overallActive, overallTotal);

  const saveBank = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      setErr("");
      setOk("");

      const fd = new FormData();
      const add = (k, v) => fd.append(k, String(v ?? "").trim());

      add("accountHolderName", accountHolderName);
      add("bankAccountNumber", bankAccountNumber);
      add("ifscCode", ifscCode);
      add("panNumber", panNumber);
      add("upiId", upiId);

      const res = await axiosInstance.put(`/api/users/${user.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated =
        res?.data?.user ||
        res?.data?.updatedUser ||
        res?.data?.data ||
        res?.data ||
        null;

      if (updated?.id) setFromUser(updated);
      else {
        const meRes = await axiosInstance.get("/api/users/me");
        const u = meRes?.data?.user || meRes?.data || null;
        if (u) setFromUser(u);
      }

      toast("Bank details updated ✅");
    } catch (e) {
      setErr(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          "Update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const StatRow = ({ k, v, tone = "normal" }) => (
    <div style={S.statRow}>
      <div style={S.statKey}>{k}</div>
      <div
        style={{
          ...S.statVal,
          ...(tone === "active" ? S.valActive : {}),
          ...(tone === "inactive" ? S.valInactive : {}),
        }}
      >
        {v}
      </div>
    </div>
  );

  const MiniPill = ({ text, kind }) => (
    <span
      style={{
        ...S.miniPill,
        ...(kind === "active" ? S.miniPillActive : {}),
        ...(kind === "inactive" ? S.miniPillInactive : {}),
        ...(kind === "total" ? S.miniPillTotal : {}),
      }}
    >
      {text}
    </span>
  );

  // ✅ Circle like your screenshot
  const Circle = ({ percent, topText, bottomText }) => {
    const p = Math.max(0, Math.min(100, safeNum(percent)));
    return (
      <div style={S.circleWrap}>
        <div style={S.circleOuter}>
          <div
            style={{
              ...S.circleFill,
              background: `conic-gradient(#22d3ee ${p}%, rgba(255,255,255,.08) 0)`,
            }}
          />
          <div style={S.circleInner}>
            <div style={S.circlePct}>{p.toFixed(0)}%</div>
          </div>
        </div>
        <div style={S.circleTextTop}>{topText}</div>
        <div style={S.circleTextBottom}>{bottomText}</div>
      </div>
    );
  };

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.container}>
        {/* TOP BAR */}
        <div style={S.topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={S.h1}>Profile & Activation</div>
            <div style={S.sub}>
              Left/Right team counts + Active % circle + update only bank details
            </div>
          </div>

          <div style={S.actions}>
            <button style={S.btn} onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button style={S.btn} onClick={loadAll} disabled={loading}>
              ↻ Refresh
            </button>
            <button
              style={S.btnRed}
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("authToken");
                navigate("/login", { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? <div style={S.toast}>Loading…</div> : null}
        {err ? (
          <div
            style={{
              ...S.toast,
              borderColor: "rgba(255,90,90,.35)",
              color: "#ffb4b4",
            }}
          >
            {err}
          </div>
        ) : null}
        {ok ? (
          <div
            style={{
              ...S.toast,
              borderColor: "rgba(80,255,160,.25)",
              color: "#bdf8d1",
            }}
          >
            {ok}
          </div>
        ) : null}

        {!loading && user ? (
          <>
            {/* PROFILE HEADER (READ ONLY) */}
            <div style={S.profileCard}>
              <div style={S.profileLeft}>
                <div style={S.avatar}>
                  <div style={S.avatarText}>
                    {(user?.name || "U").trim().slice(0, 1).toUpperCase()}
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={S.nameLine}>
                    <div style={S.name}>{user?.name || "—"}</div>
                    <span style={S.pillRole}>
                      {String(user?.role || "USER").toUpperCase()}
                    </span>
                  </div>

                  <div style={S.metaLine}>
                    <span>
                      <b>Phone:</b> {user?.phone || "—"}
                    </span>
                    <span style={S.sep}>•</span>
                    <span>
                      <b>UserID:</b> {user?.userID || "—"}
                    </span>
                    <span style={S.sep}>•</span>
                    <span>
                      <b>Referral:</b> {user?.referralCode || "—"}
                    </span>
                  </div>

                  <div style={S.note}>
                    ✅ Name / Phone / Role cannot be edited here (only bank
                    details update).
                  </div>
                </div>
              </div>
            </div>

            {/* TOP SUMMARY + CIRCLE */}
            <div className="grid2" style={S.topSummary}>
              <div style={S.smallCard}>
                <div style={S.smallTitle}>Total Team</div>
                <div style={S.bigNumber}>{overallTotal}</div>
                <div style={S.smallSub}>
                  Active: {overallActive} • Inactive: {overallInactive}
                </div>
              </div>

              <div style={S.smallCard}>
                <div style={S.smallTitle}>Active % (Overall)</div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Circle
                    percent={overallActivePct}
                    topText={`${overallActive}/${overallTotal}`}
                    bottomText="Active / Total"
                  />
                </div>
              </div>
            </div>

            {/* LEFT/RIGHT PANELS (WITH CIRCLE) */}
            <div className="grid2" style={S.grid2}>
              {/* LEFT PANEL */}
              <div style={S.panel}>
                <div style={S.panelHead}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <div style={S.panelTitle}>Primary Group (Left)</div>
                    <div style={S.pillRow}>
                      <MiniPill text={`TOTAL: ${leftTotal}`} kind="total" />
                      <MiniPill text={`ACTIVE: ${leftActive}`} kind="active" />
                      <MiniPill
                        text={`INACTIVE: ${leftInactive}`}
                        kind="inactive"
                      />
                    </div>
                  </div>
                  <div style={S.badgeBlue}>LEFT</div>
                </div>

                <div style={S.panelBody}>
                  <div style={S.panelGrid}>
                    <div style={S.statBox}>
                      <StatRow k="Total Team Count" v={leftTotal} />
                      <StatRow
                        k="Active Team Count"
                        v={leftActive}
                        tone="active"
                      />
                      <StatRow
                        k="Inactive Team Count"
                        v={leftInactive}
                        tone="inactive"
                      />
                    </div>

                    <div style={S.circleCard}>
                      <Circle
                        percent={leftActivePct}
                        topText={`${leftActive}/${leftTotal}`}
                        bottomText="Active / Total"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div style={S.panel}>
                <div style={S.panelHead}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <div style={S.panelTitle}>Secondary Group (Right)</div>
                    <div style={S.pillRow}>
                      <MiniPill text={`TOTAL: ${rightTotal}`} kind="total" />
                      <MiniPill
                        text={`ACTIVE: ${rightActive}`}
                        kind="active"
                      />
                      <MiniPill
                        text={`INACTIVE: ${rightInactive}`}
                        kind="inactive"
                      />
                    </div>
                  </div>
                  <div style={S.badgeGold}>RIGHT</div>
                </div>

                <div style={S.panelBody}>
                  <div style={S.panelGrid}>
                    <div style={S.statBox}>
                      <StatRow k="Total Team Count" v={rightTotal} />
                      <StatRow
                        k="Active Team Count"
                        v={rightActive}
                        tone="active"
                      />
                      <StatRow
                        k="Inactive Team Count"
                        v={rightInactive}
                        tone="inactive"
                      />
                    </div>

                    <div style={S.circleCard}>
                      <Circle
                        percent={rightActivePct}
                        topText={`${rightActive}/${rightTotal}`}
                        bottomText="Active / Total"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BANK UPDATE (ONLY THIS IS EDITABLE) */}
            <div style={S.bankCard}>
              <div style={S.cardTitle}>Update Bank / PAN / UPI</div>

              <div className="form2" style={S.form2}>
                <Field label="Account Holder Name">
                  <input
                    style={S.input}
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Account holder name"
                  />
                </Field>

                <Field label="Bank Account Number">
                  <input
                    style={S.input}
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Account number"
                  />
                </Field>

                <Field label="IFSC Code">
                  <input
                    style={S.input}
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="IFSC"
                  />
                </Field>

                <Field label="PAN Number">
                  <input
                    style={S.input}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="PAN"
                  />
                </Field>

                <Field label="UPI ID">
                  <input
                    style={S.input}
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="example@upi"
                  />
                </Field>
              </div>

              <div style={S.bankActions}>
                <button style={S.btn} onClick={loadAll} disabled={saving}>
                  Reset
                </button>
                <button style={S.btnGold} onClick={saveBank} disabled={saving}>
                  {saving ? "Saving..." : "Save Bank Details"}
                </button>
              </div>

              <div style={S.smallNote}>
                ✅ PUT <b>/api/users/{user?.id}</b> (multipart/form-data) — sending
                only bank fields
              </div>
            </div>
          </>
        ) : null}

        {!loading && !user && !err ? <div style={S.toast}>No data.</div> : null}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={S.field}>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

const css = `
  *{ margin:0; padding:0; box-sizing:border-box; }
  html,body,#root{ height:100%; width:100%; }
  body{
    overflow-x:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    background: radial-gradient(900px 400px at 50% 0%, rgba(34,211,238,.12), rgba(0,0,0,0) 60%),
                linear-gradient(180deg,#040915 0%,#060c19 55%,#050914 100%);
    color:#e9eefc;
  }
  button, input{ font-family: inherit; }

  /* ✅ mobile responsive */
  @media (max-width: 980px){
    .grid2{ grid-template-columns: 1fr !important; }
    .form2{ grid-template-columns: 1fr !important; }
  }

  /* ✅ left panel grid inside becomes single on mobile */
  @media (max-width: 640px){
    .panelGrid{ grid-template-columns: 1fr !important; }
  }
`;

const S = {
  page: { minHeight: "100vh" },
  container: {
    width: "min(1100px, 100%)",
    margin: "0 auto",
    padding: "18px 16px 70px",
  },

  topbar: {
    borderRadius: 18,
    padding: 16,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  h1: { fontSize: 26, fontWeight: 950 },
  sub: { marginTop: 6, fontSize: 13, opacity: 0.82 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnGold: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,210,74,.35)",
    background: "rgba(255,210,74,.12)",
    color: "#ffe7a6",
    fontWeight: 950,
    cursor: "pointer",
  },
  btnRed: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,90,90,.35)",
    background: "rgba(255,90,90,.10)",
    color: "#ffb4b4",
    fontWeight: 950,
    cursor: "pointer",
  },

  toast: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    marginBottom: 10,
  },

  profileCard: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    boxShadow: "0 10px 26px rgba(0,0,0,.20)",
    padding: 14,
    marginBottom: 12,
  },
  profileLeft: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    minWidth: 0,
    flexWrap: "wrap",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.18)",
    background: "rgba(10,16,35,.55)",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
  },
  avatarText: {
    width: "calc(100% - 14px)",
    height: "calc(100% - 14px)",
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontSize: 30,
    fontWeight: 950,
    color: "#ffd24a",
    background:
      "radial-gradient(circle at 30% 30%, rgba(255,210,74,.25), rgba(255,255,255,.06))",
    border: "1px solid rgba(220,235,255,.12)",
  },
  nameLine: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  name: {
    fontSize: 18,
    fontWeight: 950,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  pillRole: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(34,211,238,.35)",
    background: "rgba(34,211,238,.12)",
    color: "#bff7ff",
  },
  metaLine: {
    marginTop: 8,
    fontSize: 12.5,
    opacity: 0.92,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  sep: { opacity: 0.55 },
  note: { marginTop: 8, fontSize: 12, opacity: 0.75 },

  topSummary: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 12,
    alignItems: "stretch",
  },

  smallCard: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    padding: 14,
    boxShadow: "0 10px 26px rgba(0,0,0,.15)",
  },
  smallTitle: { fontSize: 12, opacity: 0.8, fontWeight: 900 },
  bigNumber: { marginTop: 8, fontSize: 28, fontWeight: 950, color: "#ffd24a" },
  smallSub: { marginTop: 6, fontSize: 12, opacity: 0.72 },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    alignItems: "stretch",
    marginBottom: 12,
  },

  panel: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    overflow: "hidden",
    boxShadow: "0 10px 26px rgba(0,0,0,.18)",
    display: "flex",
    flexDirection: "column",
  },
  panelHead: {
    padding: 12,
    background: "rgba(12,18,36,.75)",
    borderBottom: "1px solid rgba(220,235,255,.10)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  panelTitle: { fontSize: 14, fontWeight: 950 },

  badgeBlue: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(34,211,238,.35)",
    background: "rgba(34,211,238,.12)",
    color: "#bff7ff",
    flex: "0 0 auto",
    height: 28,
    display: "grid",
    placeItems: "center",
  },
  badgeGold: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(255,210,74,.35)",
    background: "rgba(255,210,74,.12)",
    color: "#ffe7a6",
    flex: "0 0 auto",
    height: 28,
    display: "grid",
    placeItems: "center",
  },

  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  miniPill: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(233,238,252,.92)",
  },
  miniPillTotal: {
    border: "1px solid rgba(255,210,74,.30)",
    background: "rgba(255,210,74,.10)",
    color: "#ffe7a6",
  },
  miniPillActive: {
    border: "1px solid rgba(34,211,238,.30)",
    background: "rgba(34,211,238,.10)",
    color: "#bff7ff",
  },
  miniPillInactive: {
    border: "1px solid rgba(255,90,90,.30)",
    background: "rgba(255,90,90,.08)",
    color: "#ffb4b4",
  },

  panelBody: { padding: 12, display: "grid", gap: 12, flex: 1 },

  // ✅ two columns in panel (stats + circle) desktop, one column mobile via css .panelGrid
  panelGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr .7fr",
    gap: 12,
    alignItems: "stretch",
  },

  statBox: {
    borderRadius: 16,
    border: "1px solid rgba(220,235,255,.10)",
    background: "rgba(10,16,35,.55)",
    padding: 12,
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    padding: "10px 8px",
    borderBottom: "1px solid rgba(220,235,255,.08)",
  },
  statKey: { fontSize: 12.5, opacity: 0.8, fontWeight: 800 },
  statVal: { fontSize: 13, fontWeight: 950, color: "#e9eefc" },
  valActive: { color: "#bff7ff" },
  valInactive: { color: "#ffb4b4" },

  circleCard: {
    borderRadius: 16,
    border: "1px solid rgba(220,235,255,.10)",
    background: "rgba(10,16,35,.55)",
    padding: 12,
    display: "grid",
    placeItems: "center",
    minHeight: 180,
  },

  // ✅ circle styles
  circleWrap: { display: "grid", gap: 8, justifyItems: "center" },
  circleOuter: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    padding: 8,
    position: "relative",
  },
  circleFill: { position: "absolute", inset: 8, borderRadius: "50%" },
  circleInner: {
    position: "absolute",
    inset: 20,
    borderRadius: "50%",
    background: "rgba(12,18,36,.96)",
    border: "1px solid rgba(220,235,255,.12)",
    display: "grid",
    placeItems: "center",
  },
  circlePct: { fontSize: 18, fontWeight: 950, color: "#ffd24a" },
  circleTextTop: { fontSize: 12, opacity: 0.9, fontWeight: 900 },
  circleTextBottom: { fontSize: 12, opacity: 0.7 },

  bankCard: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    padding: 14,
    boxShadow: "0 10px 26px rgba(0,0,0,.18)",
  },
  cardTitle: { fontSize: 15, fontWeight: 950, marginBottom: 10, color: "#ffd24a" },

  form2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "grid", gap: 8 },
  label: { fontSize: 12, opacity: 0.8, fontWeight: 900 },
  input: {
    height: 44,
    borderRadius: 14,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    padding: "0 12px",
    outline: "none",
  },

  bankActions: {
    marginTop: 12,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  smallNote: { marginTop: 10, fontSize: 12, opacity: 0.75 },
};
