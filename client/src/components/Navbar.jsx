import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Dropdown states
  const [menuOpen, setMenuOpen] = useState(false);     // mobile menu
  const [profileOpen, setProfileOpen] = useState(false); // profile dropdown

  const menuRef = useRef(null);
  const profileRef = useRef(null);

  // 🔑 AUTH
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = String(user?.role || "").toUpperCase(); // USER | ADMIN

  // 🔍 SEARCH
  const [q, setQ] = useState("");

  // 🛒 CART COUNT
  const [cartCount, setCartCount] = useState(0);

  // close on route change
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // close dropdowns on outside click
  useEffect(() => {
    const closeOnOutside = (e) => {
      const t = e.target;

      // close mobile menu
      if (menuRef.current && !menuRef.current.contains(t)) {
        setMenuOpen(false);
      }

      // close profile
      if (profileRef.current && !profileRef.current.contains(t)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCartCount(0);
    navigate("/login", { replace: true });
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  // Load cart count
  const loadCartCount = async () => {
    if (!token) {
      setCartCount(0);
      return;
    }
    try {
      const res = await axiosInstance.get("/api/cart");
      const d = res?.data || {};
      const items = (d.CartItems || d.cartItems || d.items || []) ?? [];
      const count = d.itemsCount ?? items.length;
      setCartCount(Number(count || 0));
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    loadCartCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  const avatarLetter = (user?.name || user?.email || "U")[0]?.toUpperCase();

  // ✅ safer route helper (avoid crashing if route typo)
  const go = (path) => {
    setMenuOpen(false);
    setProfileOpen(false);
    navigate(path);
  };

  return (
    <>
      <style>{`
        .nav{
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
          background: rgba(10,14,28,.75);
          border-bottom: 1px solid rgba(255,255,255,.12);
        }
        .nav-inner{
          padding: 12px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
        }
        .brand{
          display:flex;
          align-items:center;
          gap:10px;
          text-decoration:none;
          color:#fff;
          font-weight:900;
          white-space:nowrap;
        }
        .badge{
          width:36px;height:36px;border-radius:12px;
          display:grid;place-items:center;
          background:linear-gradient(135deg,#6D5BFF,#22D3EE);
          color:#08101f;font-weight:900;
        }

        .searchWrap{ flex:1; max-width:520px; }
        .searchBox{
          display:flex;gap:8px;
          padding:9px 12px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.05);
        }
        .searchInput{
          width:100%;background:transparent;border:none;
          outline:none;color:#fff;font-weight:700;
        }
        .searchBtn{
          padding:9px 14px;border-radius:12px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.05);
          color:#fff;font-weight:900;cursor:pointer;
        }

        .nav-actions{ display:flex;gap:10px;align-items:center; }

        .iconBtn{
          width:42px;height:42px;border-radius:50%;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.08);
          color:#fff;font-weight:900;
          display:grid;place-items:center;
          cursor:pointer;position:relative;
        }

        .countBadge{
          position:absolute;top:-6px;right:-6px;
          min-width:18px;height:18px;
          border-radius:999px;
          background:linear-gradient(135deg,#6D5BFF,#22D3EE);
          color:#08101f;font-size:12px;font-weight:950;
          display:grid;place-items:center;
          padding:0 5px;
        }

        .nav-link{
          padding:10px 14px;border-radius:12px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.06);
          color:#fff;font-weight:900;
          cursor:pointer;
          text-decoration:none;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }
        .nav-primary{
          border:none;
          background:linear-gradient(135deg,#6D5BFF,#22D3EE);
          color:#08101f;
        }

        .dropdown{
          position:absolute;
          right:0;top:52px;
          width:240px;
          background:rgba(10,14,28,.95);
          border:1px solid rgba(255,255,255,.14);
          border-radius:14px;
          padding:10px;
          box-shadow: 0 18px 50px rgba(0,0,0,.35);
        }
        .dropdown button{
          width:100%;
          margin:6px 0;
          text-align:left;
        }

        /* Mobile menu button */
        .mobileOnly{ display:none; }
        @media(max-width:900px){
          .searchWrap{ max-width:360px; }
        }
        @media(max-width:640px){
          .searchWrap{ display:none; }
          .desktopOnly{ display:none; }
          .mobileOnly{ display:inline-grid; }
        }
      `}</style>

      <header className="nav">
        <div className="nav-inner">
          {/* LEFT */}
          <Link to={token ? "/dashboard" : "/"} className="brand">
            <div className="badge">B</div>
            BestWay
          </Link>

          {/* SEARCH */}
          {token && (
            <div className="searchWrap">
              <form onSubmit={onSearchSubmit}>
                <div className="searchBox">
                  <input
                    className="searchInput"
                    placeholder="Search medicines..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <button className="searchBtn" type="submit">
                    Search
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RIGHT */}
          <div className="nav-actions">
            {!token ? (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/register" className="nav-link nav-primary">
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* Mobile menu (hamburger) */}
                <div style={{ position: "relative" }} ref={menuRef}>
                  <button
                    className="iconBtn mobileOnly"
                    onClick={() => setMenuOpen((s) => !s)}
                    title="Menu"
                  >
                    ☰
                  </button>

                  {menuOpen && (
                    <div className="dropdown">
                      {/* If admin */}
                      {role.includes("ADMIN") && (
                        <button className="nav-link" onClick={() => go("/admin/dashboard")}>
                          🛠 Admin Dashboard
                        </button>
                      )}

                      <button className="nav-link" onClick={() => go("/wallet")}>
                        💰 Wallet
                      </button>
                      <button className="nav-link" onClick={() => go("/Order")}>
                        📦 My Orders
                      </button>
                      <button className="nav-link" onClick={() => go("/Referal")}>
                        🔗 Referral
                      </button>
                      <button className="nav-link" onClick={() => go("/Tree")}>
                        🌳 Tree View
                      </button>
                      <button className="nav-link" onClick={() => go("/Myprofile")}>
                        👤 My Profile
                      </button>
                      <button className="nav-link" onClick={() => go("/ChangePassword")}>
                        🔒 Change Password
                      </button>
                      <button className="nav-link" onClick={() => go("/Pages/AwardsAchivement")}>
                        🏆 Awards & Achievements
                      </button>

                      <button className="nav-link nav-primary" onClick={logout}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                {/* CART */}
                <button className="iconBtn" onClick={() => go("/cart")} title="Cart">
                  🛒
                  {cartCount > 0 && <span className="countBadge">{cartCount}</span>}
                </button>

                {/* PROFILE (desktop + mobile) */}
                <div style={{ position: "relative" }} ref={profileRef}>
                  <button
                    className="iconBtn"
                    onClick={() => setProfileOpen((s) => !s)}
                    title="Profile"
                  >
                    {avatarLetter}
                  </button>

                  {profileOpen && (
                    <div className="dropdown">
                      {/* Admin quick link */}
                      {role.includes("ADMIN") && (
                        <button className="nav-link" onClick={() => go("/admin/dashboard")}>
                          🛠 Admin Dashboard
                        </button>
                      )}

                      <button className="nav-link" onClick={() => go("/wallet")}>
                        💰 Wallet
                      </button>

                      <button className="nav-link" onClick={() => go("/Order")}>
                        📦 My Orders
                      </button>

                      <button className="nav-link" onClick={() => go("/Referal")}>
                        🔗 Referral
                      </button>

                      <button className="nav-link" onClick={() => go("/Tree")}>
                        🌳 Tree View
                      </button>

                      <button className="nav-link" onClick={() => go("/Myprofile")}>
                        👤 My Profile
                      </button>

                      <button className="nav-link" onClick={() => go("/ChangePassword")}>
                        🔒 Change Password
                      </button>

                      <button className="nav-link" onClick={() => go("/AwardsAchivement")}>
                        🏆 Awards & Achievements
                      </button>

                      <button className="nav-link" onClick={() => go("/DailyWise")}>
                        📞 Daily Wise
                      </button>

                      <button className="nav-link nav-primary" onClick={logout}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop links (optional) */}
                {/* You can keep these if you want always visible on desktop */}
                <div className="desktopOnly" style={{ display: "flex", gap: 10 }}>
                  {/* Example: show Dashboard/Admin button */}
                  {role.includes("ADMIN") && (
                    <button className="nav-link" onClick={() => go("/admin/dashboard")}>
                      Admin
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
