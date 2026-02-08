// src/pages/AwardsAchivement.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * USER API:
 * GET /api/awards/my
 *
 * This page shows:
 * - totalPairs (if backend returns)
 * - active rank settings list (pairsRequired, cashReward, giftName)
 * - my achievements list (pairsRequired, cashReward, giftName, giftStatus, meta.remarks, createdAt)
 *
 * ✅ Works even if backend returns different keys (settings/achievements/totalPairs).
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

const badgeStyle = (st) => {
  const s = String(st || "").toUpperCase();
  if (s === "PENDING")
    return { background: "#fff7e6", border: "1px solid #ffe2a8", color: "#8a5a00" };
  if (s === "APPROVED")
    return { background: "#e9f7ef", border: "1px solid #bfe6cf", color: "#17643a" };
  if (s === "DELIVERED")
    return { background: "#e6f0ff", border: "1px solid #b9d5ff", color: "#1d4ed8" };
  if (s === "REJECTED" || s === "HOLD")
    return { background: "#fdecec", border: "1px solid #f6c0c0", color: "#8f1d1d" };
  return { background: "#f3f3f3", border: "1px solid #ddd", color: "#333" };
};

export default function AwardsAchivement() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [totalPairs, setTotalPairs] = useState(0);
  const [settings, setSettings] = useState([]); // all reward slabs (active)
  const [achievements, setAchievements] = useState([]); // my achieved rows

  const [tab, setTab] = useState("MY"); // MY / ALL
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchMyAwards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyAwards = async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await axiosInstance.get("/api/awards/my");
      const d = res?.data || {};

      // supports multiple backend shapes
      const tp =
        d.totalPairs ??
        d.pairs ??
        d.myPairs ??
        d.data?.totalPairs ??
        0;

      const st =
        Array.isArray(d.settings) ? d.settings :
        Array.isArray(d.rankSettings) ? d.rankSettings :
        Array.isArray(d.awards) ? d.awards :
        Array.isArray(d.data?.settings) ? d.data.settings :
        [];

      const ac =
        Array.isArray(d.achievements) ? d.achievements :
        Array.isArray(d.myAchievements) ? d.myAchievements :
        Array.isArray(d.data?.achievements) ? d.data.achievements :
        [];

      setTotalPairs(Number(tp || 0));
      setSettings(st);
      setAchievements(ac);
    } catch (e) {
      console.log("awards/my error", e);
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        navigate("/login", { replace: true });
      } else {
        setErr(e?.response?.data?.msg || "Failed to load awards");
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizedSettings = useMemo(() => {
    return (settings || [])
      .map((x) => ({
        id: x?.id ?? x?._id ?? `${x?.pairsRequired}-${x?.giftName}`,
        pairsRequired: Number(x?.pairsRequired || 0),
        cashReward: Number(x?.cashReward || 0),
        giftName: String(x?.giftName || ""),
        isActive: x?.isActive ?? true,
      }))
      .sort((a, b) => a.pairsRequired - b.pairsRequired);
  }, [settings]);

  const normalizedAchievements = useMemo(() => {
    return (achievements || [])
      .map((a) => ({
        id: a?.id ?? a?._id,
        pairsRequired: Number(a?.pairsRequired ?? a?.setting?.pairsRequired ?? 0),
        cashReward: Number(a?.cashReward ?? a?.setting?.cashReward ?? 0),
        giftName: String(a?.giftName ?? a?.setting?.giftName ?? ""),
        giftStatus: String(a?.giftStatus ?? a?.status ?? "PENDING").toUpperCase(),
        meta: a?.meta || {},
        createdAt: a?.createdAt ?? a?.achievedAt,
        updatedAt: a?.updatedAt,
      }))
      .sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
  }, [achievements]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (tab === "ALL") {
      const rows = normalizedSettings.filter((x) => Boolean(x.isActive) !== false);
      if (!q) return rows;

      return rows.filter((x) => {
        const s = `${x.pairsRequired} ${x.cashReward} ${x.giftName}`.toLowerCase();
        return s.includes(q);
      });
    }

    if (!q) return normalizedAchievements;

    return normalizedAchievements.filter((x) => {
      const s = `${x.pairsRequired} ${x.cashReward} ${x.giftName} ${x.giftStatus} ${x?.meta?.remarks || ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [tab, search, normalizedSettings, normalizedAchievements]);

  const nextTarget = useMemo(() => {
    const active = normalizedSettings.filter((x) => Boolean(x.isActive) !== false);
    const next = active.find((x) => x.pairsRequired > totalPairs);
    if (!next) return null;
    const remaining = Math.max(0, next.pairsRequired - totalPairs);
    return { ...next, remaining };
  }, [normalizedSettings, totalPairs]);

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Awards & Achievements</div>
          <div style={styles.subtitle}>Track your pairs and rewards</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <button style={styles.btn2} onClick={fetchMyAwards} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={styles.cards}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Pairs</div>
          <div style={styles.kpiValue}>{Number(totalPairs || 0)}</div>
          <div style={styles.kpiHint}>Your current total matched pairs</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Next Reward</div>
          {nextTarget ? (
            <>
              <div style={styles.kpiValue}>
                {nextTarget.pairsRequired} pairs
              </div>
              <div style={styles.kpiHint}>
                Remaining: <b>{nextTarget.remaining}</b> • Gift:{" "}
                <b>{safe(nextTarget.giftName)}</b> • Cash:{" "}
                <b>{money(nextTarget.cashReward)}</b>
              </div>
            </>
          ) : (
            <>
              <div style={styles.kpiValue}>Completed</div>
              <div style={styles.kpiHint}>No next target (you reached max slab)</div>
            </>
          )}
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>My Achievements</div>
          <div style={styles.kpiValue}>{normalizedAchievements.length}</div>
          <div style={styles.kpiHint}>Total achieved rewards</div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabBtn, ...(tab === "MY" ? styles.tabOn : {}) }}
            onClick={() => setTab("MY")}
          >
            My Achievements
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "ALL" ? styles.tabOn : {}) }}
            onClick={() => setTab("ALL")}
          >
            All Rewards
          </button>
        </div>

        <div style={styles.searchBar}>
          <span style={{ opacity: 0.75 }}>🔎</span>
          <input
            style={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "MY" ? "Search status / gift / remarks..." : "Search pairs / gift..."}
          />
          {search ? (
            <button style={styles.clearBtn} onClick={() => setSearch("")}>
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div style={styles.card}>
        {err ? (
          <div style={styles.error}>{err}</div>
        ) : loading ? (
          <div style={styles.info}>Loading...</div>
        ) : tab === "MY" ? (
          <>
            <div style={styles.meta}>
              Total: <b>{list.length}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Pairs", "Cash", "Gift", "Status", "Remarks", "Achieved At"].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.empty}>
                        No achievements yet
                      </td>
                    </tr>
                  ) : (
                    list.map((a) => (
                      <tr key={a.id || `${a.pairsRequired}-${a.giftName}-${a.createdAt}`}>
                        <td style={styles.td}>
                          <b>{a.pairsRequired}</b>
                        </td>
                        <td style={styles.td}>{money(a.cashReward)}</td>
                        <td style={styles.td}>
                          <b>{safe(a.giftName)}</b>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...badgeStyle(a.giftStatus) }}>
                            {a.giftStatus}
                          </span>
                        </td>
                        <td style={styles.td}>{safe(a?.meta?.remarks, "—")}</td>
                        <td style={styles.td}>{fmt(a.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div style={styles.meta}>
              Total: <b>{list.length}</b>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Pairs Required", "Cash Reward", "Gift", "Progress"].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={styles.empty}>
                        No reward settings found
                      </td>
                    </tr>
                  ) : (
                    list.map((x) => {
                      const done = totalPairs >= x.pairsRequired;
                      const rem = Math.max(0, x.pairsRequired - totalPairs);

                      return (
                        <tr key={x.id}>
                          <td style={styles.td}>
                            <b>{x.pairsRequired}</b>
                          </td>
                          <td style={styles.td}>{money(x.cashReward)}</td>
                          <td style={styles.td}>
                            <b>{safe(x.giftName)}</b>
                          </td>
                          <td style={styles.td}>
                            {done ? (
                              <span style={{ ...styles.badge, ...badgeStyle("APPROVED") }}>
                                ✅ Eligible / Completed
                              </span>
                            ) : (
                              <span style={{ ...styles.badge, ...badgeStyle("PENDING") }}>
                                Need {rem} more pairs
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
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

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    border: "1px solid #eee",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  kpiLabel: { fontSize: 12, opacity: 0.75, fontWeight: 1000 },
  kpiValue: { fontSize: 22, fontWeight: 1100, marginTop: 6 },
  kpiHint: { fontSize: 12, opacity: 0.75, marginTop: 6, lineHeight: 1.4 },

  controls: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tabs: { display: "flex", gap: 10, flexWrap: "wrap" },
  tabBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
  },
  tabOn: { border: "1px solid #1d4ed8", background: "#e6f0ff" },

  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: "12px 14px",
    minWidth: 260,
    maxWidth: 520,
    flex: 1,
  },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 15 },
  clearBtn: {
    border: "none",
    background: "#eee",
    borderRadius: 10,
    cursor: "pointer",
    padding: "6px 10px",
    fontWeight: 1000,
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  info: { padding: 10 },
  meta: { marginBottom: 10, color: "#444" },
  error: {
    padding: 12,
    borderRadius: 12,
    background: "#fdecec",
    border: "1px solid #f6c0c0",
    color: "#8f1d1d",
    fontWeight: 900,
  },

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
    fontSize: 14,
  },
  empty: { padding: 16, textAlign: "center", color: "#666" },

  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.3,
  },
};
