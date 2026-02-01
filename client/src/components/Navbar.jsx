import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const menuRef = useRef(null);
  const profileRef = useRef(null);

  // 🔑 AUTH STATE
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = (user?.role || "").toUpperCase(); // USER | ADMIN

  // 🔍 SEARCH
  const [q, setQ] = useState("");

  // 🛒 CART COUNT
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const closeOnOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target)
      ) {
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
      const d = res.data || {};
      const items = (d.CartItems || d.cartItems || d.items || []) ?? [];
      const count = d.itemsCount ?? items.length;
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    loadCartCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  const avatarLetter = (user?.name || user?.email || "U")[0]?.toUpperCase();

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
        }

        .profileMenu{
          position:absolute;
          right:0;top:52px;
          width:220px;
          background:rgba(10,14,28,.95);
          border:1px solid rgba(255,255,255,.14);
          border-radius:14px;
          padding:10px;
        }
        .profileMenu button{
          width:100%;
          margin:6px 0;
        }

        .nav-link{
          padding:10px 14px;border-radius:12px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.06);
          color:#fff;font-weight:900;
          cursor:pointer;
        }
        .nav-primary{
          border:none;
          background:linear-gradient(135deg,#6D5BFF,#22D3EE);
          color:#08101f;
        }

        @media(max-width:640px){
          .searchWrap{ display:none; }
        }
      `}</style>

      <header className="nav">
        <div className="nav-inner" ref={menuRef}>
          {/* LEFT */}
          <Link to="/dashboard" className="brand">
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
                  <button className="searchBtn">Search</button>
                </div>
              </form>
            </div>
          )}

          {/* RIGHT */}
          <div className="nav-actions">
            {!token ? (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link nav-primary">Register</Link>
              </>
            ) : (
              <>
                {/* CART */}
                <button
                  className="iconBtn"
                  onClick={() => navigate("/cart")}
                  title="Cart"
                >
                  🛒
                  {cartCount > 0 && <span className="countBadge">{cartCount}</span>}
                </button>

                {/* PROFILE */}
                <div style={{ position: "relative" }} ref={profileRef}>
                  <button
                    className="iconBtn"
                    onClick={() => setProfileOpen((s) => !s)}
                    title="Profile"
                  >
                    {avatarLetter}
                  </button>

                  {profileOpen && (
                    <div className="profileMenu">
                      <button
                        className="nav-link"
                        onClick={() => navigate("/wallet")}
                      >
                        Wallet
                      </button>

                      <button
                        className="nav-link"
                        onClick={() => navigate("/Order")}
                      >
                        My Orders
                      </button>

                      <button
                        className="nav-link"
                        onClick={() => navigate("/Referal")}
                      >
                        Referal
                      </button>
                       <button
                        className="nav-link"
                        onClick={() => navigate("/Tree")}
                      >
                        Tree View
                      </button>

                      <button
                        className="nav-link nav-primary"
                        onClick={logout}
                      >
                        Logout
                      </button>
                    </div>
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
