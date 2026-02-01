import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BannerCarousel from "../components/BannerCarousel";
import Products from "../components/Products";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
  }, [navigate]);

  return (
    <>
      <style>{`
        *{ box-sizing:border-box; margin:0; padding:0; }
        html, body, #root{
          height:100%;
          width:100%;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        }
        :root{
          --bg:#0b1020;
          --text: rgba(255,255,255,.92);
        }
        body{
          background:
            radial-gradient(900px 600px at 10% 10%, rgba(109,91,255,.16), transparent 55%),
            radial-gradient(900px 600px at 90% 25%, rgba(34,211,238,.14), transparent 55%),
            linear-gradient(180deg, #070a16, var(--bg));
          color: var(--text);
        }
       
      `}</style>

    

      {/* ✅ FULL WIDTH BANNER */}
      <BannerCarousel placement="HOME_TOP" type="SLIDER" />
      <Products/>

    </>
  );
}
