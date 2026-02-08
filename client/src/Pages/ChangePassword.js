// src/pages/ChangePassword.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * ✅ CLEAN UI + API INTEGRATION
 * POST  /api/users/change-password
 * Body: { oldPassword, newPassword }
 * Header: Authorization: Bearer <token>
 */
export default function ChangePassword() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const token = useMemo(() => {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearMessages = () => {
    setErr("");
    setOk("");
  };

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    clearMessages();
  };

  const score = (p) => {
    const s = String(p || "");
    let v = 0;
    if (s.length >= 8) v++;
    if (/[A-Z]/.test(s)) v++;
    if (/[a-z]/.test(s)) v++;
    if (/[0-9]/.test(s)) v++;
    if (/[^A-Za-z0-9]/.test(s)) v++;
    return v; // 0..5
  };

  const strength = score(newPassword);
  const strengthLabel =
    strength <= 1
      ? "Weak"
      : strength === 2
      ? "Ok"
      : strength === 3
      ? "Good"
      : strength === 4
      ? "Strong"
      : "Very Strong";

  const strengthPct = Math.min(100, Math.max(0, (strength / 5) * 100));

  const submit = async (e) => {
    e.preventDefault();
    clearMessages();

    const oldP = String(oldPassword || "").trim();
    const newP = String(newPassword || "").trim();
    const conP = String(confirmPassword || "").trim();

    if (!oldP) return setErr("Please enter old password.");
    if (!newP) return setErr("Please enter new password.");
    if (newP.length < 6) return setErr("New password must be at least 6 characters.");
    if (newP !== conP) return setErr("Confirm password does not match.");
    if (oldP === newP) return setErr("New password should be different from old password.");

    try {
      setLoading(true);

      const res = await axiosInstance.post(
        "/api/users/change-password",
        { oldPassword: oldP, newPassword: newP },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setOk(res?.data?.msg || res?.data?.message || "Password changed successfully ✅");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // OPTIONAL: logout after change password (safer)
      // localStorage.removeItem("token");
      // localStorage.removeItem("authToken");
      // navigate("/login", { replace: true });
    } catch (e2) {
      setErr(
        e2?.response?.data?.msg ||
          e2?.response?.data?.message ||
          e2?.message ||
          "Change password failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.container}>
        {/* Header */}
        <div style={S.hero}>
          <div style={{ minWidth: 0 }}>
            <div style={S.h1}>Change Password</div>
            <div style={S.sub}>Old password check + set new password</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => navigate(-1)} disabled={loading}>
              ← Back
            </button>
            <button style={S.btnGhost} onClick={resetForm} disabled={loading}>
              Clear
            </button>
          </div>
        </div>

        {err && <div style={{ ...S.alert, borderColor: "rgba(255,90,90,.30)", color: "#ffb4b4" }}>{err}</div>}
        {ok && <div style={{ ...S.alert, borderColor: "rgba(47,210,107,.30)", color: "#bdf8d1" }}>{ok}</div>}

        <div className="grid" style={S.grid}>
          {/* Form */}
          <form style={S.card} onSubmit={submit}>
            <div style={S.cardTitle}>Update Password</div>

            {/* Old */}
            <div style={S.field}>
              <div style={S.label}>Old Password</div>
              <div style={S.inputRow}>
                <input
                  style={S.input}
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter old password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button type="button" style={S.eye} onClick={() => setShowOld((v) => !v)} disabled={loading}>
                  {showOld ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* New */}
            <div style={S.field}>
              <div style={S.label}>New Password</div>
              <div style={S.inputRow}>
                <input
                  style={S.input}
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" style={S.eye} onClick={() => setShowNew((v) => !v)} disabled={loading}>
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>

              <div style={S.strRow}>
                <div style={S.strLeft}>
                  <span style={S.strLabel}>Strength</span>
                  <span style={S.strValue}>{strengthLabel}</span>
                </div>
                <div style={S.strHint}>8+ chars, A-Z, 0-9, symbol</div>
              </div>

              <div style={S.barWrap}>
                <div style={{ ...S.barFill, width: `${strengthPct}%` }} />
              </div>
            </div>

            {/* Confirm */}
            <div style={S.field}>
              <div style={S.label}>Confirm Password</div>
              <div style={S.inputRow}>
                <input
                  style={S.input}
                  type={showCon ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" style={S.eye} onClick={() => setShowCon((v) => !v)} disabled={loading}>
                  {showCon ? "Hide" : "Show"}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.92 }}>
                  {newPassword === confirmPassword ? (
                    <span style={{ color: "#bdf8d1", fontWeight: 950 }}>✅ Passwords match</span>
                  ) : (
                    <span style={{ color: "#ffb4b4", fontWeight: 950 }}>❌ Passwords do not match</span>
                  )}
                </div>
              )}
            </div>

            <div style={S.actions}>
              <button type="button" style={S.btn} onClick={() => navigate("/profile")} disabled={loading}>
                Profile
              </button>
              <button type="submit" style={S.btnGold} disabled={loading}>
                {loading ? "Saving..." : "Save Password"}
              </button>
            </div>

            <div style={S.apiNote}>
              API used: <b>POST /api/users/change-password</b> <br />
              Body: <code style={S.code}>{"{ oldPassword, newPassword }"}</code>
            </div>
          </form>

          {/* Side Card (simple) */}
          <div style={S.card}>
            <div style={S.cardTitle}>Security</div>

            <div style={S.tip}>
              <div style={S.tipTitle}>Don’t share password</div>
              <div style={S.tipText}>Keep it private, even from friends.</div>
            </div>

            <div style={S.tip}>
              <div style={S.tipTitle}>Use strong password</div>
              <div style={S.tipText}>Combine letters, numbers, and symbols.</div>
            </div>

            <div style={S.tip}>
              <div style={S.tipTitle}>Change regularly</div>
              <div style={S.tipText}>Update if you suspect any login issue.</div>
            </div>

            <button style={S.btnGhostWide} onClick={resetForm} disabled={loading}>
              Reset Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const css = `
  *{ margin:0; padding:0; box-sizing:border-box; }
  html,body,#root{ height:100%; width:100%; }
  body{
    overflow-x:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
    background: linear-gradient(180deg,#040915 0%,#060c19 50%,#050914 100%);
    color: #e9eefc;
  }
  button, input{ font-family: inherit; }
  input::placeholder{ color: rgba(233,238,252,.55); }
  @media (max-width: 980px){
    .grid{ grid-template-columns: 1fr !important; }
  }
`;

const S = {
  page: { minHeight: "100vh", color: "#e9eefc" },
  container: { width: "min(1100px, 100%)", margin: "0 auto", padding: "18px 16px 60px" },

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
    marginBottom: 14,
  },
  h1: { fontSize: 34, fontWeight: 950 },
  sub: { marginTop: 6, fontSize: 13, opacity: 0.82 },

  alert: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    marginBottom: 10,
    lineHeight: 1.45,
    fontWeight: 850,
    fontSize: 13,
  },

  grid: { display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 12, alignItems: "start" },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
    overflow: "hidden",
    padding: 14,
  },

  cardTitle: { fontSize: 16, fontWeight: 950, marginBottom: 12 },

  field: { display: "grid", gap: 8, marginBottom: 12 },
  label: { fontSize: 12, opacity: 0.85, fontWeight: 950 },

  inputRow: { display: "grid", gridTemplateColumns: "1fr 88px", gap: 10, alignItems: "center" },

  input: {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(10,16,35,.55)",
    color: "#e9eefc",
    padding: "0 12px",
    outline: "none",
  },

  eye: {
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 950,
    cursor: "pointer",
  },

  strRow: {
    marginTop: 10,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  strLeft: { display: "flex", gap: 10, alignItems: "center" },
  strLabel: { fontSize: 12, opacity: 0.85, fontWeight: 950 },
  strValue: { fontSize: 12, fontWeight: 950, color: "#ffd24a" },
  strHint: { fontSize: 12, opacity: 0.72 },

  barWrap: {
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(220,235,255,.10)",
    overflow: "hidden",
    marginTop: 10,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(255,90,90,.85), rgba(255,210,74,.85), rgba(47,210,107,.85))",
  },

  actions: { marginTop: 6, display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" },

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(10,16,35,.55)",
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

  apiNote: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(220,235,255,.10)",
    fontSize: 12,
    opacity: 0.88,
    lineHeight: 1.55,
  },
  code: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 10,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
  },

  tip: {
    borderRadius: 16,
    border: "1px solid rgba(220,235,255,.10)",
    background: "rgba(10,16,35,.55)",
    padding: 12,
    marginBottom: 10,
  },
  tipTitle: { fontWeight: 950, marginBottom: 6 },
  tipText: { fontSize: 12, opacity: 0.85, lineHeight: 1.5 },

  btnGhostWide: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(10,16,35,.55)",
    color: "#e9eefc",
    fontWeight: 950,
    cursor: "pointer",
    marginTop: 4,
  },
};
