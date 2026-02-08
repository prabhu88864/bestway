import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import axiosInstance from "../utils/axiosInstance";

export default function BinaryTreeNeoFixed() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const [depth, setDepth] = useState(4);
  const [selectedId, setSelectedId] = useState(null);

  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);

  const token = useMemo(() => {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  }, []);

  const api = useMemo(() => {
    return axiosInstance?.get
      ? axiosInstance
      : axios.create({ baseURL: "http://localhost:3000" });
  }, []);

  const getNodeUID = (n) => {
    if (!n) return null;
    return n.userID ?? n.userId ?? n.id ?? n.userPkId ?? null;
  };

  const fetchTree = async () => {
    setErr("");
    setLoading(true);

    if (!token) {
      setErr("Token not found. Please login first.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/api/binary/tree", {
        // params: { depth }, // enable if backend supports depth
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data);

      const root = res?.data?.tree;
      const rid = getNodeUID(root);
      if (rid != null) setSelectedId(rid);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load tree"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const root = data?.tree || null;

  const zoomIn = () => setZoom((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10));
  const zoomOut = () => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10));
  const zoomReset = () => setZoom(1);

  const centerCanvas = () => {
    const el = canvasRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = 0;
  };

  useEffect(() => {
    if (!loading) setTimeout(centerCanvas, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, zoom]);

  return (
    <div className="neo-page">
      <style>{CSS}</style>

      <div className="neo-topbar">
        <div className="neo-head">
          <div className="neo-title">Binary Tree</div>
          <div className="neo-sub">
            Root: <b>{data?.rootUserId ?? data?.rootUserID ?? data?.root ?? "—"}</b> · Depth:{" "}
            <b>{data?.depth ?? depth}</b>
          </div>
        </div>

        <div className="neo-actions">
          <div className="neo-pill">
            <span>Depth</span>
            <input
              type="number"
              min={1}
              max={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value || 1))}
            />
          </div>

          <button className="neo-btn" onClick={fetchTree} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>

          <div className="neo-zoom">
            <button className="neo-ic" onClick={zoomOut}>
              -
            </button>
            <div className="neo-zoomv">{Math.round(zoom * 100)}%</div>
            <button className="neo-ic" onClick={zoomIn}>
              +
            </button>
            <button className="neo-ic ghost" onClick={zoomReset}>
              R
            </button>
            <button className="neo-ic ghost" onClick={centerCanvas}>
              C
            </button>
          </div>
        </div>
      </div>

      {err ? (
        <div className="neo-error">
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div className="neo-canvas" ref={canvasRef}>
        {!loading && !root ? <div className="neo-empty">No tree data found.</div> : null}

        {root ? (
          <div className="neo-stage" style={{ transform: "scale(" + zoom + ")" }}>
            <ul className="neo-tree">
              <NeoNode node={root} selectedId={selectedId} onSelect={setSelectedId} />
            </ul>
          </div>
        ) : null}
      </div>

      <div className="neo-footer">© BestWay</div>
    </div>
  );
}

/** -------- helpers -------- **/
function getUserType(node) {
  const raw =
    node?.userType ??
    node?.usertype ??
    node?.type ??
    node?.roleType ??
    node?.memberType ??
    "";
  return String(raw || "").trim().toUpperCase();
}

function formatJoiningDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  // example: 05 Feb 2026
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** -------- NODE -------- **/
function NeoNode({ node, selectedId, onSelect }) {
  const left = node?.left || null;
  const right = node?.right || null;
  const hasChildren = !!left || !!right;

  const uid = node?.userID ?? node?.userId ?? node?.id ?? node?.userPkId ?? "—";
  const name = node?.name ?? "—";
  const ref = node?.referralcode ?? node?.referralCode ?? "—";

  const userType = getUserType(node);
  const joiningDate =
    node?.joiningDate ?? node?.createdAt ?? node?.joinedAt ?? node?.joining_date ?? null;

  const leftUID =
    node?.leftUserID ?? node?.leftUserId ?? node?.leftuserID ?? node?.leftId ?? null;
  const rightUID =
    node?.rightUserID ?? node?.rightUserId ?? node?.rightuserID ?? node?.rightId ?? null;

  const isSelected = String(selectedId) === String(uid);
  const isEntrepreneur = userType === "ENTREPRENEUR";
  const typeClass = isEntrepreneur ? "type-ent" : "type-tr";

  return (
    <li className="neo-li">
      <button
        type="button"
        className={[
          "neo-card",
          isSelected ? "sel" : "",
          isEntrepreneur ? "gold" : "",
        ].join(" ")}
        onClick={() => onSelect(uid)}
      >
        <div className="neo-badge">
          <span className="dot" />
          <span className="txt">BESTWAY</span>
        </div>

        <div className="neo-center">
          <div className="neo-namec">{name}</div>
          <div className="neo-idc">USERID: {uid}</div>
        </div>

        {/* ✅ userType + joiningDate shown */}
        <div className="neo-meta">
          <span className={"chip " + typeClass}>{userType || "—"}</span>
          <span className="chip subtle">JOIN: {formatJoiningDate(joiningDate)}</span>
        </div>

        <div className="neo-meta" style={{ marginTop: -2 }}>
          <span className="chip">REF: {ref}</span>
        </div>

        <div className="neo-mini">
          <span>L: {leftUID ?? "null"}</span>
          <span>R: {rightUID ?? "null"}</span>
        </div>
      </button>

      {hasChildren ? (
        <ul className="neo-ul">
          <NeoSlot child={left} side="LEFT" selectedId={selectedId} onSelect={onSelect} />
          <NeoSlot child={right} side="RIGHT" selectedId={selectedId} onSelect={onSelect} />
        </ul>
      ) : null}
    </li>
  );
}

function NeoSlot({ child, side, selectedId, onSelect }) {
  if (!child) {
    return (
      <li className="neo-li">
        <div className="neo-card empty" role="presentation">
          <div className="neo-badge faint">
            <span className="dot" />
            <span className="txt">{side}</span>
          </div>

          <div className="neo-center">
            <div className="neo-namec">Empty</div>
            <div className="neo-idc">No user</div>
          </div>

          <div className="neo-meta">
            <span className="chip type-tr">—</span>
            <span className="chip subtle">JOIN: —</span>
          </div>

          <div className="neo-mini" style={{ justifyContent: "center" }}>
            <span>—</span>
          </div>
        </div>
      </li>
    );
  }
  return <NeoNode node={child} selectedId={selectedId} onSelect={onSelect} />;
}

/** ✅ CSS */
const CSS =
  ".neo-page{min-height:100vh;color:#eaf0ff;background:linear-gradient(180deg,#050816,#040915 45%,#060b18);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;}" +
  ".neo-topbar{position:sticky;top:0;z-index:20;padding:14px 14px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;background:rgba(6,10,26,.75);border-bottom:1px solid rgba(220,235,255,.12);backdrop-filter:blur(10px);}" +
  ".neo-title{font-size:18px;font-weight:900;letter-spacing:.2px;color:#ffd24a;}" +
  ".neo-sub{margin-top:6px;font-size:12px;opacity:.85;color:rgba(233,238,252,.9);}" +
  ".neo-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}" +
  ".neo-pill{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(18,28,54,.55);border:1px solid rgba(220,235,255,.14);}" +
  ".neo-pill span{font-size:12px;opacity:.8;font-weight:800;}" +
  ".neo-pill input{width:70px;padding:8px 10px;border-radius:12px;border:1px solid rgba(220,235,255,.14);background:rgba(10,16,35,.65);color:#eaf0ff;outline:none;font-weight:900;}" +
  ".neo-btn{border:0;cursor:pointer;padding:12px 14px;border-radius:14px;font-weight:900;color:#071018;background:linear-gradient(90deg,#22d3ee,#6d5bff);box-shadow:0 16px 32px rgba(0,0,0,.25);}" +
  ".neo-btn:disabled{opacity:.7;cursor:not-allowed;}" +
  ".neo-zoom{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;background:rgba(18,28,54,.55);border:1px solid rgba(220,235,255,.14);}" +
  ".neo-ic{width:34px;height:34px;border-radius:12px;border:1px solid rgba(220,235,255,.14);background:rgba(10,16,35,.65);color:#eaf0ff;font-weight:900;cursor:pointer;}" +
  ".neo-ic.ghost{opacity:.9;}" +
  ".neo-zoomv{font-size:12px;font-weight:900;opacity:.9;width:54px;text-align:center;}" +
  ".neo-error{margin:12px 14px 0;border-radius:16px;border:1px solid rgba(255,75,75,.35);background:rgba(255,75,75,.10);padding:12px 14px;color:#ffd1d1;}" +

  /* canvas + stage centered */
  ".neo-canvas{padding:14px 10px 30px;overflow:auto;-webkit-overflow-scrolling:touch;height:calc(100vh - 170px);}" +
  ".neo-stage{transform-origin:top center;width:100%;display:flex;justify-content:center;}" +

  /* tree container centered */
  ".neo-tree{padding-left:0;margin:0 auto;display:flex;justify-content:center;width:max-content;position:relative;}" +
  ".neo-tree,.neo-tree ul{padding-top:18px;position:relative;}" +
  ".neo-ul{padding-left:0;margin:0 auto;display:flex;justify-content:center;gap:34px;width:100%;}" +
  ".neo-li{list-style:none;position:relative;padding:16px 8px 0 8px;display:flex;flex-direction:column;align-items:center;}" +

  /* lines */
  ".neo-li:before,.neo-li:after{content:'';position:absolute;top:0;right:50%;border-top:2px solid rgba(233,238,252,.22);width:50%;height:16px;}" +
  ".neo-li:after{right:auto;left:50%;border-left:2px solid rgba(233,238,252,.22);}" +
  ".neo-li:only-child:before,.neo-li:only-child:after{display:none;}" +
  ".neo-li:only-child{padding-top:0;}" +
  ".neo-li:first-child:before,.neo-li:last-child:after{border:0 none;}" +
  ".neo-li:last-child:before{border-right:2px solid rgba(233,238,252,.22);border-radius:0 10px 0 0;}" +
  ".neo-li:first-child:after{border-radius:10px 0 0 0;}" +
  ".neo-tree ul:before{content:'';position:absolute;top:0;left:50%;border-left:2px solid rgba(233,238,252,.22);width:0;height:16px;}" +

  /* card base */
  ".neo-card{width:168px;min-height:152px;border-radius:18px;padding:12px;border:1px solid rgba(220,235,255,.14);background:linear-gradient(180deg,rgba(18,28,54,.62),rgba(10,16,35,.62));box-shadow:0 18px 44px rgba(0,0,0,.28);color:#eaf0ff;display:flex;gap:10px;flex-direction:column;cursor:pointer;user-select:none;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease,filter .14s ease;}" +
  ".neo-card:hover{transform:translateY(-2px);border-color:rgba(34,211,238,.32);}" +
  ".neo-card.sel{border-color:rgba(109,91,255,.55);box-shadow:0 18px 55px rgba(109,91,255,.16),0 18px 44px rgba(0,0,0,.28);}" +
  ".neo-card.empty{opacity:.55;cursor:default;}" +

  /* ✅ ENTREPRENEUR => gold background card */
  ".neo-card.gold{border-color:rgba(255,210,74,.42);background:linear-gradient(180deg,rgba(255,210,74,.22),rgba(18,28,54,.62),rgba(10,16,35,.62));box-shadow:0 18px 55px rgba(255,210,74,.10),0 18px 44px rgba(0,0,0,.28);}" +
  ".neo-card.gold:hover{border-color:rgba(255,210,74,.62);filter:saturate(1.05);}" +

  ".neo-badge{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;border:1px solid rgba(220,235,255,.14);background:rgba(10,16,35,.55);width:fit-content;}" +
  ".neo-badge.faint{opacity:.85;}" +
  ".dot{width:10px;height:10px;border-radius:999px;background:linear-gradient(180deg,#22d3ee,#6d5bff);box-shadow:0 0 0 4px rgba(34,211,238,.10);}" +
  ".txt{font-size:11px;font-weight:900;letter-spacing:.6px;opacity:.9;}" +

  ".neo-center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;margin-top:2px;}" +
  ".neo-namec{font-size:16px;font-weight:900;letter-spacing:.2px;}" +
  ".neo-idc{font-size:12px;font-weight:900;opacity:.9;color:#ffd24a;}" +

  ".neo-meta{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}" +
  ".chip{font-size:11.5px;font-weight:900;padding:6px 10px;border-radius:12px;border:1px solid rgba(220,235,255,.12);background:rgba(18,28,54,.35);}" +
  ".chip.subtle{opacity:.9;background:rgba(18,28,54,.22);}" +

  /* ✅ userType colors */
  ".chip.type-tr{color:#eaf0ff;border-color:rgba(34,211,238,.30);background:rgba(34,211,238,.10);}" +
  ".chip.type-ent{color:#1a1200;border-color:rgba(255,210,74,.60);background:linear-gradient(180deg,rgba(255,210,74,.95),rgba(255,210,74,.70));}" +

  ".neo-mini{font-size:11px;opacity:.85;display:flex;gap:10px;justify-content:space-between;text-align:left;}" +

  ".neo-empty{margin:20px auto;width:fit-content;padding:12px 14px;border-radius:14px;border:1px dashed rgba(220,235,255,.22);color:rgba(233,238,252,.85);}" +
  ".neo-footer{padding:12px 10px 14px;text-align:center;color:rgba(233,238,252,.75);border-top:1px solid rgba(220,235,255,.12);background:rgba(6,10,26,.55);backdrop-filter:blur(10px);}" +

  /* mobile */
  "@media (max-width:520px){.neo-actions{width:100%;justify-content:space-between;}.neo-canvas{height:calc(100vh - 210px);}.neo-card{width:142px;min-height:146px;border-radius:16px;}.neo-ul{gap:14px;}.chip{font-size:11px;padding:6px 9px;}}";
