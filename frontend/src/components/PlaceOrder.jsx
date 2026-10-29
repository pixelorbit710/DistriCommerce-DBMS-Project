import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Split,
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  Package,
  Layers,
  Sparkles,
  Truck,
  RotateCcw
} from 'lucide-react';

export default function PlaceOrder({ onOrderCreated, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Form State - Generic E-Commerce Inputs
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    customer_name: '',
    delivery_city: 'Nagpur',
    delivery_address: '402, Civil Lines, Near High Court, Wardha Road, Pin 440001',
    customer_phone: '+91 98765 43210',
    customer_email: 'riya.pardhi@rscoe.ac.in',
    customer_id: ''
  });

  // Routing preview state
  const [routingPreview, setRoutingPreview] = useState(null);

  useEffect(() => {
    async function loadFormMetadata() {
      try {
        setLoading(true);
        const [prodRes, custRes] = await Promise.all([
          api.getProducts(),
          api.getCustomers()
        ]);
        const prods = prodRes.central_products || [];
        setProducts(prods);
        setCustomers(custRes.customers || []);

        if (prods.length > 0) {
          setFormData((prev) => ({
            ...prev,
            product_id: prods[0].product_id
          }));
        }
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to load product catalog from database.' });
      } finally {
        setLoading(false);
      }
    }
    loadFormMetadata();
  }, []);

  // Update routing preview when delivery_city changes
  useEffect(() => {
    let active = true;
    const fetchRouting = async () => {
      try {
        if (!formData.delivery_city.trim()) {
          setRoutingPreview(null);
          return;
        }
        const res = await api.resolveCity(formData.delivery_city.trim());
        if (active) {
          setRoutingPreview(res);
        }
      } catch (err) {
        console.error('Error resolving city routing:', err);
      }
    };
    const timer = setTimeout(fetchRouting, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.delivery_city]);

  const selectedProduct = products.find((p) => p.product_id === formData.product_id) || null;
  const unitPrice = selectedProduct ? parseFloat(selectedProduct.price) : 0;
  const availableStock = selectedProduct ? parseInt(selectedProduct.stock_quantity) : 0;
  const totalAmount = unitPrice * (parseInt(formData.quantity) || 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleQuickFill = (customerName, city, address, email, phone) => {
    setFormData((prev) => ({
      ...prev,
      customer_name: customerName,
      delivery_city: city,
      delivery_address: address,
      customer_email: email,
      customer_phone: phone,
      customer_id: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setSuccessReceipt(null);

    // Client-side validations
    if (!formData.product_id) {
      setFeedback({ type: 'error', message: 'Please select a product from the catalog.' });
      return;
    }
    if (!formData.customer_name.trim()) {
      setFeedback({ type: 'error', message: 'Customer Full Name is required.' });
      return;
    }
    if (!formData.delivery_city.trim()) {
      setFeedback({ type: 'error', message: 'Delivery City is required.' });
      return;
    }
    if (!formData.delivery_address.trim()) {
      setFeedback({ type: 'error', message: 'Complete delivery address is required.' });
      return;
    }
    const qty = parseInt(formData.quantity);
    if (!qty || qty <= 0) {
      setFeedback({ type: 'error', message: 'Quantity must be a positive integer.' });
      return;
    }
    if (qty > availableStock) {
      setFeedback({
        type: 'error',
        message: `Requested quantity (${qty}) exceeds available stock (${availableStock}) for ${selectedProduct.name}.`
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer_name: formData.customer_name.trim(),
        delivery_city: formData.delivery_city.trim(),
        delivery_address: formData.delivery_address.trim(),
        customer_phone: formData.customer_phone.trim(),
        customer_email: formData.customer_email.trim(),
        product_id: formData.product_id,
        quantity: qty
      };

      const res = await api.createOrder(payload);
      setSuccessReceipt(res.order);
      setFeedback({
        type: 'success',
        message: `Order ${res.order.order_id} successfully created! Horizontally routed and inserted into regional fragment '${res.order.target_fragment}'.`
      });

      // Reload products to refresh stock count
      const prodRes = await api.getProducts();
      setProducts(prodRes.central_products || []);

      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred while placing order.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Loading DistriCommerce product catalog...</div>;
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Educational Banner */}
      <div className="theory-banner" style={{ marginBottom: '22px' }}>
        <div className="theory-title">
          <Truck size={18} /> Generic Customer Ordering with Autonomous Regional Routing
        </div>
        <p className="theory-desc">
          Customers can order to <strong>any delivery city in India</strong> (e.g. Nagpur, Mumbai, Nashik, Jaipur, Bengaluru, Kolkata, or arbitrary locations).
          The backend DDBMS routing engine maps the delivery city to the nearest configured regional database node (Pune, Delhi, or Chennai)
          or applies the primary gateway fallback rule, while strictly preserving the customer's actual delivery city and address in the fragment record.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '10px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
            onClick={() => setFeedback(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Confirmation Receipt Dialog */}
      {successReceipt && (
        <div className="card" style={{ border: '2px solid #10b981', marginBottom: '25px', background: '#f0fdf4' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #bbf7d0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#166534', fontWeight: 700 }}>
                  Order Confirmed & Partitioned
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#15803d' }}>
                  Persisted directly to regional database fragment <strong>{successReceipt.target_fragment}</strong>
                </p>
              </div>
            </div>
            <span className="badge badge-green" style={{ fontSize: '12px', padding: '6px 12px' }}>
              {successReceipt.status}
            </span>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#65a30d', textTransform: 'uppercase', fontWeight: 700 }}>Order ID</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', fontFamily: 'monospace' }}>{successReceipt.order_id}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#65a30d', textTransform: 'uppercase', fontWeight: 700 }}>Customer Name</span>
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#14532d' }}>{successReceipt.customer_name}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#65a30d', textTransform: 'uppercase', fontWeight: 700 }}>Delivery City</span>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#2563eb' }}>
                  📍 {successReceipt.delivery_city}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#65a30d', textTransform: 'uppercase', fontWeight: 700 }}>Total Gross Amount</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#047857' }}>{formatCurrency(successReceipt.total_amount)}</div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                <strong>Product:</strong> {successReceipt.product_name} × {successReceipt.quantity} unit(s) @ {formatCurrency(successReceipt.unit_price)}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                <strong>Delivery Address:</strong> {successReceipt.delivery_address}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <strong>DDBMS Shard Node:</strong> Node <code>{successReceipt.region}</code> &bull; Fragment Table: <code>{successReceipt.target_fragment}</code> &bull; {successReceipt.routing_reason}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate && onNavigate('order-mgmt')}
              >
                View in Order Management
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSuccessReceipt(null)}
              >
                Place Another Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Order Placement Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Product Selection & Customer Form */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">1. Select Product & Quantity</h3>
              <p className="card-subtitle">Choose from the central master catalog</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Product Card Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Available Products</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto', padding: '4px' }}>
                {products.map((p) => {
                  const isSelected = formData.product_id === p.product_id;
                  const isOutOfStock = p.stock_quantity <= 0;
                  return (
                    <div
                      key={p.product_id}
                      onClick={() => !isOutOfStock && setFormData((prev) => ({ ...prev, product_id: p.product_id }))}
                      style={{
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : isOutOfStock ? '#f8fafc' : '#fff',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        opacity: isOutOfStock ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{p.category}</span>
                        <span className={`badge ${p.stock_quantity > 10 ? 'badge-green' : p.stock_quantity > 0 ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: '10.5px' }}>
                          {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a', marginBottom: '4px' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                        {formatCurrency(p.price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div style={{ marginBottom: '22px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Order Quantity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    style={{ width: '38px', height: '38px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                    onClick={() => setFormData((prev) => ({ ...prev, quantity: Math.max(1, parseInt(prev.quantity || 1) - 1) }))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={availableStock || 100}
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                    style={{ width: '60px', height: '38px', textAlign: 'center', border: 'none', fontWeight: 600, fontSize: '15px' }}
                  />
                  <button
                    type="button"
                    style={{ width: '38px', height: '38px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                    onClick={() => setFormData((prev) => ({ ...prev, quantity: Math.min(availableStock || 100, parseInt(prev.quantity || 1) + 1) }))}
                  >
                    +
                  </button>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  {availableStock > 0 ? `Max available: ${availableStock} units` : 'Product unavailable'}
                </span>
              </div>
            </div>

            {/* Customer Information Header */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                    2. Customer & Delivery Address
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Generic input for any customer and any Indian city
                  </p>
                </div>

                {/* Quick Fill Dropdown */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickFill('Riya Pardhi', 'Nagpur', 'Flat 402, Civil Lines, Wardha Road, Nagpur - 440015', 'riya.p@example.in', '+91 98765 43210')}
                  >
                    + Nagpur
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickFill('Pooja Jagtap', 'Mumbai', '120 Marine Drive, Nariman Point, Mumbai - 400021', 'pooja.j@example.in', '+91 98200 11223')}
                  >
                    + Mumbai
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickFill('Aditi Gite', 'Jaipur', 'C-Scheme, Ashok Nagar, Jaipur - 302001', 'aditi.g@example.in', '+91 98111 22334')}
                  >
                    + Jaipur
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickFill('Shanitej Patil', 'Bengaluru', 'Indiranagar 100ft Road, Bengaluru - 560038', 'shanitej.p@example.in', '+91 94440 33445')}
                  >
                    + Bengaluru
                  </button>
                </div>
              </div>

              {/* Customer Name */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  <User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Customer Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter customer name (e.g. Riya Pardhi)"
                  value={formData.customer_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>

              {/* Delivery City (Arbitrary input with smart routing) */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Delivery City <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter any delivery city (e.g. Nagpur, Mumbai, Jaipur, Bengaluru, Kolkata...)"
                  value={formData.delivery_city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, delivery_city: e.target.value }))}
                  required
                />
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  Type any Indian city. The distributed database engine will dynamically allocate it to the appropriate regional storage node.
                </div>
              </div>

              {/* Delivery Address */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  <Home size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Complete Street / Locality Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Apartment, Street, Locality, Landmark, PIN code"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, delivery_address: e.target.value }))}
                  required
                />
              </div>

              {/* Contact Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">
                    <Phone size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Phone
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 98XXX XXXXX"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">
                    <Mail size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="customer@example.in"
                    value={formData.customer_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700 }}
              disabled={submitting || availableStock <= 0}
            >
              {submitting ? 'Allocating & Partitioning...' : 'Place Order with Distributed Allocation'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Right Column: Real-time Routing & Summary Card */}
        <div>
          {/* Smart Routing Preview Card */}
          <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #2563eb' }}>
            <div className="card-header" style={{ paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Split size={18} style={{ color: '#2563eb' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Intelligent DDBMS Shard Routing
                </h4>
              </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {routingPreview ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Entered City:</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      📍 {routingPreview.input_city || 'None'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Allocated Node:</span>
                    <span className="badge badge-blue" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      {routingPreview.assigned_region} Node Hub
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Target Fragment:</span>
                    <code style={{ fontSize: '12.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {routingPreview.target_fragment}
                    </code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Storage File:</span>
                    <code style={{ fontSize: '12px', color: '#475569' }}>
                      {routingPreview.storage_node}
                    </code>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#475569', border: '1px solid #e2e8f0' }}>
                    <strong>Allocation Logic:</strong> {routingPreview.routing_reason}
                    {routingPreview.is_fallback && (
                      <div style={{ color: '#b45309', marginTop: '4px' }}>
                        * City is outside primary clusters; routed via Primary Gateway Hub.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Enter a delivery city to view real-time regional node allocation.
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} style={{ color: '#059669' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Order Financial Summary
                </h4>
              </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {selectedProduct ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: '#475569' }}>
                    <span>{selectedProduct.name} (×{formData.quantity})</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: '#475569' }}>
                    <span>GST (18% Included)</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Included</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13.5px', color: '#475569' }}>
                    <span>Express Multi-City Delivery</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>FREE</span>
                  </div>

                  <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Grand Total</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#64748b' }}>
                    &bull; Price verified against authoritative master catalog<br />
                    &bull; Inventory will be atomically deducted on commit
                  </div>
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>Select a product to view pricing summary.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
