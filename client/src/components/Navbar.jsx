import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 🔑 AUTH STATE
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = (user?.role || "").toUpperCase(); // USER | ADMIN

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    const closeOnOutside = (e) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
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
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* ===== STYLES (same as yours) ===== */}
      <style>{`
        :root{
          --bg:#0b1020;
          --border: rgba(255,255,255,.12);
          --text: rgba(255,255,255,.92);
        }
        .nav{
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          backdrop-filter: blur(12px);
          background: rgba(10, 14, 28, .72);
          border-bottom: 1px solid rgba(255,255,255,.10);
        }
        .nav-inner{
          width: 100%;
          padding: 12px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          position: relative;
        }
        .brand{
          display:flex;
          align-items:center;
          gap: 10px;
          text-decoration:none;
          color: var(--text);
        }
        .badge{
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display:grid;
          place-items:center;
          font-weight: 900;
          color:#08101f;
          background: linear-gradient(135deg, #6D5BFF, #22D3EE);
        }
        .nav-actions{
          display:flex;
          gap: 10px;
          align-items:center;
        }
        .nav-link{
          padding: 9px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.05);
          text-decoration:none;
          color: var(--text);
          font-weight: 800;
          cursor:pointer;
        }
        .nav-primary{
          border:none;
          background: linear-gradient(135deg, #6D5BFF, #22D3EE);
          color:#08101f;
        }
        .hamburger{
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.05);
          cursor:pointer;
          display:none;
          place-items:center;
        }
        .hamburger span{
          width: 18px; height: 2px;
          background: rgba(255,255,255,.9);
          display:block;
        }
        .mobileMenu{
          position:absolute;
          right: 14px;
          top: 58px;
          width: 220px;
          border-radius: 14px;
          background: rgba(10, 14, 28, .92);
          padding: 10px;
        }
        .mobileMenu button,
        .mobileMenu a{
          width:100%;
          margin:6px 0;
          text-align:center;
        }
        @media (max-width: 640px){
          .nav-actions{ display:none; }
          .hamburger{ display:grid; }
        }
      `}</style>

      <header className="nav">
        <div className="nav-inner" ref={menuRef}>
          <Link to="/" className="brand">
            <div className="badge">B</div>
            <strong>Bstway</strong>
          </Link>

          {/* ================= DESKTOP MENU ================= */}
          <div className="nav-actions">
            {!token ? (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link nav-primary">Register</Link>
              </>
            ) : (
              <>
                {role === "ADMIN" ? (
                  <Link to="/admin/dashboard" className="nav-link">Admin</Link>
                ) : (
                  <Link to="/dashboard" className="nav-link">Dashboard</Link>
                )}
                <button onClick={logout} className="nav-link nav-primary">Logout</button>
              </>
            )}
          </div>

          {/* ================= MOBILE ================= */}
          <button className="hamburger" onClick={() => setMenuOpen(s => !s)}>
            <span />
          </button>

          {menuOpen && (
            <div className="mobileMenu">
              {!token ? (
                <>
                  <Link to="/login" className="nav-link">Login</Link>
                  <Link to="/register" className="nav-link nav-primary">Register</Link>
                </>
              ) : (
                <>
                  {role === "ADMIN" ? (
                    <Link to="/admin/dashboard" className="nav-link">Admin</Link>
                  ) : (
                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                  )}
                  <button onClick={logout} className="nav-link nav-primary">
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
