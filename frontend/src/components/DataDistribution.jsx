import React, { useState } from 'react';
import { api } from '../api';
import { Network, HelpCircle, Play, Hash, ArrowRightLeft, Sliders, CheckCircle2 } from 'lucide-react';

export default function DataDistribution() {
  // Simulator State
  const [strategy, setStrategy] = useState('range');
  const [rangeInput, setRangeInput] = useState('45000');
  const [hashInput, setHashInput] = useState('ORD-PUN-00101');
  const [rrCounter, setRrCounter] = useState(1);
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      let val = rangeInput;
      if (strategy === 'hash') val = hashInput;
      if (strategy === 'round_robin') val = rrCounter;

      const res = await api.simulatePartitioning({
        strategy,
        value: val,
        sequence_number: rrCounter,
      });
      setSimResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleNextRR = async () => {
    const nextVal = rrCounter + 1;
    setRrCounter(nextVal);
    try {
      const res = await api.simulatePartitioning({
        strategy: 'round_robin',
        sequence_number: nextVal,
      });
      setSimResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Educational Banner */}
      <div className="theory-banner">
        <div className="theory-title">
          <Network size={18} /> Horizontal Data Fragmentation in this E-Commerce System
        </div>
        <p className="theory-desc">
          <strong>Actual Strategy Used:</strong> Primary Horizontal Fragmentation based on the regional predicate <code>region ∈ {'{Pune, Delhi, Chennai}'}</code>.
          Each fragment satisfies completeness, reconstruction, and disjointness rules (Codd's Distributed DB Axioms).
          Below, you can inspect this system's architecture and test conceptual partitioning algorithms used in distributed databases.
        </p>
      </div>

      {/* Actual Application Strategy Breakdown */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">1. Production Strategy: Primary Horizontal Fragmentation by Region</h3>
            <p className="card-subtitle">Relational fragmentation rules enforced in this application</p>
          </div>
          <span className="badge badge-green">Production Active</span>
        </div>

        <div className="grid-3" style={{ marginBottom: 0 }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-blue">Fragment 1</span>
              <strong style={{ fontSize: '14px' }}>Pune Regional Site</strong>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
              <div><strong>Selection Predicate:</strong> <code>σ[region = 'Pune'](ORDERS)</code></div>
              <div><strong>Table Name:</strong> <code>orders_pune</code></div>
              <div><strong>Storage:</strong> Pune Node DB</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-purple">Fragment 2</span>
              <strong style={{ fontSize: '14px' }}>Delhi Regional Site</strong>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
              <div><strong>Selection Predicate:</strong> <code>σ[region = 'Delhi'](ORDERS)</code></div>
              <div><strong>Table Name:</strong> <code>orders_delhi</code></div>
              <div><strong>Storage:</strong> Delhi Node DB</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-green">Fragment 3</span>
              <strong style={{ fontSize: '14px' }}>Chennai Regional Site</strong>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
              <div><strong>Selection Predicate:</strong> <code>σ[region = 'Chennai'](ORDERS)</code></div>
              <div><strong>Table Name:</strong> <code>orders_chennai</code></div>
              <div><strong>Storage:</strong> Chennai Node DB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Conceptual Demonstrator */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Sliders size={18} color="#2563eb" /> 2. Conceptual Partitioning Strategies Demonstrator
            </h3>
            <p className="card-subtitle">
              Interactive test bench comparing Range, Hash, and Round-Robin data distribution techniques
            </p>
          </div>
          <span className="badge badge-amber">Interactive Conceptual Simulator</span>
        </div>

        {/* Strategy Selector */}
        <div className="tab-list" style={{ maxWidth: '600px', marginBottom: '18px' }}>
          <button
            className={`tab-btn ${strategy === 'range' ? 'active' : ''}`}
            onClick={() => { setStrategy('range'); setSimResult(null); }}
          >
            Range Partitioning
          </button>
          <button
            className={`tab-btn ${strategy === 'hash' ? 'active' : ''}`}
            onClick={() => { setStrategy('hash'); setSimResult(null); }}
          >
            Hash Partitioning
          </button>
          <button
            className={`tab-btn ${strategy === 'round_robin' ? 'active' : ''}`}
            onClick={() => { setStrategy('round_robin'); setSimResult(null); }}
          >
            Round-Robin
          </button>
        </div>

        {/* Input Controls */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          {strategy === 'range' && (
            <div>
              <label className="form-label">Test Order Amount (₹)</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="number"
                  className="form-control"
                  style={{ maxWidth: '300px' }}
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 50000"
                />
                <button className="btn btn-primary" onClick={handleSimulate} disabled={simulating}>
                  <Play size={14} /> Calculate Range Target
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Defined ranges: Tier 1 (&lt; ₹20k), Tier 2 (₹20k - ₹100k), Tier 3 (&gt; ₹100k).
              </div>
            </div>
          )}

          {strategy === 'hash' && (
            <div>
              <label className="form-label">Test Shard Key (e.g., Order ID or Customer ID)</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: '350px' }}
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  placeholder="e.g. ORD-109"
                />
                <button className="btn btn-primary" onClick={handleSimulate} disabled={simulating}>
                  <Hash size={14} /> Compute Hash Target
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Hash function: <code>MD5(key) % 3</code> distributed evenly across 3 storage nodes.
              </div>
            </div>
          )}

          {strategy === 'round_robin' && (
            <div>
              <label className="form-label">Incoming Tuple Sequence Number: <strong>#{rrCounter}</strong></label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={handleNextRR}>
                  <ArrowRightLeft size={14} /> Send Next Tuple (#{rrCounter + 1})
                </button>
                <button className="btn btn-secondary" onClick={() => { setRrCounter(1); setSimResult(null); }}>
                  Reset Sequence
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Formula: <code>tuple_id % N_nodes</code> cycles sequentially through nodes.
              </div>
            </div>
          )}
        </div>

        {/* Simulation Output */}
        {simResult && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '18px 22px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '8px' }}>
              Simulation Output: {simResult.strategy}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Assigned Partition Target:</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  {simResult.assigned_partition}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Mathematical Rule Applied:</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {simResult.rule || simResult.modulo_result}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '10px', borderTop: '1px solid #dbeafe', paddingTop: '8px' }}>
              <strong>DBMS Insight:</strong> {simResult.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Matrix */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">3. Partitioning Strategies Comparison Matrix</h3>
            <p className="card-subtitle">Trade-offs between different data fragmentation architectures</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Partitioning Criterion</th>
                <th>Predicate Pruning Advantage</th>
                <th>Load Balancing Ability</th>
                <th>Suitability in this E-Commerce System</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f0fdf4' }}>
                <td style={{ fontWeight: 700, color: '#047857' }}>Primary Horizontal by Region</td>
                <td>Domain expression (<code>region = X</code>)</td>
                <td>High (Queries for Pune only scan Pune node)</td>
                <td>Varies by regional market size</td>
                <td><strong>Selected:</strong> Aligns with local shipping and regulatory data locality</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Range Partitioning</td>
                <td>Continuous value ranges (e.g. order date)</td>
                <td>High for range queries (e.g. date range scans)</td>
                <td>Can suffer from data skew (hot partitions)</td>
                <td>Excellent for historical time-series order archiving</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Hash Partitioning</td>
                <td><code>hash(key) % N</code></td>
                <td>Good for point lookups (<code>WHERE id = X</code>)</td>
                <td>Uniform tuple distribution</td>
                <td>Ideal for customer account distribution without regional affinity</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Round-Robin</td>
                <td>Strict cyclical sequence assignment</td>
                <td>Zero (Must scan all nodes for any query)</td>
                <td>Perfect tuple count balance</td>
                <td>Used for batch data loading, not optimal for selective queries</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
