import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export default function BannerCarousel({ placement = "HOME_TOP", type = "SLIDER" }) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  const imgUrl = (path) => {
    if (!path) return "";
    const base = (axiosInstance.defaults.baseURL || "").replace(/\/$/, "");
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${base}${path}`;
    return `${base}/${path}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get("/api/banners/public", {
          params: { placement, type },
        });
        if (mounted) {
          setItems(Array.isArray(res.data) ? res.data : []);
          setIndex(0);
        }
      } catch (e) {
        console.log("banner load error", e);
        if (mounted) setItems([]);
      }
    })();
    return () => (mounted = false);
  }, [placement, type]);

  const total = items.length;

  useEffect(() => {
    if (total <= 1) return;
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => setIndex((i) => (i + 1) % total), 4000);
    return () => timer.current && clearInterval(timer.current);
  }, [total]);

  const current = useMemo(() => items[index], [items, index]);
  if (total === 0) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.slider}>
        <div style={{ ...styles.track, transform: `translateX(-${index * 100}%)` }}>
          {items.map((b) => (
            <a
              key={b.id}
              href={b.linkUrl || "#"}
              style={styles.slide}
              onClick={(e) => !b.linkUrl && e.preventDefault()}
            >
              <img src={imgUrl(b.image)} alt={b.title || "banner"} style={styles.img} />

              {(b.title || b.subtitle) && (
                <div style={styles.caption}>
                  {b.title && <div style={styles.title}>{b.title}</div>}
                  {b.subtitle && <div style={styles.sub}>{b.subtitle}</div>}
                </div>
              )}
            </a>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              style={{ ...styles.navBtn, left: 24 }}
              onClick={() => setIndex((i) => (i - 1 + total) % total)}
              aria-label="Prev"
            >
              ‹
            </button>
            <button
              type="button"
              style={{ ...styles.navBtn, right: 24 }}
              onClick={() => setIndex((i) => (i + 1) % total)}
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* remove this if you don't want info */}
      {/* {current?.linkUrl && <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{current.linkUrl}</div>} */}
    </div>
  );
}

const styles = {
  /* ✅ FULL BLEED + ✅ REMOVE NAVBAR GAP */
  wrap: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginTop: "-1px",              // ✅ IMPORTANT: removes tiny gap line
    overflow: "hidden",
  },

  slider: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    borderTop: "0",                 // ✅ ensure no border gap
  },

  track: {
    display: "flex",
    width: "100%",
    transition: "transform 500ms ease",
  },

  slide: {
    minWidth: "100%",
    position: "relative",
    display: "block",
    textDecoration: "none",
  },

  /* ✅ BIG HEIGHT */
  img: {
    width: "100%",
    height: "560px",
    objectFit: "cover",
    display: "block",
  },

  caption: {
    position: "absolute",
    left: 28,
    bottom: 28,
    padding: "14px 18px",
    borderRadius: 16,
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    maxWidth: "60%",
    backdropFilter: "blur(6px)",
  },

  title: { fontSize: 20, fontWeight: 900, letterSpacing: 0.3 },
  sub: { marginTop: 4, fontSize: 14, opacity: 0.9 },

  navBtn: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    fontSize: 28,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },
};
