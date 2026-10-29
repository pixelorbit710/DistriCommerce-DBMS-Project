import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Zap, Play, Clock, ArrowRight, Layers, BarChart2, CheckCircle2 } from 'lucide-react';

export default function ParallelQuery() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const runParallelQuery = async () => {
    try {
      setRunning(true);
      const res = await api.getParallelSales();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    runParallelQuery();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const partials = data?.regional_partial_aggregates || {};
  const combined = data?.combined_final_aggregates || [];
  const theory = data?.theory || {};

  return (
    <div>
      {/* Educational Banner */}
      <div className="theory-banner">
        <div className="theory-title">
          <Zap size={18} /> Intraoperation Parallel Query Processing
        </div>
        <p className="theory-desc">
          When executing <code>SELECT product_id, SUM(total_amount) FROM orders_global GROUP BY product_id</code>,
          the coordinator decomposes the aggregation query into independent subqueries and dispatches them concurrently
          to each regional partition node (Pune, Delhi, Chennai). Regional partial sums are computed simultaneously,
          then merged at the coordinator node.
        </p>
      </div>

      {/* Execution Benchmark Bar */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Multithreaded Concurrent Execution Benchmark
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Engine: <code>concurrent.futures.ThreadPoolExecutor(max_workers=3)</code>
            </p>
          </div>

          <button className="btn btn-primary" onClick={runParallelQuery} disabled={running}>
            <Play size={14} className={running ? 'animate-spin' : ''} />
            {running ? 'Executing Across 3 Threads...' : 'Re-Run Parallel Execution'}
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid-3" style={{ marginTop: '20px', marginBottom: 0 }}>
          <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>
              Parallel Execution (3 Worker Threads)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
              {data?.parallel_duration_ms || 0} ms
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>Simultaneous regional scans</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Sequential Scan Baseline
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#475569', marginTop: '2px' }}>
              {data?.sequential_duration_ms || 0} ms
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Pune then Delhi then Chennai</div>
          </div>

          <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '11px', color: '#065f46', textTransform: 'uppercase', fontWeight: 700 }}>
              Query Speedup Ratio
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {data?.speedup_ratio || 1.0}x
            </div>
            <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>Throughput enhancement</div>
          </div>
        </div>
      </div>

      {/* Regional Partial Aggregates vs Merged Final Result */}
      <div className="grid-2">
        {/* Regional Partial Aggregates */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">1. Regional Partial Aggregates (Worker Threads)</h3>
              <p className="card-subtitle">Sub-results computed independently by each regional node</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {['Pune', 'Delhi', 'Chennai'].map((reg) => {
              const res = partials[reg] || { total_regional_orders: 0, total_regional_sales: 0, execution_time_ms: 0 };
              const badgeClass = reg === 'Pune' ? 'badge-blue' : reg === 'Delhi' ? 'badge-purple' : 'badge-green';

              return (
                <div key={reg} style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${badgeClass}`}>{reg} Node</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Thread Execution: {res.execution_time_ms} ms</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                      {formatCurrency(res.total_regional_sales)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Orders Scanned Locally: <strong>{res.total_regional_orders}</strong> &bull; Subquery: <code>SELECT product_id, SUM(amt) FROM orders_{reg.toLowerCase()}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Combined Final Aggregates */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">2. Final Merged Global Aggregate (Coordinator)</h3>
              <p className="card-subtitle">Total sales per product merged from all partial aggregates</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Total Sold</th>
                  <th>Gross Sales</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Aggregating...</td></tr>
                ) : combined.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>No sales data.</td></tr>
                ) : (
                  combined.map((item) => (
                    <tr key={item.product_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.product_id}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.total_quantity}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.total_sales)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Parallelism Theory Reference Cards */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Layers size={18} color="#2563eb" /> Parallel Database Taxonomy & DBMS Principles
            </h3>
            <p className="card-subtitle">
              Comprehensive conceptual guide mapping DBMS theory to this implementation
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 0 }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
              1. Interquery Parallelism
            </h4>
            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
              {theory.interquery?.description}
            </p>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Example:</strong> {theory.interquery?.example}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
              2. Intraquery Parallelism
            </h4>
            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
              {theory.intraquery?.description}
            </p>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Example:</strong> {theory.intraquery?.example}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
              3. Intraoperation Parallelism (This Demo)
            </h4>
            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
              {theory.intraoperation?.description}
            </p>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Example:</strong> {theory.intraoperation?.example}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
              4. Interoperation Parallelism (Pipelining)
            </h4>
            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
              {theory.interoperation?.description}
            </p>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Example:</strong> {theory.interoperation?.example}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
