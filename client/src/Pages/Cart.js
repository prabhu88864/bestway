import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function Cart() {
  const navigate = useNavigate();
  const topRef = useRef(null);

  // ---------------- CART STATE ----------------
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ---------------- ADDRESS STATE ----------------
  const [addrLoading, setAddrLoading] = useState(true);
  const [addrErr, setAddrErr] = useState("");
  const [addrMsg, setAddrMsg] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [manageOpen, setManageOpen] = useState(true); // ✅ default open (one page view)
  const [formOpen, setFormOpen] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // ---------------- WALLET + PAYMENT STATE ----------------
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletErr, setWalletErr] = useState("");
  const [wallet, setWallet] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [paying, setPaying] = useState(false);

  // ---------------- DELIVERY RULES ----------------
  const [dcLoading, setDcLoading] = useState(true);
  const [dcErr, setDcErr] = useState("");
  const [deliveryRules, setDeliveryRules] = useState([]);

  // ---------------- RAZORPAY STATE ----------------
  const [rzpReady, setRzpReady] = useState(false);

  const emptyForm = {
    label: "Home",
    pincode: "",
    house: "",
    area: "",
    landmark: "",
    receiverFirstName: "",
    receiverLastName: "",
    receiverPhone: "",
    isDefault: true,
  };
  const [form, setForm] = useState(emptyForm);

  // ✅ Build ORIGIN for images
  const API_ORIGIN = useMemo(() => {
    const base = (axiosInstance.defaults.baseURL || "").trim();
    if (!base) return "http://localhost:3000";
    return base.replace(/\/$/, "");
  }, []);

  const imgUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
    return `${API_ORIGIN}/${path}`;
  };

  const money = (v) => {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return "0.00";
    return n.toFixed(2);
  };

  // ---------------- CART HELPERS ----------------
  const cartItems = (data?.CartItems || data?.cartItems || data?.items || []) ?? [];
  const getProduct = (it) => it?.product || it?.Product || it?.productDetails || {};
  const getQty = (it) => Number(it?.qty ?? it?.quantity ?? it?.cartQty ?? 1);

  const itemsCount = data?.itemsCount ?? cartItems.length ?? 0;
  const totalQty = data?.totalQty ?? cartItems.reduce((s, it) => s + Number(getQty(it) || 0), 0);

  const totalAmount =
    data?.totalAmount ??
    cartItems.reduce((s, it) => {
      const p = getProduct(it);
      const price = Number(p?.price ?? it?.price ?? 0);
      return s + price * getQty(it);
    }, 0);

  // ---------------- DELIVERY CHARGE CALC ----------------
  const deliveryCharge = useMemo(() => {
    const subtotal = Number(totalAmount || 0);
    if (!Array.isArray(deliveryRules) || deliveryRules.length === 0) return 0;

    const active = deliveryRules.filter((r) => r?.isActive !== false);

    const matches = active.filter((r) => {
      const min = Number(r?.minAmount ?? 0);
      const max = Number(r?.maxAmount ?? 0);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
      return subtotal >= min && subtotal <= max;
    });

    if (matches.length === 0) return 0;

    matches.sort((a, b) => Number(a.maxAmount) - Number(b.maxAmount));
    const chosen = matches[0];
    const c = Number(chosen?.charge ?? 0);
    return Number.isFinite(c) ? c : 0;
  }, [deliveryRules, totalAmount]);

  const grandTotal = useMemo(() => Number(totalAmount || 0) + Number(deliveryCharge || 0), [totalAmount, deliveryCharge]);

  // ---------------- LOADERS ----------------
  const loadCart = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await axiosInstance.get("/api/cart", { params: { _ts: Date.now() } });
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to load cart");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setAddrLoading(true);
      setAddrErr("");
      setAddrMsg("");
      const res = await axiosInstance.get("/api/addresses", { params: { _ts: Date.now() } });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.addresses) ? raw.addresses : [];
      setAddresses(list);
    } catch (e) {
      setAddrErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to load addresses");
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      setWalletLoading(true);
      setWalletErr("");
      const res = await axiosInstance.get("/api/wallet", { params: { _ts: Date.now() } });
      setWallet(res.data || null);
    } catch (e) {
      setWalletErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to load wallet");
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  };

  const loadDeliveryCharges = async () => {
    try {
      setDcLoading(true);
      setDcErr("");
      const res = await axiosInstance.get("/api/deliverycharges", { params: { _ts: Date.now() } });
      setDeliveryRules(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setDcErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to load delivery charges");
      setDeliveryRules([]);
    } finally {
      setDcLoading(false);
    }
  };

  // ---------------- RAZORPAY SCRIPT ----------------
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const existing = document.getElementById("razorpay-checkout-js");
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    loadCart();
    loadAddresses();
    loadWallet();
    loadDeliveryCharges();

    (async () => {
      const ok = await loadRazorpayScript();
      setRzpReady(!!ok);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- DEFAULT ADDRESS ----------------
  const defaultAddress = useMemo(() => {
    if (!Array.isArray(addresses) || addresses.length === 0) return null;
    return addresses.find((a) => a?.isDefault) || addresses[0] || null;
  }, [addresses]);

  useEffect(() => {
    if (selectedAddressId) return;
    const defId = defaultAddress?.id ?? defaultAddress?._id ?? "";
    if (defId) setSelectedAddressId(String(defId));
  }, [defaultAddress, selectedAddressId]);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return defaultAddress || null;
    return addresses.find((a) => String(a?.id ?? a?._id) === String(selectedAddressId)) || defaultAddress || null;
  }, [addresses, selectedAddressId, defaultAddress]);

  // ---------------- UPDATE QTY ----------------
  const updateQty = async (cartItemId, newQty) => {
    const qty = Number(newQty);
    if (!cartItemId) return;
    if (!Number.isFinite(qty) || qty < 1) return;

    try {
      setUpdatingId(cartItemId);
      setErr("");

      const res = await axiosInstance.put(`/api/cart/${cartItemId}`, { qty });
      const updated = res?.data;

      if (updated && (updated.CartItems || updated.cartItems || updated.items)) {
        setData(updated);
      } else {
        await loadCart();
      }
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to update quantity");
    } finally {
      setUpdatingId(null);
    }
  };

  // ---------------- DELETE ITEM ----------------
  const removeItem = async (cartItemId) => {
    if (!cartItemId) return;
    const ok = window.confirm("Remove this item from cart?");
    if (!ok) return;

    try {
      setDeletingId(cartItemId);
      setErr("");
      await axiosInstance.delete(`/api/cart/${cartItemId}`);
      await loadCart();
      await loadDeliveryCharges();
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Failed to remove item");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------- ADDRESS ACTIONS ----------------
  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setAddrMsg("");
    setAddrErr("");
  };

  const startEdit = (addr) => {
    const id = addr?.id ?? addr?._id;
    setEditingId(id || null);

    setForm({
      label: addr?.label || "Home",
      pincode: addr?.pincode || "",
      house: addr?.house || "",
      area: addr?.area || "",
      landmark: addr?.landmark || "",
      receiverFirstName: addr?.receiverFirstName || "",
      receiverLastName: addr?.receiverLastName || "",
      receiverPhone: addr?.receiverPhone || "",
      isDefault: !!addr?.isDefault,
    });

    setFormOpen(true);
    setAddrMsg("");
    setAddrErr("");
  };

  const cancelForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const onFormChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const saveAddress = async (e) => {
    e.preventDefault();
    setAddrMsg("");
    setAddrErr("");

    if (!form.label || !form.pincode || !form.house || !form.area || !form.receiverFirstName || !form.receiverPhone) {
      setAddrErr("Please fill required fields: label, pincode, house, area, receiverFirstName, receiverPhone");
      return;
    }

    try {
      setSavingAddr(true);

      const payload = {
        label: form.label,
        pincode: form.pincode,
        house: form.house,
        area: form.area,
        landmark: form.landmark || "",
        receiverFirstName: form.receiverFirstName,
        receiverLastName: form.receiverLastName || "",
        receiverPhone: form.receiverPhone,
        isDefault: !!form.isDefault,
      };

      if (editingId) {
        await axiosInstance.put(`/api/addresses/${editingId}`, payload);
        setAddrMsg("Address updated ✅");
      } else {
        await axiosInstance.post("/api/addresses", payload);
        setAddrMsg("Address added ✅");
      }

      await loadAddresses();
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (e2) {
      setAddrErr(e2?.response?.data?.msg || e2?.response?.data?.message || e2?.message || "Failed to save address");
    } finally {
      setSavingAddr(false);
    }
  };

  // ---------------- PAY NOW ----------------
  const walletBalance = Number(wallet?.balance ?? 0);
  const canPayWithWallet = walletBalance >= Number(grandTotal || 0);

  const payNow = async () => {
    if (paying) return;

    if (!selectedAddressId) {
      setErr("Please select an address.");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (cartItems.length === 0) {
      setErr("Cart is empty.");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (paymentMethod === "WALLET" && !canPayWithWallet) {
      setErr("Insufficient wallet balance for Grand Total.");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (paymentMethod === "RAZORPAY" && !rzpReady) {
      setErr("Razorpay script not loaded. Refresh & try again.");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    try {
      setPaying(true);
      setErr("");

      // ✅ Create order
      const orderRes = await axiosInstance.post("/api/orders", {
        paymentMethod,
        addressId: Number(selectedAddressId),
        // If backend accepts, you can also send:
        // deliveryCharge: Number(deliveryCharge || 0),
      });

      const createdOrder = orderRes?.data?.order || orderRes?.data || {};
      const orderId = createdOrder?.id || createdOrder?.orderId;

      // WALLET/COD done
      if (paymentMethod === "WALLET" || paymentMethod === "COD") {
        await loadWallet();
        navigate("/components/Dashboard", { state: { orderId } });
        return;
      }

      // ✅ Razorpay create-order (server should return keyId, orderId, amount)
      const rzCreate = await axiosInstance.post("/api/razorpay/create-order", { orderId: Number(orderId) });
      const rz = rzCreate?.data || {};

      const razorpayOrderId = rz?.orderId || rz?.razorpay_order_id;
      const amountPaise = Number(rz?.amount ?? 0);
      const currency = rz?.currency || "INR";
      const keyId = rz?.keyId || rz?.key_id || rz?.key || "";

      if (!razorpayOrderId || !amountPaise || !keyId) {
        setErr("Razorpay create-order missing fields.");
        return;
      }

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const tokenNow = localStorage.getItem("token") || localStorage.getItem("authToken");

      const options = {
        key: keyId,
        amount: String(amountPaise),
        currency,
        name: "Bestway",
        description: `Order #${orderId}`,
        order_id: razorpayOrderId,
        prefill: {
          name: [selectedAddress?.receiverFirstName, selectedAddress?.receiverLastName].filter(Boolean).join(" "),
          contact: selectedAddress?.receiverPhone || "",
          email: user?.email || "",
        },
        notes: { internal_order_id: String(orderId) },
        theme: { color: "#6D5BFF" },

        handler: async function (response) {
          try {
            // ✅ Ensure token still exists (protect from accidental clearing)
            if (tokenNow && !(localStorage.getItem("token") || localStorage.getItem("authToken"))) {
              localStorage.setItem("token", tokenNow);
            }

            // ✅ Verify payment
            await axiosInstance.post("/api/razorpay/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // ✅ Reload data (no logout)
            await loadCart();
            await loadWallet();
            navigate("/components/Dashboard", { state: { orderId } });
          } catch (e) {
            setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Payment verify failed");
            topRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.response?.data?.message || e?.message || "Pay now failed");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } finally {
      setPaying(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.container}>
        <div ref={topRef} />

        {/* HERO */}
        <div style={S.hero}>
          <div>
            <div style={S.h1}>Cart</div>
            <div style={S.sub}>All-in-one checkout (Items + Address + Delivery + Payment)</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => navigate(-1)}>← Back</button>
            <button style={S.btn} onClick={() => navigate("/Order")}>Products</button>
            <button
              style={S.btn}
              onClick={() => {
                loadCart();
                loadAddresses();
                loadWallet();
                loadDeliveryCharges();
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {err && <div style={{ ...S.info, color: "#ffb4b4" }}>{err}</div>}

        {/* ✅ ONE PAGE GRID: CART | ADDRESS | SUMMARY */}
        <div className="grid3">
          {/* CART COLUMN */}
          <div style={S.panel}>
            <div style={S.panelTop}>
              <div>
                <div style={S.panelTitle}>Cart Items</div>
                <div style={S.panelSub}>Update qty / delete item</div>
              </div>
              <div style={S.badge2}>
                {itemsCount} items • Qty {totalQty}
              </div>
            </div>

            {loading ? (
              <div style={S.info}>Loading cart…</div>
            ) : cartItems.length === 0 ? (
              <div style={S.info}>Cart is empty.</div>
            ) : (
              <div style={S.list}>
                {cartItems.map((it, idx) => {
                  const p = getProduct(it);
                  const qty = getQty(it);
                  const img = imgUrl(p?.images?.[0]);
                  const price = Number(p?.price || it?.price || 0);
                  const lineTotal = price * qty;

                  const cartItemId = it?.id ?? it?.cartItemId ?? it?._id;
                  const isUpdating = String(updatingId) === String(cartItemId);
                  const isDeleting = String(deletingId) === String(cartItemId);

                  return (
                    <div key={cartItemId ?? idx} style={S.item}>
                      <div style={S.imgWrap}>
                        <img
                          src={img || "https://via.placeholder.com/220x160?text=No+Image"}
                          alt={p?.name || "Product"}
                          style={S.img}
                          onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/220x160?text=No+Image")}
                        />
                      </div>

                      <div style={S.itemBody}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={S.name}>{p?.name || it?.name || "—"}</div>
                          <button
                            style={{ ...S.delBtn, opacity: isDeleting ? 0.6 : 1 }}
                            onClick={() => removeItem(cartItemId)}
                            disabled={isDeleting}
                            title="Remove item"
                          >
                            {isDeleting ? "Removing…" : "🗑"}
                          </button>
                        </div>

                        <div style={S.meta}>
                          <span>{p?.brand || "—"}</span>
                          <span style={{ opacity: 0.7 }}>{p?.category || ""}</span>
                        </div>

                        <div style={S.row}>
                          <div style={S.price}>₹ {money(price)}</div>
                          <div style={S.badge}>Stock: {Number(p?.stockQty ?? 0) || "—"}</div>
                        </div>

                        <div style={S.qtyRow}>
                          <div style={S.qtyBox}>
                            <button
                              style={{ ...S.qtyBtn, opacity: qty <= 1 || isUpdating ? 0.5 : 1 }}
                              onClick={() => qty > 1 && updateQty(cartItemId, qty - 1)}
                              disabled={qty <= 1 || isUpdating}
                            >
                              −
                            </button>

                            <div style={S.qtyValue}>{qty}</div>

                            <button
                              style={{ ...S.qtyBtn, opacity: isUpdating ? 0.6 : 1 }}
                              onClick={() => updateQty(cartItemId, qty + 1)}
                              disabled={isUpdating}
                            >
                              +
                            </button>
                          </div>

                          {isUpdating && <div style={S.updatingText}>Updating…</div>}
                        </div>

                        <div style={S.lineTotal}>Line Total: ₹ {money(lineTotal)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ADDRESS COLUMN */}
          <div style={S.panel}>
            <div style={S.panelTop}>
              <div>
                <div style={S.panelTitle}>Delivery Address</div>
                <div style={S.panelSub}>Select / Add / Edit</div>
              </div>

              <button style={S.smallPrimaryBtn} onClick={startAdd}>
                + Add
              </button>
            </div>

            {addrErr && <div style={{ ...S.info, color: "#ffb4b4" }}>{addrErr}</div>}
            {addrMsg && <div style={{ ...S.info, color: "#b6ffcc" }}>{addrMsg}</div>}

            {addrLoading ? (
              <div style={S.info}>Loading addresses…</div>
            ) : addresses.length === 0 ? (
              <div style={S.info}>No address found. Click “+ Add”.</div>
            ) : (
              <>
                <div style={S.field}>
                  <div style={S.label}>Choose Address *</div>
                  <select value={selectedAddressId} onChange={(e) => setSelectedAddressId(e.target.value)} style={S.input}>
                    {addresses.map((a) => {
                      const id = a?.id ?? a?._id;
                      const text = `${a?.label || "Address"} • ${a?.receiverFirstName || ""} • ${a?.area || ""} - ${a?.pincode || ""}`;
                      return (
                        <option key={id} value={String(id)}>
                          {text}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedAddress && (
                  <div style={{ ...S.addrBox, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 950 }}>
                        {selectedAddress.label || "Address"} {selectedAddress.isDefault ? <span style={S.pill}>DEFAULT</span> : null}
                      </div>
                      <button style={S.tinyBtn} onClick={() => startEdit(selectedAddress)}>
                        Edit
                      </button>
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.5 }}>
                      {selectedAddress.receiverFirstName} {selectedAddress.receiverLastName || ""} • {selectedAddress.receiverPhone}
                      <br />
                      {selectedAddress.house}, {selectedAddress.area}
                      {selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ""} - {selectedAddress.pincode}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ✅ FORM ALWAYS IN SAME PAGE */}
            {formOpen && (
              <div style={{ marginTop: 14 }}>
                <div style={S.formTitle}>{editingId ? "Edit Address" : "Add New Address"}</div>

                <form onSubmit={saveAddress} style={S.formGrid}>
                  <div style={S.field}>
                    <div style={S.label}>Label *</div>
                    <select value={form.label} onChange={(e) => onFormChange("label", e.target.value)} style={S.input}>
                      <option>Home</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Pincode *</div>
                    <input value={form.pincode} onChange={(e) => onFormChange("pincode", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.fieldFull}>
                    <div style={S.label}>House / Flat *</div>
                    <input value={form.house} onChange={(e) => onFormChange("house", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Area *</div>
                    <input value={form.area} onChange={(e) => onFormChange("area", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Landmark</div>
                    <input value={form.landmark} onChange={(e) => onFormChange("landmark", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Receiver First Name *</div>
                    <input value={form.receiverFirstName} onChange={(e) => onFormChange("receiverFirstName", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Receiver Last Name</div>
                    <input value={form.receiverLastName} onChange={(e) => onFormChange("receiverLastName", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Receiver Phone *</div>
                    <input value={form.receiverPhone} onChange={(e) => onFormChange("receiverPhone", e.target.value)} style={S.input} />
                  </div>

                  <div style={S.field}>
                    <div style={S.label}>Default?</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10 }}>
                      <input type="checkbox" checked={!!form.isDefault} onChange={(e) => onFormChange("isDefault", e.target.checked)} />
                      <span style={{ opacity: 0.9, fontWeight: 800 }}>Make default</span>
                    </label>
                  </div>

                  <div style={S.fieldFull}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="submit" style={{ ...S.primaryBtn, opacity: savingAddr ? 0.6 : 1 }} disabled={savingAddr}>
                        {savingAddr ? "Saving…" : editingId ? "Update" : "Save"}
                      </button>

                      <button type="button" style={S.btnGhost} onClick={cancelForm}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* SUMMARY + PAYMENT COLUMN */}
          <div style={S.panel}>
            <div style={S.panelTop}>
              <div>
                <div style={S.panelTitle}>Order Summary</div>
                <div style={S.panelSub}>Delivery + payment + pay now</div>
              </div>
            </div>

            <div style={S.summaryBox}>
              <div style={S.sumRow}>
                <span style={S.sumLeft}>Products</span>
                <b style={S.sumRight}>{itemsCount}</b>
              </div>
              <div style={S.sumRow}>
                <span style={S.sumLeft}>Total Qty</span>
                <b style={S.sumRight}>{totalQty}</b>
              </div>
              <div style={S.sumRow}>
                <span style={S.sumLeft}>Subtotal</span>
                <b style={S.sumRight}>₹ {money(totalAmount)}</b>
              </div>

              <div style={S.sumRow}>
                <span style={S.sumLeft}>Delivery</span>
                <b style={S.sumRight}>
                  {dcLoading ? (
                    "Loading…"
                  ) : dcErr ? (
                    <span style={{ color: "#ffb4b4" }}>Error</span>
                  ) : deliveryCharge > 0 ? (
                    `₹ ${money(deliveryCharge)}`
                  ) : (
                    <span style={{ color: "#9ff0be" }}>FREE</span>
                  )}
                </b>
              </div>

              <div style={{ ...S.sumRow, borderBottom: "none", paddingBottom: 0 }}>
                <span style={{ ...S.sumLeft, fontWeight: 950 }}>Grand Total</span>
                <b style={{ ...S.sumRight, color: "#ffd24a", fontSize: 15 }}>₹ {money(grandTotal)}</b>
              </div>

              <div style={{ height: 12 }} />

              {/* WALLET */}
              <div style={S.walletBox}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950 }}>Wallet</div>
                  <button style={S.tinyBtn} onClick={loadWallet} disabled={walletLoading}>
                    {walletLoading ? "…" : "Reload"}
                  </button>
                </div>

                {walletErr ? (
                  <div style={{ marginTop: 8, color: "#ffb4b4", fontWeight: 800 }}>{walletErr}</div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 950, color: "#ffd24a" }}>
                    ₹ {money(wallet?.balance)}
                  </div>
                )}

                {paymentMethod === "WALLET" && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                    {canPayWithWallet ? (
                      <span style={{ color: "#9ff0be", fontWeight: 900 }}>✅ Enough</span>
                    ) : (
                      <span style={{ color: "#ffb4b4", fontWeight: 900 }}>❌ Not enough</span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ height: 10 }} />

              {/* PAYMENT */}
              <div style={S.field}>
                <div style={S.label}>Payment Method</div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={S.input}>
                  <option value="RAZORPAY">RAZORPAY</option>
                  <option value="WALLET">WALLET</option>
                  <option value="COD">COD</option>
                </select>

                {paymentMethod === "RAZORPAY" && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                    Razorpay: {rzpReady ? <b style={{ color: "#9ff0be" }}>Ready</b> : <b style={{ color: "#ffb4b4" }}>Not Loaded</b>}
                  </div>
                )}
              </div>

              <button
                type="button"
                style={{
                  ...S.payBtn,
                  opacity:
                    paying ||
                    cartItems.length === 0 ||
                    !selectedAddressId ||
                    (paymentMethod === "WALLET" && !canPayWithWallet) ||
                    (paymentMethod === "RAZORPAY" && !rzpReady)
                      ? 0.6
                      : 1,
                }}
                disabled={
                  paying ||
                  cartItems.length === 0 ||
                  !selectedAddressId ||
                  (paymentMethod === "WALLET" && !canPayWithWallet) ||
                  (paymentMethod === "RAZORPAY" && !rzpReady)
                }
                onClick={payNow}
              >
                {paying ? "Processing..." : paymentMethod === "COD" ? "Place Order" : "Pay Now"}
              </button>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Delivery shows <b>FREE</b> if no range matches.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const css = `
  *{ margin:0; padding:0; box-sizing:border-box; }
  html,body,#root{ height:100%; width:100%; }
  body{
    overflow-x:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
    background: linear-gradient(180deg,#040915 0%,#060c19 50%,#050914 100%);
    color: #e9eefc;
  }
  input, textarea, select, button { font-family: inherit; }

  .grid3{
    display:grid;
    grid-template-columns: 1.1fr .9fr .75fr;
    gap: 12px;
    align-items:start;
  }

  @media (max-width: 1100px){
    .grid3{ grid-template-columns: 1fr; }
  }
`;

const S = {
  page: { minHeight: "100vh", color: "#e9eefc" },
  container: { width: "min(1400px, 100%)", margin: "0 auto", padding: "18px 16px 60px" },

  hero: {
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(12,18,36,.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  h1: { fontSize: 34, fontWeight: 950 },
  sub: { marginTop: 6, fontSize: 13, opacity: 0.8 },

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },

  panel: {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.06)",
  },
  panelTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: 950 },
  panelSub: { marginTop: 4, fontSize: 12, opacity: 0.75 },

  badge2: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(34,211,238,.35)",
    background: "rgba(34,211,238,.10)",
    color: "#bff7ff",
    whiteSpace: "nowrap",
  },

  info: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(220,235,255,.12)",
    marginBottom: 10,
  },

  list: { display: "grid", gap: 12 },

  item: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: 12,
    borderRadius: 16,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(255,255,255,.05)",
    overflow: "hidden",
  },
  imgWrap: { background: "rgba(255,255,255,.05)" },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  itemBody: { padding: 12 },
  name: { fontSize: 15, fontWeight: 950 },
  meta: { marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, opacity: 0.9 },

  row: { marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(74,140,255,.35)",
    background: "rgba(74,140,255,.10)",
    color: "#a9c8ff",
    whiteSpace: "nowrap",
  },

  price: { fontSize: 14, fontWeight: 950, color: "#ffd24a" },

  qtyRow: { marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },

  qtyBox: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
  },
  qtyBtn: {
    width: 40,
    height: 36,
    border: "none",
    background: "rgba(255,255,255,.04)",
    color: "#e9eefc",
    fontSize: 18,
    fontWeight: 950,
    cursor: "pointer",
  },
  qtyValue: { width: 46, height: 36, display: "grid", placeItems: "center", fontWeight: 950 },

  updatingText: {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(233,238,252,.78)",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px dashed rgba(255,255,255,.18)",
    background: "rgba(255,255,255,.05)",
  },

  lineTotal: { marginTop: 10, fontSize: 12, opacity: 0.85 },

  delBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,180,180,.35)",
    background: "rgba(255,180,180,.10)",
    color: "#ffb4b4",
    fontWeight: 950,
    cursor: "pointer",
  },

  smallPrimaryBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6D5BFF, #22D3EE)",
    color: "#08101f",
    fontWeight: 950,
    cursor: "pointer",
  },

  addrBox: {
    borderRadius: 14,
    padding: 12,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(10,16,35,.55)",
  },
  pill: {
    marginLeft: 8,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(34,211,238,.35)",
    background: "rgba(34,211,238,.10)",
    color: "#bff7ff",
  },
  tinyBtn: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  },

  formTitle: { marginTop: 12, fontSize: 14, fontWeight: 950, opacity: 0.9 },

  formGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  field: {},
  fieldFull: { gridColumn: "1 / -1" },
  label: { fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.05)",
    color: "#e9eefc",
    outline: "none",
  },

  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6D5BFF, #22D3EE)",
    color: "#08101f",
    fontWeight: 950,
    cursor: "pointer",
    padding: "0 14px",
  },
  btnGhost: {
    height: 44,
    borderRadius: 12,
    border: "1px solid rgba(220,235,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
    padding: "0 14px",
  },

  summaryBox: {
    borderRadius: 14,
    padding: 12,
    border: "1px solid rgba(220,235,255,.12)",
    background: "rgba(10,16,35,.55)",
  },
  sumRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px dashed rgba(220,235,255,.10)",
  },
  sumLeft: { fontSize: 13, opacity: 0.85, fontWeight: 800 },
  sumRight: { fontSize: 13, fontWeight: 950 },

  walletBox: {
    borderRadius: 14,
    padding: 12,
    border: "1px solid rgba(220,235,255,.10)",
    background: "rgba(255,255,255,.05)",
  },

  payBtn: {
    marginTop: 12,
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #6D5BFF, #22D3EE)",
    color: "#08101f",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 14,
  },
};
