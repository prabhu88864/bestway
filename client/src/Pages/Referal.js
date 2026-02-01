import React, { useMemo, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export default function CreateReferral() {
  const [position, setPosition] = useState("RIGHT");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resData, setResData] = useState(null);
  const [copied, setCopied] = useState(false);

  const token = useMemo(() => {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  }, []);

  // ✅ Works for both baseURL types:
  // baseURL = http://localhost:3000     => use /api/referrals/create
  // baseURL = http://localhost:3000/api => use /referrals/create
  const REFERRAL_ENDPOINT = useMemo(() => {
    const base = String(axiosInstance?.defaults?.baseURL || "");
    const hasApi = base.endsWith("/api") || base.includes("/api/");
    return hasApi ? "/referrals/create" : "/api/referrals/create";
  }, []);

  const createReferral = async () => {
    setErr("");
    setResData(null);
    setCopied(false);

    if (!token) {
      setErr("Token not found. Please login first.");
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post(
        REFERRAL_ENDPOINT,
        { position }, // LEFT / RIGHT
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setResData(res.data);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      setErr("Copy failed. Please copy manually.");
    }
  };

  const buildWhatsAppLink = () => {
    if (!resData?.referralCode && !resData?.url) return "#";
    const text = `Join using my referral ✅\n\nPosition: ${resData?.position}\nReferral Code: ${resData?.referralCode}\nLink: ${resData?.url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
          max-width: 480px;
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
          line-height: 1.4;
        }

        .field{ margin-top: 12px; }
        .label{
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
          color: rgba(255,255,255,.84);
        }

        .select{
          width:100%;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(10, 14, 28, .50);
          color: var(--text);
          outline:none;
        }
        .select:focus{
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
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
        }
        .btn:disabled{ opacity:.65; cursor:not-allowed; }

        .row{
          display:flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .btn2{
          flex:1;
          min-width: 160px;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14);
          cursor:pointer;
          font-weight: 900;
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.86);
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
          text-decoration:none;
        }
        .btn2:disabled{ opacity:.65; cursor:not-allowed; }

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

        .codebox{
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.22);
          overflow:auto;
          font-size: 12px;
          color: rgba(255,255,255,.86);
          line-height: 1.45;
        }

        .kv{
          display:grid;
          grid-template-columns: 130px 1fr;
          gap: 8px;
          margin-top: 8px;
          font-size: 13px;
        }
        .k{ color: rgba(255,255,255,.70); font-weight: 800; }
        .v{ color: rgba(255,255,255,.92); font-weight: 900; word-break: break-all; }

        .hint{
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255,255,255,.55);
        }
      `}</style>

      <main className="page">
        <div className="card">
          <div className="title">Create Referral Link</div>
          <div className="subtitle">
            Select <b>LEFT</b> or <b>RIGHT</b>, then generate a referral code you can share on WhatsApp.
          </div>

          <div className="field">
            <div className="label">Choose Position</div>
            <select
              className="select"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="LEFT">LEFT</option>
              <option value="RIGHT">RIGHT</option>
            </select>

            <div className="hint">
              Calling: <b>{REFERRAL_ENDPOINT}</b>
            </div>
          </div>

          <button className="btn" type="button" onClick={createReferral} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Creating...
              </>
            ) : (
              "Generate Referral"
            )}
          </button>

          {err && <div className="error">{err}</div>}

          {resData && (
            <>
              <div className="success">{resData?.msg || "Created"} ✅</div>

              <div className="codebox">
                <div className="kv">
                  <div className="k">Position</div>
                  <div className="v">{resData?.position || position}</div>

                  <div className="k">Referral Code</div>
                  <div className="v">{resData?.referralCode || "—"}</div>

                  <div className="k">URL</div>
                  <div className="v">{resData?.url || "—"}</div>
                </div>

                <div className="row">
                  <button
                    className="btn2"
                    type="button"
                    onClick={() => copyText(resData?.referralCode || "")}
                    disabled={!resData?.referralCode}
                  >
                    {copied ? "Copied ✅" : "Copy Code"}
                  </button>

                  <button
                    className="btn2"
                    type="button"
                    onClick={() => copyText(resData?.url || "")}
                    disabled={!resData?.url}
                  >
                    Copy Link
                  </button>

                  <a
                    className="btn2"
                    href={buildWhatsAppLink()}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!resData?.url && !resData?.referralCode) e.preventDefault();
                    }}
                    style={{ textAlign: "center" }}
                  >
                    Share WhatsApp
                  </a>
                </div>
              </div>

              <pre className="codebox">{JSON.stringify(resData, null, 2)}</pre>
            </>
          )}
        </div>
      </main>
    </>
  );
}
