import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginInitiate } from "../redux/actions/loginAction";

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.adminLogin || {});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return alert("Please enter both email and password");
    }
    // ✅ same like login
    dispatch(loginInitiate({ email, password }, navigate));
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
        }

        body{
          background:
            radial-gradient(900px 600px at 10% 10%, rgba(109,91,255,.16), transparent 55%),
            radial-gradient(900px 600px at 90% 25%, rgba(34,211,238,.14), transparent 55%),
            linear-gradient(180deg, #070a16, var(--bg));
          color: var(--text);
        }

        .page{
          min-height:100vh;
          display:grid;
          place-items:center;
          padding: 22px 14px;
        }

        .card{
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 24px 60px rgba(0,0,0,.45);
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
        .label{
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
          color: rgba(255,255,255,.84);
        }
        .input{
          width:100%;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(10, 14, 28, .50);
          color: var(--text);
          outline:none;
        }
        .input:focus{
          border-color: rgba(34,211,238,.60);
          box-shadow: 0 0 0 4px rgba(34,211,238,.14);
        }

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
        }
        .btn:disabled{ opacity:.65; cursor:not-allowed; }

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
      `}</style>

      <main className="page">
        <div className="card">
          <div className="title">Admin Login</div>
          <div className="subtitle">Only admin can access this page.</div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <div className="label">Email</div>
              <input
                className="input"
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="field">
              <div className="label">Password</div>
              <input
                className="input"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Login"}
            </button>

            {error && <div className="error">{error}</div>}
          </form>
        </div>
      </main>
    </>
  );
}
