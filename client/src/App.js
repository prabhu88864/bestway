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

import ProductDetails from "./Pages/ProductDetails";
import Cart from "./Pages/Cart";
import Wallet from "./Pages/Wallet";
import Order from "./Pages/Order";
import Referal from "./Pages/Referal"
import Tree from "./Pages/Tree";
import Myprofile from "./Pages/Myprofile";
import AwardsAchivement from "./Pages/AwardsAchivement";
import ChangePassword from "./Pages/ChangePassword";
import DailyWise from "./Pages/DailyWise";



import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";

import Navbar from "./components/Navbar";
import AdminUsers from "./admin/AdminUsers";
import AdminOrders from "./admin/AdminOrders";
import AdminProducts from "./admin/AdminProducts";
import AdminBanners from "./admin/AdminBanners";
import AdminPayments from "./admin/AdminPayments";
import AdminWalletTransactions from "./admin/AdminWalletTransactions";
import AdminPairs from "./admin/AdminPairs";
import AdminReferal from "./admin/AdminReferal";
import AdminDelivery from "./admin/AdminDelivery";
import AdminWithdraw from "./admin/AdminWithdraw";
import AdminAwards from "./admin/AdminAwards";
import AdminAchivement from "./admin/AdminAchivement";
import AdminTree from "./admin/AdminTree";


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


<Route path="/ProductDetails/:id" element={<ProductDetails />} />

<Route path="/cart" element={<Cart />} />
<Route path="/wallet" element={<Wallet />} />
<Route path="/Order" element={<Order />} />
<Route path="/Referal" element={<Referal />} />
<Route path="/Tree" element={<Tree />} />
<Route path="/Myprofile" element={<Myprofile />} />
<Route path="/AwardsAchivement" element={<AwardsAchivement />} />
<Route path="/ChangePassword" element={<ChangePassword />} />
<Route path="/DailyWise" element={<DailyWise />} />



        {/* ============ ADMIN (No Navbar, No Container) ============ */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard/>} />
           <Route path="/admin/users" element={<AdminUsers />} />
           <Route path="/admin/orders" element={<AdminOrders/>} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/banners" element={<AdminBanners />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
      <Route path="/admin/wallet-transactions" element={<AdminWalletTransactions />} />
      <Route path="/admin/pairs" element={<AdminPairs />} />
      <Route path="/admin/referal" element={<AdminReferal />} />
      <Route path="/admin/delivery" element={<AdminDelivery />} />
      <Route path="/admin/withdraw" element={<AdminWithdraw />} />
      <Route path="/admin/awards" element={<AdminAwards />} />
      <Route path="/admin/achivement" element={<AdminAchivement />} />
      <Route path="/admin/tree" element={<AdminTree />} />
       

        {/* ============ USER PROTECTED ============ */}

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
