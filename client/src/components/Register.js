import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { STATUS_CODE, BASE_URL } from "../API/Constants";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; 

// build API base from BASE_URL, trimming any trailing slash
const _apiBase = (BASE_URL || "").replace(/\/+$/, "");

export default function Register() {
  const navigate = useNavigate();

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // ✅ NEW columns
  const [role, setRole] = useState("USER"); // USER / ADMIN
  const [userType, setUserType] = useState("TRAINEE_ENTREPRENEUR"); // or ENTREPRENEUR
  const [referralCode, setReferralCode] = useState("");

  // ✅ FILE
  const [profilePic, setProfilePic] = useState(null);
  const previewUrl = useMemo(() => {
    if (!profilePic) return "";
    return URL.createObjectURL(profilePic);
  }, [profilePic]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  // cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ✅ redirect after success
  useEffect(() => {
    if (isRegistered) {
      const t = setTimeout(() => navigate("/login"), 800);
      return () => clearTimeout(t);
    }
  }, [isRegistered, navigate]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setProfilePic(null);
      return;
    }
    const maxMb = 5;
    if (f.size > maxMb * 1024 * 1024) {
      alert(`Image too large. Max ${maxMb}MB`);
      e.target.value = "";
      return;
    }
    setProfilePic(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setApiResponse(null);
    setIsRegistered(false);

    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      return alert("Please fill all required fields");
    }

    try {
      setLoading(true);

      // ✅ multipart/form-data
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("phone", phone.trim());
      fd.append("password", password);
      fd.append("role", role);
      fd.append("userType", userType);

      if (referralCode.trim()) fd.append("referralCode", referralCode.trim());
      if (profilePic) fd.append("profilePic", profilePic); // MUST be profilePic

      const res = await axios.get(`${_apiBase}/api/auth/register`,
         {
        method: "POST",
        body: fd,
        // ✅ do NOT set Content-Type manually
      });

      
      


      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.msg || data?.message || "Registration failed");
        setApiResponse(data || null);
        return;
      }

      // show response
      setApiResponse(data);

      // ✅ IMPORTANT FIX:
      // ✅ After register success -> DO NOT auto-login (do NOT save token/user)
      // ✅ Always force user to login manually
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // ✅ redirect to login (handled by useEffect)
      setIsRegistered(true);
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *{ box-sizing:border-box; margin:0; padding:0; }
        html, body, #root{
          height:100%;
          width:100%;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
          background:#0b1020;
        }

        :root{
          --bg:#0b1020;
          --border: rgba(255,255,255,.12);
          --text: rgba(255,255,255,.92);
          --muted: rgba(255,255,255,.68);
          --brand1:#6D5BFF;
          --brand2:#22D3EE;
          --danger:#ff6b6b;
          --ok:#5CFFB0;
        }

        body{
          background:
            radial-gradient(900px 600px at 10% 10%, rgba(109,91,255,.16), transparent 55%),
            radial-gradient(900px 600px at 90% 25%, rgba(34,211,238,.14), transparent 55%),
            linear-gradient(180deg, #070a16, var(--bg));
          color: var(--text);
        }

        .page{
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 22px 14px;
        }

        .card{
          width: 100%;
          max-width: 520px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 24px 60px rgba(0,0,0,.45);
          position: relative;
          overflow: hidden;
        }

        .glow{
          position:absolute;
          inset:-120px -120px auto auto;
          width: 240px; height: 240px;
          background: radial-gradient(circle at 30% 30%, rgba(34,211,238,.25), transparent 60%);
          pointer-events:none;
        }

        .title{
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 6px;
        }
        .subtitle{
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 14px;
        }

        .field{ margin-top: 12px; }

        .row2{
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .label{
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
          color: rgba(255,255,255,.84);
        }

        .input, .select{
          width:100%;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(10, 14, 28, .50);
          color: var(--text);
          outline:none;
        }
        .input:focus, .select:focus{
          border-color: rgba(34,211,238,.60);
          box-shadow: 0 0 0 4px rgba(34,211,238,.14);
        }

        .fileWrap{
          border: 1px dashed rgba(255,255,255,.22);
          background: rgba(10, 14, 28, .35);
          padding: 12px;
          border-radius: 14px;
          display:flex;
          gap: 12px;
          align-items:center;
        }

        .avatar{
          width: 54px; height: 54px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.06);
          overflow:hidden;
          flex: 0 0 auto;
          display:grid;
          place-items:center;
          color: rgba(255,255,255,.75);
          font-weight: 900;
        }
        .avatar img{
          width:100%;
          height:100%;
          object-fit: cover;
        }

        .fileMeta{
          flex: 1 1 auto;
          min-width: 0;
        }
        .fileName{
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fileHint{
          font-size: 12px;
          margin-top: 2px;
          color: var(--muted);
        }

        .fileBtn{
          flex: 0 0 auto;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          cursor: pointer;
        }
        .fileBtn:hover{ border-color: rgba(34,211,238,.5); }

        .hiddenFile{ display:none; }

        .btn{
          width: 100%;
          margin-top: 16px;
          padding: 12px 12px;
          border-radius: 12px;
          border: none;
          cursor:pointer;
          font-weight: 900;
          letter-spacing:.5px;
          background: linear-gradient(135deg, rgba(109,91,255,.96), rgba(34,211,238,.88));
          color: #08101f;
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
        }
        .btn:disabled{ opacity:.65; cursor:not-allowed; }

        .spinner{
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(8,16,31,.35);
          border-top-color: rgba(8,16,31,.95);
          animation: spin .7s linear infinite;
        }
        @keyframes spin{ to{ transform: rotate(360deg); } }

        .error{
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,107,107,.35);
          background: rgba(255,107,107,.10);
          color: #ffd2d2;
          font-weight: 700;
          font-size: 13px;
        }

        .success{
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(92,255,176,.24);
          background: rgba(92,255,176,.10);
          color: rgba(210,255,232,.95);
          font-weight: 800;
          font-size: 13px;
        }

        .links{
          margin-top: 12px;
          display:flex;
          justify-content:space-between;
          gap: 10px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--muted);
        }
        .links a{
          color: rgba(34,211,238,.92);
          text-decoration:none;
          font-weight: 800;
        }
        .links a:hover{ text-decoration: underline; }

        .respBox{
          margin-top: 14px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(10,14,28,.40);
          overflow:auto;
          max-height: 220px;
          font-size: 12px;
          line-height: 1.35;
          color: rgba(255,255,255,.85);
          white-space: pre-wrap;
          word-break: break-word;
        }

        @media (max-width: 520px){
          .row2{ grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="page">
        <div className="card">
          <div className="glow" />
          <div className="title">Register</div>
          <div className="subtitle">
            Endpoint:{" "}
            <span style={{ color: "rgba(34,211,238,.92)", fontWeight: 900 }}>
              /api/auth/register
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <div className="label">Name</div>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="field">
              <div className="label">Email</div>
              <input
                className="input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <div className="label">Phone</div>
              <input
                className="input"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>

            <div className="field">
              <div className="label">Password</div>
              <input
                className="input"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="row2">
              <div className="field" style={{ marginTop: 0 }}>
                <div className="label">Role</div>
                <select
                  className="select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {/* ✅ keep commented if you want
              <div className="field" style={{ marginTop: 0 }}>
                <div className="label">User Type</div>
                <select
                  className="select"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                >
                  <option value="TRAINEE_ENTREPRENEUR">
                    TRAINEE_ENTREPRENEUR
                  </option>
                  <option value="ENTREPRENEUR">ENTREPRENEUR</option>
                </select>
              </div>
              */}
            </div>

            <div className="field">
              <div className="label">Referral Code (optional)</div>
              <input
                className="input"
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="field">
              <div className="label">Profile Picture (optional)</div>

              <div className="fileWrap">
                <div className="avatar">
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" />
                  ) : (
                    (name?.trim()?.[0] || "U").toUpperCase()
                  )}
                </div>

                <div className="fileMeta">
                  <div className="fileName">
                    {profilePic ? profilePic.name : "No file selected"}
                  </div>
                  <div className="fileHint">PNG/JPG up to 5MB</div>
                </div>

                <label className="fileBtn">
                  Choose
                  <input
                    className="hiddenFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                  />
                </label>
              </div>
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Creating...
                </>
              ) : (
                "Register"
              )}
            </button>

            {error && <div className="error">{error}</div>}

            {isRegistered && (
              <div className="success">
                Registered successfully 🎉 Redirecting to Login...
              </div>
            )}

            {apiResponse && (
              <div className="respBox">{JSON.stringify(apiResponse, null, 2)}</div>
            )}

            <div className="links">
              <span>
                Already have account? <Link to="/login">Login</Link>
              </span>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
