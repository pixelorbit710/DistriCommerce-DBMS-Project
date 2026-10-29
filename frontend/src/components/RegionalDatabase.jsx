import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Database, Server, Code, Layers, FileText, CheckCircle2 } from 'lucide-react';

export default function RegionalDatabase() {
  const [activeSite, setActiveSite] = useState('Pune');
  const [siteData, setSiteData] = useState(null);
  const [globalQueryInfo, setGlobalQueryInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSiteOrders = async (site) => {
    try {
      setLoading(true);
      const [siteRes, globalRes] = await Promise.all([
        api.getRegionalOrders(site),
        api.getGlobalQueryInfo()
      ]);
      setSiteData(siteRes);
      setGlobalQueryInfo(globalRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSiteOrders(activeSite);
  }, [activeSite]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div>
      {/* Theory Banner */}
      <div className="theory-banner">
        <div className="theory-title">
          <Layers size={18} /> Logical & Physical Regional Database Nodes
        </div>
        <p className="theory-desc">
          In distributed database management, data locality ensures high transaction throughput and minimal network latency.
          Orders originating in <strong>Pune</strong> are stored at the Pune Node, <strong>Delhi</strong> orders at Delhi, and <strong>Chennai</strong> at Chennai.
          Each node owns its local fragment exclusively. The global relation is reconstructed via <code>UNION ALL</code>.
        </p>
      </div>

      {/* Site Tabs */}
      <div className="tab-list">
        {['Pune', 'Delhi', 'Chennai', 'Global_Reconstruction'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeSite === tab ? 'active' : ''}`}
            onClick={() => setActiveSite(tab)}
          >
            {tab === 'Global_Reconstruction' ? '🌐 Global UNION ALL Reconstruction' : `📍 ${tab} Regional Site`}
          </button>
        ))}
      </div>

      {activeSite === 'Global_Reconstruction' ? (
        /* Global Reconstruction View */
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Code size={18} color="#2563eb" /> Relational Reconstruction Algebra & SQL
                </h3>
                <p className="card-subtitle">
                  Formula: <code>ORDERS = orders_pune ∪ orders_delhi ∪ orders_chennai</code>
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Reconstruction Query Executed:
              </div>
              <pre className="code-box">{globalQueryInfo?.sql_query || 'Loading SQL query...'}</pre>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>
              <strong>Why <code>UNION ALL</code> instead of <code>UNION</code>?</strong>
              <p style={{ marginTop: '4px' }}>
                In horizontal fragmentation, disjointness guarantees that no tuple belongs to more than one fragment
                (i.e., <code>orders_pune ∩ orders_delhi = ∅</code>). Because fragments are disjoint by definition of the regional predicate,
                expensive sorting and duplicate-elimination passes (required by standard <code>UNION</code>) are unnecessary.
                Hence, distributed query optimizers reconstruct relations using <strong><code>UNION ALL</code></strong> for maximum efficiency.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Individual Regional Site View */
        <div>
          {/* Site Metadata & Raw Query */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Database size={18} color="#2563eb" /> {activeSite} Regional Fragment Metadata
                </h3>
                <p className="card-subtitle">Physical partition stored in {siteData?.database_file}</p>
              </div>
              <span className="badge badge-blue">
                Node Status: Online & Serving Reads/Writes
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', marginBottom: '18px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Fragment Table</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '15px' }}>{siteData?.fragment_table}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Fragment Record Count</div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a' }}>{siteData?.count || 0} Orders</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Primary Predicate Constraint</div>
                <div style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>CHECK (region = '{activeSite}')</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Direct Fragment Query:
              </div>
              <pre className="code-box">{siteData?.query_executed}</pre>
            </div>
          </div>

          {/* Regional Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Records Residing Exclusively in {activeSite} Node</h3>
                <p className="card-subtitle">Local orders isolated from other regional traffic</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Order Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Querying {activeSite} regional node...</td></tr>
                  ) : !siteData?.orders || siteData.orders.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No records in {activeSite} fragment.</td></tr>
                  ) : (
                    siteData.orders.map((o) => (
                      <tr key={o.order_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{o.order_id}</td>
                        <td>{o.customer_name} ({o.customer_id})</td>
                        <td>{o.product_name}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{o.quantity}</td>
                        <td>{formatCurrency(o.unit_price)}</td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(o.total_amount)}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{o.order_date}</td>
                        <td>
                          <span className={`badge ${o.status === 'Delivered' ? 'badge-green' : o.status === 'Shipped' ? 'badge-blue' : 'badge-amber'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
