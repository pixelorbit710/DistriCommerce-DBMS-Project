import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpDown,
  RefreshCw,
  X,
  MapPin,
  Home,
  User,
  Phone,
  Split,
  Calendar
} from 'lucide-react';

export default function OrderManagement({ onDataChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getOrders({
        region: regionFilter,
        status: statusFilter,
        search,
        start_date: startDate,
        end_date: endDate,
      });
      setOrders(res.orders || []);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to load orders from database.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [regionFilter, statusFilter, search, startDate, endDate]);

  const handleStatusChange = async (orderId, region, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, region, newStatus);
      const msg = newStatus === 'Cancelled'
        ? `Order ${orderId} marked as Cancelled. Product inventory restored to central catalog and replicas!`
        : `Order ${orderId} in orders_${region.toLowerCase()} updated to '${newStatus}'.`;
      setFeedback({ type: 'success', message: msg });
      loadOrders();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setFeedback({ type: 'error', message: `Failed to update status: ${err.message}` });
    }
  };

  const handleDelete = async (orderId, region) => {
    if (!window.confirm(`Are you sure you want to safely delete demo order ${orderId} from regional fragment 'orders_${region.toLowerCase()}'?`)) {
      return;
    }
    try {
      await api.deleteOrder(orderId, region);
      setFeedback({ type: 'success', message: `Order ${orderId} successfully deleted from fragment 'orders_${region.toLowerCase()}'.` });
      loadOrders();
      if (onDataChanged) onDataChanged();
      if (selectedOrder?.order_id === orderId) setSelectedOrder(null);
    } catch (err) {
      setFeedback({ type: 'error', message: `Failed to delete order: ${err.message}` });
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div>
      {/* Educational Banner */}
      <div className="theory-banner" style={{ marginBottom: '20px' }}>
        <div className="theory-title">
          <Database size={18} /> Global Relation Reconstruction via Relational UNION ALL
        </div>
        <p className="theory-desc">
          Executes <code>orders_pune UNION ALL orders_delhi UNION ALL orders_chennai</code>.
          Filters push selection predicates directly down to the specific regional storage nodes (<strong>Predicate Pushdown</strong>),
          minimizing cross-site network traffic. The actual delivery city and address are preserved independently of the physical partition.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '13.5px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setFeedback(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '14px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by ID, customer, city, product..."
              className="form-control"
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              className="form-control"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              title="Filter by storage node fragment"
            >
              <option value="All">All Storage Nodes</option>
              <option value="Pune">Pune Node (West)</option>
              <option value="Delhi">Delhi Node (North)</option>
              <option value="Chennai">Chennai Node (South)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by order lifecycle status"
            >
              <option value="All">All Statuses</option>
              <option value="Placed">Placed</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Filter from date"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Filter to date"
            />
          </div>

          {/* Reset Filters */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setRegionFilter('All');
              setStatusFilter('All');
              setSearch('');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Distributed Orders Relation ({orders.length} Records)</h3>
            <p className="card-subtitle">
              Reconstructed in real-time from horizontal partitions across Pune, Delhi, and Chennai storage nodes
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Delivery City</th>
                <th>Product</th>
                <th>Allocated Shard</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status (In-Place)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Executing global reconstructed query...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No orders matching the current filter criteria.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.order_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12.5px' }}>
                      {o.order_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{o.customer_name || 'Customer'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{o.customer_phone || o.customer_id}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} />
                        {o.delivery_city || o.region}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {o.delivery_address || 'Regional Hub'}
                      </div>
                    </td>
                    <td style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o.product_name}
                    </td>
                    <td>
                      <span className={`badge ${o.region === 'Pune' ? 'badge-blue' : o.region === 'Delhi' ? 'badge-purple' : 'badge-green'}`}>
                        {o.region} Hub (orders_{o.region.toLowerCase()})
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{o.quantity}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(o.total_amount)}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{o.order_date?.split(' ')[0]}</td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.order_id, o.region, e.target.value)}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: o.status === 'Delivered' ? '#ecfdf5' : o.status === 'Shipped' ? '#eff6ff' : o.status === 'Cancelled' ? '#fef2f2' : '#fffbeb',
                          color: o.status === 'Delivered' ? '#047857' : o.status === 'Shipped' ? '#1d4ed8' : o.status === 'Cancelled' ? '#b91c1c' : '#b45309'
                        }}
                      >
                        <option value="Placed">Placed</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="View Fragment Details"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#dc2626' }}
                          title="Safe Delete Demo Order"
                          onClick={() => handleDelete(o.order_id, o.region)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Order & Partition Details
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Horizontal fragmentation & physical storage breakdown
                </p>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setSelectedOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Order ID</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#0f172a' }}>{selectedOrder.order_id}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Allocated Shard</div>
                <div style={{ fontWeight: 700, color: '#2563eb' }}>{selectedOrder.region} Node Hub</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Partition Fragment Table</div>
                <code style={{ fontWeight: 700, fontSize: '13px' }}>orders_{selectedOrder.region.toLowerCase()}</code>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Gross Amount</div>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '16px' }}>{formatCurrency(selectedOrder.total_amount)}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
                Customer & Shipping Information
              </h4>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.7, color: '#334155' }}>
                <div><strong>Customer:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_id})</div>
                <div><strong>Delivery City:</strong> 📍 {selectedOrder.delivery_city || selectedOrder.region}</div>
                <div><strong>Address:</strong> {selectedOrder.delivery_address || 'Regional Distribution Center'}</div>
                {selectedOrder.customer_phone && <div><strong>Phone:</strong> {selectedOrder.customer_phone}</div>}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
                Product & Relational Integrity
              </h4>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>
                <div><strong>Product FK:</strong> {selectedOrder.product_id} ({selectedOrder.product_name})</div>
                <div><strong>Quantity:</strong> {selectedOrder.quantity} units @ {formatCurrency(selectedOrder.unit_price)}/unit</div>
                <div><strong>Order Date:</strong> {selectedOrder.order_date}</div>
                <div><strong>Lifecycle Status:</strong> <span className="badge badge-blue">{selectedOrder.status}</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
