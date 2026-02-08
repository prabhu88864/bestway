// src/pages/DailyIncomeReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * GET /api/reports/daily-income
 * Optional params: ?date=YYYY-MM-DD&timezone=Asia/Kolkata (if backend supports)
 */

const safe = (v, fb = "-") => (v === null || v === undefined || v === "" ? fb : v);

const fmt = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

const todayYYYYMMDD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function TxnTable({ rows }) {
  const list = Array.isArray(rows) ? rows : [];

  if (list.length === 0) return <div style={{ color: "#666", padding: 8 }}>No transactions</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Pending</th>
            <th style={styles.th}>Created At</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t?.id ?? `${t?.createdAt}-${Math.random()}`}>
              <td style={styles.td}>#{safe(t?.id)}</td>
              <td style={styles.td}>₹{Number(t?.amount || 0).toFixed(2)}</td>
              <td style={styles.td}>
                <span style={{ ...styles.pill, ...(t?.pending ? styles.pillWarn : styles.pillOk) }}>
                  {t?.pending ? "PENDING" : "CREDITED"}
                </span>
              </td>
              <td style={styles.td}>{fmt(t?.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DailyIncomeReport() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // form
  const [date, setDate] = useState(todayYYYYMMDD());
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // data
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchReport(todayYYYYMMDD(), "Asia/Kolkata");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = async (d, tz) => {
    try {
      setErr("");
      setLoading(true);

      const res = await axiosInstance.get("/api/reports/daily-income", {
        params: { date: d, timezone: tz },
      });

      setReport(res?.data || null);
    } catch (e) {
      console.log("daily-income error", e);
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        navigate("/login", { replace: true });
      } else {
        setErr(e?.response?.data?.msg || "Failed to load daily income report");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    fetchReport(date, timezone);
  };

  const pairTxns = useMemo(() => report?.recent?.pairTxns || [], [report]);
  const joinTxns = useMemo(() => report?.recent?.joinTxns || [], [report]);

  const totals = report?.totals || {};
  const pairIncome = report?.pairIncome || {};
  const joinIncome = report?.joinIncome || {};

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Daily Income Report</div>
          <div style={styles.subtitle}>Pair income + joining income (daily)</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <button
            style={styles.btn2}
            onClick={() => fetchReport(date, timezone)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* FORM CARD (same style like your admin pages) */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Filter</div>

        <form onSubmit={onSubmit} style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Timezone</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={styles.input}
              placeholder="Asia/Kolkata"
              disabled={loading}
            />
            <div style={styles.hint}>Example: Asia/Kolkata</div>
          </div>

          <div style={styles.fieldBtn}>
            <label style={styles.label}>&nbsp;</label>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? "Loading..." : "Get Report"}
            </button>
          </div>
        </form>

        {err ? <div style={styles.error}>{err}</div> : null}
      </div>

      {/* REPORT */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.info}>Loading...</div>
        ) : !report ? (
          <div style={styles.info}>No data</div>
        ) : (
          <>
            <div style={styles.meta}>
              Date: <b>{safe(report?.date)}</b> • Timezone: <b>{safe(report?.timezone)}</b>
            </div>

            {/* KPI CARDS (same admin look) */}
            <div className="__di_g3" style={styles.kpiGrid}>
              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>Total Income</div>
                <div style={styles.kpiValue}>{money(totals?.grandTotal)}</div>
                <div style={styles.kpiHint}>
                  Credited: <b>{money(totals?.credited)}</b> • Pending: <b>{money(totals?.pending)}</b>
                </div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>Pairs</div>
                <div style={styles.kpiValue}>{Number(report?.pairsMatched || 0)}</div>
                <div style={styles.kpiHint}>
                  Flushed: <b>{Number(report?.flushedPairs || 0)}</b>
                </div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>Transactions</div>
                <div style={styles.kpiValue}>
                  {(Number(pairIncome?.transactionsCount || 0) + Number(joinIncome?.transactionsCount || 0)) || 0}
                </div>
                <div style={styles.kpiHint}>
                  Pair: <b>{Number(pairIncome?.transactionsCount || 0)}</b> • Join:{" "}
                  <b>{Number(joinIncome?.transactionsCount || 0)}</b>
                </div>
              </div>
            </div>

            <div style={styles.hr} />

            {/* BREAKDOWN */}
            <div style={styles.sectionTitle}>Breakdown</div>
            <div className="__di_g2" style={styles.breakGrid}>
              <div style={styles.panel}>
                <div style={styles.panelTitle}>Pair Income</div>
                <div style={styles.line}><span style={styles.k}>Credited:</span> <b>{money(pairIncome?.credited)}</b></div>
                <div style={styles.line}><span style={styles.k}>Pending:</span> <b>{money(pairIncome?.pending)}</b></div>
                <div style={styles.line}><span style={styles.k}>Total:</span> <b>{money(pairIncome?.total)}</b></div>
                <div style={styles.line}><span style={styles.k}>Txns:</span> <b>{Number(pairIncome?.transactionsCount || 0)}</b></div>
              </div>

              <div style={styles.panel}>
                <div style={styles.panelTitle}>Joining Income</div>
                <div style={styles.line}><span style={styles.k}>Credited:</span> <b>{money(joinIncome?.credited)}</b></div>
                <div style={styles.line}><span style={styles.k}>Pending:</span> <b>{money(joinIncome?.pending)}</b></div>
                <div style={styles.line}><span style={styles.k}>Total:</span> <b>{money(joinIncome?.total)}</b></div>
                <div style={styles.line}><span style={styles.k}>Txns:</span> <b>{Number(joinIncome?.transactionsCount || 0)}</b></div>
              </div>
            </div>

            <div style={styles.hr} />

            {/* RECENTS */}
            <div style={styles.sectionTitle}>Recent Pair Transactions</div>
            <TxnTable rows={pairTxns} />

            <div style={{ height: 10 }} />

            <div style={styles.sectionTitle}>Recent Joining Transactions</div>
            <TxnTable rows={joinTxns} />
          </>
        )}
      </div>

      {/* RESPONSIVE (now actually works) */}
      <style>{`
        @media (max-width: 900px){
          .__di_g3{ grid-template-columns: 1fr !important; }
          .__di_g2{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES (same like your admin pages) ================= */
const styles = {
  page: { padding: 18, background: "#f4f6f8", minHeight: "100vh" },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: 1000, letterSpacing: 0.2 },
  subtitle: { fontSize: 13, opacity: 0.75, marginTop: 2 },

  btn: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 12,
    border: "1px solid #dcdcdc",
    background: "#fff",
    fontWeight: 900,
  },
  btn2: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 12,
    border: "1px solid #dcdcdc",
    background: "#f7f7f7",
    fontWeight: 900,
  },
  btnPrimary: {
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: 12,
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 1000,
    width: "100%",
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: 14,
  },

  sectionTitle: { fontWeight: 1000, marginBottom: 10, color: "#111", fontSize: 14 },
  meta: { marginBottom: 12, color: "#444" },
  info: { padding: 10, color: "#666" },

  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 220px",
    gap: 12,
    alignItems: "end",
  },
  field: { display: "flex", flexDirection: "column" },
  fieldBtn: { display: "flex", flexDirection: "column" },
  label: { display: "block", fontSize: 12, fontWeight: 1000, margin: "6px 0", opacity: 0.8 },
  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  hint: { fontSize: 12, opacity: 0.75, marginTop: 6 },

  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "#fdecec",
    border: "1px solid #f6c0c0",
    color: "#8f1d1d",
    fontWeight: 900,
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 6,
  },
  kpi: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fafafa",
  },
  kpiLabel: { fontSize: 12, opacity: 0.75, fontWeight: 1000 },
  kpiValue: { fontSize: 18, fontWeight: 1100, marginTop: 6 },
  kpiHint: { fontSize: 12, opacity: 0.75, marginTop: 6, lineHeight: 1.4 },

  hr: { height: 1, background: "#eee", margin: "14px 0" },

  breakGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  panel: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
  },
  panelTitle: { fontWeight: 1000, marginBottom: 10, color: "#111", fontSize: 14 },
  line: { fontSize: 13, marginBottom: 6, color: "#222" },
  k: { opacity: 0.7, fontWeight: 900 },

  pill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.3,
    border: "1px solid #ddd",
    background: "#f3f3f3",
    color: "#333",
  },
  pillOk: { background: "#e9f7ef", border: "1px solid #bfe6cf", color: "#17643a" },
  pillWarn: { background: "#fff7e6", border: "1px solid #ffe2a8", color: "#8a5a00" },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
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
};
