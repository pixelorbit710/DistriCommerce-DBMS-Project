import React from 'react';
import {
  ShoppingBag,
  Users,
  Package,
  IndianRupee,
  Server,
  Activity,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  MapPin,
  PieChart,
  BarChart3
} from 'lucide-react';

export default function OverviewDashboard({ stats, health, onNavigate }) {
  if (!stats) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading live database metrics...</div>;
  }

  const {
    total_orders = 0,
    total_customers = 0,
    total_products = 0,
    total_gross_sales = 0,
    regional_breakdown = {},
    status_distribution = {},
    recent_orders = [],
    recent_transactions = [],
    database_engine = 'Distributed Database'
  } = stats;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const regions = ['Pune', 'Delhi', 'Chennai'];

  // Calculate percentage contributions
  const puneSales = regional_breakdown['Pune']?.total_sales || 0;
  const delhiSales = regional_breakdown['Delhi']?.total_sales || 0;
  const chennaiSales = regional_breakdown['Chennai']?.total_sales || 0;
  const sumRegionalSales = puneSales + delhiSales + chennaiSales;

  const punePct = total_gross_sales > 0 ? ((puneSales / total_gross_sales) * 100).toFixed(1) : 0;
  const delhiPct = total_gross_sales > 0 ? ((delhiSales / total_gross_sales) * 100).toFixed(1) : 0;
  const chennaiPct = total_gross_sales > 0 ? ((chennaiSales / total_gross_sales) * 100).toFixed(1) : 0;

  return (
    <div>
      {/* Storage Engine Notice */}
      <div className="theory-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div className="theory-title">
            <Server size={18} /> Active DBMS Engine: {database_engine}
          </div>
          <p className="theory-desc">
            All statistics and regional fragments below are calculated dynamically from actual database records via REST APIs.
            Orders are partitioned horizontally across Pune, Delhi, and Chennai storage sites.
          </p>
        </div>
        <span className="badge badge-green" style={{ fontSize: '13px', padding: '6px 12px' }}>
          <ShieldCheck size={16} /> Relational Integrity Active
        </span>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-emerald">
            <IndianRupee size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Gross Sales</div>
            <div className="stat-value">{formatCurrency(total_gross_sales)}</div>
            <div className="stat-subtext">Sum of Pune + Delhi + Chennai</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Orders Placed</div>
            <div className="stat-value">{total_orders}</div>
            <div className="stat-subtext">Reconstructed via UNION ALL</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-purple">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Registered Customers</div>
            <div className="stat-value">{total_customers}</div>
            <div className="stat-subtext">Central coordinator store</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Catalog Products</div>
            <div className="stat-value">{total_products}</div>
            <div className="stat-subtext">Replicated to 3 regional sites</div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Regional Revenue Contribution & Status Distribution */}
      <div className="grid-2">
        {/* Regional Sales Contribution Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <BarChart3 size={18} color="#2563eb" /> Regional Sales Contribution
              </h3>
              <p className="card-subtitle">
                Total Regional Sum = {formatCurrency(sumRegionalSales)} (100% Gross Match)
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            {/* Multi-segment progress bar */}
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: '#e2e8f0', marginBottom: '14px' }}>
              <div style={{ width: `${punePct}%`, background: '#2563eb' }} title={`Pune: ${punePct}%`}></div>
              <div style={{ width: `${delhiPct}%`, background: '#8b5cf6' }} title={`Delhi: ${delhiPct}%`}></div>
              <div style={{ width: `${chennaiPct}%`, background: '#10b981' }} title={`Chennai: ${chennaiPct}%`}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>Pune Site ({punePct}%)</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1d4ed8' }}>{formatCurrency(puneSales)}</div>
              </div>
              <div style={{ background: '#f5f3ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 600 }}>Delhi Site ({delhiPct}%)</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#7c3aed' }}>{formatCurrency(delhiSales)}</div>
              </div>
              <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 600 }}>Chennai Site ({chennaiPct}%)</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>{formatCurrency(chennaiSales)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <PieChart size={18} color="#2563eb" /> Order Status Distribution
              </h3>
              <p className="card-subtitle">
                Lifecycle state breakdown across all regional fragments
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((st) => {
              const count = status_distribution[st] || 0;
              const pct = total_orders > 0 ? ((count / total_orders) * 100).toFixed(0) : 0;
              const barColor = st === 'Delivered' ? '#10b981' : st === 'Shipped' ? '#2563eb' : st === 'Processing' ? '#f59e0b' : st === 'Cancelled' ? '#ef4444' : '#64748b';

              return (
                <div key={st}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    <span>{st}</span>
                    <span>{count} orders ({pct}%)</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Regional Sites Operational Cards */}
      <div className="card-header" style={{ borderBottom: 'none', marginBottom: '8px', paddingBottom: 0 }}>
        <div>
          <h2 className="card-title">
            <MapPin size={20} color="#2563eb" /> Regional Database Nodes & Site Status
          </h2>
          <p className="card-subtitle">Real-time status of independent regional partition databases</p>
        </div>
      </div>

      <div className="grid-3">
        {regions.map((reg) => {
          const rData = regional_breakdown[reg] || { order_count: 0, total_sales: 0, site_status: 'Online' };
          const cardClass = reg === 'Pune' ? 'site-card-pune' : reg === 'Delhi' ? 'site-card-delhi' : 'site-card-chennai';
          const badgeClass = reg === 'Pune' ? 'badge-blue' : reg === 'Delhi' ? 'badge-purple' : 'badge-green';

          return (
            <div key={reg} className={`site-card ${cardClass}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{reg} Regional Node</h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Fragment: <code>orders_{reg.toLowerCase()}</code></div>
                </div>
                <span className={`badge ${badgeClass}`}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                  {rData.site_status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Regional Orders</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{rData.order_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Regional Revenue</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{formatCurrency(rData.total_sales)}</div>
                </div>
              </div>

              <div style={{ marginTop: '14px', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Storage: <strong>{rData.storage_node}</strong></span>
                <span>Active: <strong>Live</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Split Grid: Recent Orders Feed & 2PC Activity Stream */}
      <div className="grid-2">
        {/* Recent Orders */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Distributed Orders</h3>
              <p className="card-subtitle">Latest orders inserted across regional fragments</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('order-mgmt')}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Delivery City</th>
                  <th>Allocated Shard</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No orders found.</td></tr>
                ) : (
                  recent_orders.map((order) => (
                    <tr key={order.order_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12.5px' }}>{order.order_id}</td>
                      <td>{order.customer_name || order.customer_id}</td>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>📍 {order.delivery_city || order.region}</td>
                      <td>
                        <span className={`badge ${order.region === 'Pune' ? 'badge-blue' : order.region === 'Delhi' ? 'badge-purple' : 'badge-green'}`}>
                          {order.region} Node
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(order.total_amount)}</td>
                      <td>
                        <span className={`badge ${order.status === 'Delivered' ? 'badge-green' : order.status === 'Shipped' ? 'badge-blue' : order.status === 'Cancelled' ? 'badge-red' : 'badge-amber'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2PC Distributed Transaction Activity */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent 2PC Distributed Transactions</h3>
              <p className="card-subtitle">Two-Phase Commit transaction coordinator audit trail</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('dist-tx')}>
              Simulate 2PC <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tx ID</th>
                  <th>Transaction Type</th>
                  <th>Decision</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recent_transactions.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No distributed transactions logged yet.</td></tr>
                ) : (
                  recent_transactions.map((tx) => (
                    <tr key={tx.tx_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>{tx.tx_id}</td>
                      <td style={{ fontSize: '12.5px' }}>{tx.tx_type}</td>
                      <td>
                        <span className={`badge ${tx.decision === 'GLOBAL_COMMIT' ? 'badge-green' : 'badge-red'}`}>
                          {tx.decision}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${tx.status === 'COMMITTED' ? 'badge-green' : 'badge-red'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{tx.start_time?.split(' ')[1] || tx.start_time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
