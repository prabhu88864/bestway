import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Container } from "@mui/material";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";

import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";

import Navbar from "./components/Navbar";
import AdminUsers from "./admin/AdminUsers";
import AdminOrders from "./admin/AdminOrders";
import AdminProducts from "./admin/AdminProducts";
import AdminBanners from "./admin/AdminBanners";

/* ✅ Router inside helper component so we can use useLocation safely */
function AppRoutes() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");

  return (
    <>
      {/* GLOBAL TOAST */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* ✅ Navbar only for NON-admin pages */}
      {!isAdminPath && <Navbar />}

      {/* ✅ ONE Routes tree only */}
      <Routes>
        {/* ============ PUBLIC (User) ============ */}
        <Route
          path="/login"
          element={
            <Container sx={{ mt: 4 }}>
              <Login />
            </Container>
          }
        />
        <Route
          path="/register"
          element={
            <Container sx={{ mt: 4 }}>
              <Register />
            </Container>
          }
        />

        {/* ============ USER PROTECTED ============ */}
        <Route
          path="/dashboard"
          element={
            <Container sx={{ mt: 4 }}>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Container>
          }
        />

        {/* ============ ADMIN (No Navbar, No Container) ============ */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard/>} />
           <Route path="/admin/users" element={<AdminUsers />} />
           <Route path="/admin/orders" element={<AdminOrders/>} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/banners" element={<AdminBanners />} />

        {/* ============ DEFAULT ============ */}
        <Route
          path="*"
          element={
            <Container sx={{ mt: 4 }}>
              <Login />
            </Container>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
