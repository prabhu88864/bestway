import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { loginInitiate } from "../redux/actions/loginAction";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.login || {});

  const [userID, setUserID] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!userID.trim() || !password.trim()) {
      return alert("Please enter User ID and password");
    }

    // ✅ Send userID instead of email
    dispatch(loginInitiate({ userID, password }, navigate));
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
          min-height: 100vh;
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
      `}</style>

      <main className="page">
        <div className="card">
          <div className="title">Login</div>
          <div className="subtitle">
            Enter your User ID and password to continue.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <div className="label">User ID</div>
              <input
                className="input"
                type="text"
                placeholder="Enter your User ID"
                value={userID}
                onChange={(e) => setUserID(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="field">
              <div className="label">Password</div>
              <input
                className="input"
                type="password"
                placeholder="Enter your password"
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

            <div className="links">
              <span>
                New user? <Link to="/register">Register</Link>
              </span>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
