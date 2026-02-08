// src/pages/AdminBinaryTreeSearch.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

/**
 * GET /api/binary/admin/tree?q=SUN114033
 * Response:
 * {
 *   searched,
 *   targetUser: { id,userID,name,phone,email,userType },
 *   tree: { ...node, left:{...}, right:{...} }
 * }
 *
 * ✅ Admin page (same style as your other admin pages)
 * ✅ Enter UserID and view tree
 * ✅ Shows node cards + left/right child cards (up to 3 levels visually)
 * ✅ Click a node -> loads that user's tree (drill down)
 */

const safe = (v, fb = "-") => (v === null || v === undefined || v === "" ? fb : v);

const fmtDate = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "-";
  }
};

export default function AdminBinaryTreeSearch() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [searched, setSearched] = useState("");
  const [targetUser, setTargetUser] = useState(null);
  const [tree, setTree] = useState(null);

  // ✅ auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = String(user?.role || "").toUpperCase();

    if (!token || !role.includes("ADMIN")) {
      navigate("/admin", { replace: true });
      return;
    }
  }, [navigate]);

  const fetchTree = async (userIdLike) => {
    const query = String(userIdLike || "").trim();
    if (!query) return;

    try {
      setErr("");
      setLoading(true);

      const res = await axiosInstance.get("/api/binary/admin/tree", {
        params: { q: query },
      });

      const d = res?.data || {};
      setSearched(d?.searched || query);
      setTargetUser(d?.targetUser || null);
      setTree(d?.tree || null);

      // keep input in sync
      setQ(query);
    } catch (e) {
      console.log("admin tree search error", e);
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        navigate("/admin", { replace: true });
      } else {
        setErr(e?.response?.data?.msg || "Failed to load tree");
      }
      setTargetUser(null);
      setTree(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    fetchTree(q);
  };

  const hasTree = useMemo(() => !!tree?.userID, [tree]);

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Admin Tree Search</div>
          <div style={styles.subtitle}>Search by UserID and view binary tree</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => navigate("/admin/dashboard")}>
            ← Dashboard
          </button>
          <button
            style={styles.btn2}
            onClick={() => fetchTree(q)}
            disabled={loading || !q.trim()}
            title="Refresh current search"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search Form */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Search</div>

        <form onSubmit={onSubmit} style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>UserID *</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={styles.input}
              placeholder="Example: SUN114033"
              disabled={loading}
            />
            <div style={styles.hint}>Enter exact UserID (SUNxxxxxx)</div>
          </div>

          <div style={styles.fieldBtn}>
            <label style={styles.label}>&nbsp;</label>
            <button type="submit" style={styles.btnPrimary} disabled={loading || !q.trim()}>
              {loading ? "Searching..." : "View Tree"}
            </button>
          </div>
        </form>

        {err ? <div style={styles.error}>{err}</div> : null}

        {targetUser ? (
          <div style={styles.targetBox}>
            <div style={{ fontWeight: 1000, marginBottom: 6 }}>Target User</div>
            <div style={styles.targetGrid}>
              <div>
                <div style={styles.k}>UserID</div>
                <div style={styles.v}>{safe(targetUser.userID)}</div>
              </div>
              <div>
                <div style={styles.k}>Name</div>
                <div style={styles.v}>{safe(targetUser.name)}</div>
              </div>
              <div>
                <div style={styles.k}>Phone</div>
                <div style={styles.v}>{safe(targetUser.phone)}</div>
              </div>
              <div>
                <div style={styles.k}>Email</div>
                <div style={styles.v}>{safe(targetUser.email)}</div>
              </div>
              <div>
                <div style={styles.k}>User Type</div>
                <div style={styles.v}>{safe(targetUser.userType)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Tree View */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Tree</div>

        {!hasTree ? (
          <div style={styles.info}>Search a UserID to view the tree.</div>
        ) : (
          <>
            <div style={styles.treeWrap}>
              <TreeNode
                node={tree}
                level={0}
                onClickNode={(node) => node?.userID && fetchTree(node.userID)}
              />
            </div>

            <div style={styles.note}>
              Tip: Click any node card to open that member’s tree.
            </div>
          </>
        )}
      </div>

      {/* responsive */}
      <style>{`
        @media (max-width: 900px){
          .__tree_row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ================= TREE COMPONENTS ================= */

function TreeNode({ node, level, onClickNode }) {
  if (!node) return null;

  // show max 3 levels (root + 2)
  const showChildren = level < 2;

  return (
    <div style={{ width: "100%" }}>
      <div style={styles.center}>
        <NodeCard node={node} kind={level === 0 ? "ROOT" : "NODE"} onClick={() => onClickNode(node)} />
      </div>

      {showChildren && (
        <>
          {/* connectors */}
          <div style={styles.connectorRow}>
            <div style={styles.lineDown} />
          </div>

          <div className="__tree_row" style={styles.childrenRow}>
            <div style={styles.childCol}>
              <div style={styles.childLabel}>LEFT</div>
              {node?.left ? (
                <NodeCard node={node.left} kind="LEFT" onClick={() => onClickNode(node.left)} />
              ) : (
                <EmptySlot label={node?.leftUserID ? `Left: ${node.leftUserID}` : "Empty"} />
              )}

              {node?.left && (
                <div style={{ marginTop: 12 }}>
                  <TreeNode node={node.left} level={level + 1} onClickNode={onClickNode} />
                </div>
              )}
            </div>

            <div style={styles.childCol}>
              <div style={styles.childLabel}>RIGHT</div>
              {node?.right ? (
                <NodeCard node={node.right} kind="RIGHT" onClick={() => onClickNode(node.right)} />
              ) : (
                <EmptySlot label={node?.rightUserID ? `Right: ${node.rightUserID}` : "Empty"} />
              )}

              {node?.right && (
                <div style={{ marginTop: 12 }}>
                  <TreeNode node={node.right} level={level + 1} onClickNode={onClickNode} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NodeCard({ node, kind, onClick }) {
  const type = String(kind || "NODE").toUpperCase();

  const badge =
    type === "ROOT"
      ? styles.badgeRoot
      : type === "LEFT"
      ? styles.badgeLeft
      : type === "RIGHT"
      ? styles.badgeRight
      : styles.badge;

  return (
    <button type="button" onClick={onClick} style={styles.nodeBtn} title="Click to open this member tree">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 1100, fontSize: 14 }}>{safe(node?.name)}</div>
        <span style={{ ...styles.badgePill, ...badge }}>{type}</span>
      </div>

      <div style={styles.nodeMeta}>
        <div>
          <span style={styles.kSmall}>UserID:</span> <b>{safe(node?.userID || node?.userPkId)}</b>
        </div>
        <div>
          <span style={styles.kSmall}>Type:</span> <b>{safe(node?.userType)}</b>
        </div>
        <div>
          <span style={styles.kSmall}>Referral:</span> <b>{safe(node?.referralCode, "—")}</b>
        </div>
        <div>
          <span style={styles.kSmall}>Joining:</span> <b>{fmtDate(node?.joiningDate)}</b>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
          L: <b>{safe(node?.leftUserID, "—")}</b> • R: <b>{safe(node?.rightUserID, "—")}</b>
        </div>
      </div>
    </button>
  );
}

function EmptySlot({ label }) {
  return (
    <div style={styles.emptySlot}>
      <div style={{ fontWeight: 900 }}>Empty</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
    </div>
  );
}

/* ================= STYLES (same admin style) ================= */

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
    padding: "11px 14px",
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
  info: { padding: 10, color: "#666" },

  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
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

  targetBox: {
    marginTop: 12,
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fafafa",
  },
  targetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
  },
  k: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
  v: { fontSize: 13, fontWeight: 1000 },

  treeWrap: { padding: 8 },
  center: { display: "flex", justifyContent: "center" },

  nodeBtn: {
    width: "100%",
    maxWidth: 520,
    textAlign: "left",
    border: "1px solid #eee",
    background: "#fff",
    borderRadius: 14,
    padding: 12,
    cursor: "pointer",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
  },
  nodeMeta: { fontSize: 13, color: "#222", marginTop: 8, lineHeight: 1.6 },
  kSmall: { opacity: 0.7, fontWeight: 900 },

  badgePill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.3,
  },
  badge: { background: "#f3f3f3", border: "1px solid #ddd", color: "#333" },
  badgeRoot: { background: "#e6f0ff", border: "1px solid #b9d5ff", color: "#1d4ed8" },
  badgeLeft: { background: "#e9f7ef", border: "1px solid #bfe6cf", color: "#17643a" },
  badgeRight: { background: "#fff7e6", border: "1px solid #ffe2a8", color: "#8a5a00" },

  connectorRow: { display: "flex", justifyContent: "center", margin: "10px 0" },
  lineDown: { width: 2, height: 18, background: "#d9d9d9", borderRadius: 999 },

  childrenRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    alignItems: "start",
  },
  childCol: { width: "100%" },
  childLabel: { fontSize: 12, fontWeight: 1000, opacity: 0.8, marginBottom: 8 },

  emptySlot: {
    border: "1px dashed #d6d6d6",
    background: "#fafafa",
    borderRadius: 14,
    padding: 12,
    textAlign: "center",
  },

  note: { marginTop: 10, fontSize: 12, opacity: 0.75 },
};
