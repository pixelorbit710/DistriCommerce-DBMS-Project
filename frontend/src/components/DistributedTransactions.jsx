import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { GitMerge, Play, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Clock, ShieldAlert } from 'lucide-react';

export default function DistributedTransactions({ onTransactionExecuted }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [txResult, setTxResult] = useState(null);

  // Scenario selection
  const [scenario, setScenario] = useState('unanimous_commit');
  const [customVotes, setCustomVotes] = useState({
    'Pune-Node': 'VOTE_COMMIT',
    'Delhi-Node': 'VOTE_COMMIT',
    'Chennai-Node': 'VOTE_COMMIT',
  });

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get2PCTransactions(15);
      setHistory(res.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleExecute2PC = async () => {
    try {
      setExecuting(true);
      let votes = { ...customVotes };
      let txType = 'CROSS_REGION_STOCK_TRANSFER';
      let details = 'Simulated multi-site inventory transfer';

      if (scenario === 'unanimous_commit') {
        votes = {
          'Pune-Node': 'VOTE_COMMIT',
          'Delhi-Node': 'VOTE_COMMIT',
          'Chennai-Node': 'VOTE_COMMIT',
        };
        txType = 'MULTI_REGION_ORDER_COMMIT';
        details = 'Normal distributed transaction: All 3 participants vote COMMIT';
      } else if (scenario === 'delhi_abort') {
        votes = {
          'Pune-Node': 'VOTE_COMMIT',
          'Delhi-Node': 'VOTE_ABORT',
          'Chennai-Node': 'VOTE_COMMIT',
        };
        txType = 'STOCK_RESERVATION_FAILURE';
        details = 'Participant Delhi-Node votes ABORT due to local inventory constraint conflict';
      }

      const res = await api.execute2PC({
        tx_type: txType,
        details,
        participant_votes: votes,
      });

      setTxResult(res);
      loadHistory();
      if (onTransactionExecuted) onTransactionExecuted();
    } catch (err) {
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div>
      {/* Theory Banner */}
      <div className="theory-banner">
        <div className="theory-title">
          <GitMerge size={18} /> Two-Phase Commit Protocol (2PC) Distributed Atomicity Engine
        </div>
        <p className="theory-desc">
          In a distributed transaction spanning multiple autonomous nodes, 2PC ensures the ACID property of <strong>Atomicity</strong> (All-or-Nothing).
          <strong>Phase 1 (Prepare):</strong> The Coordinator asks participants to prepare and vote.
          <strong>Phase 2 (Commit/Abort):</strong> If and only if ALL participants vote <code>COMMIT</code>, the Coordinator logs <code>GLOBAL_COMMIT</code>.
          If even a single participant votes <code>ABORT</code> (or crashes), the Coordinator writes <code>GLOBAL_ABORT</code> and rolls back all nodes.
        </p>
      </div>

      {/* Simulator Control Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Interactive 2PC Scenario Simulator</h3>
            <p className="card-subtitle">Select a distributed transaction case to execute through the 2PC engine</p>
          </div>
          <span className="badge badge-blue">Persistent WAL Active</span>
        </div>

        <div className="grid-3" style={{ marginBottom: '20px' }}>
          <div
            onClick={() => setScenario('unanimous_commit')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: `2px solid ${scenario === 'unanimous_commit' ? '#2563eb' : '#e2e8f0'}`,
              background: scenario === 'unanimous_commit' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <CheckCircle2 size={18} color="#059669" />
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Case A: Unanimous Commit</strong>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              Pune, Delhi, and Chennai all return <code>VOTE_COMMIT</code>. Coordinator commits globally.
            </p>
          </div>

          <div
            onClick={() => setScenario('delhi_abort')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: `2px solid ${scenario === 'delhi_abort' ? '#ef4444' : '#e2e8f0'}`,
              background: scenario === 'delhi_abort' ? '#fef2f2' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <XCircle size={18} color="#dc2626" />
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Case B: Participant Abort</strong>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              Delhi encounters stock failure and votes <code>VOTE_ABORT</code>. Coordinator forces Global Abort!
            </p>
          </div>

          <div
            onClick={() => setScenario('custom')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: `2px solid ${scenario === 'custom' ? '#8b5cf6' : '#e2e8f0'}`,
              background: scenario === 'custom' ? '#f5f3ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <ShieldAlert size={18} color="#7c3aed" />
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Case C: Custom Vote Matrix</strong>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              Configure specific participant votes individually to test edge conditions.
            </p>
          </div>
        </div>

        {scenario === 'custom' && (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Participant Vote Configuration:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              {['Pune-Node', 'Delhi-Node', 'Chennai-Node'].map((node) => (
                <div key={node}>
                  <label className="form-label" style={{ fontSize: '12px' }}>{node}</label>
                  <select
                    className="form-control"
                    value={customVotes[node]}
                    onChange={(e) => setCustomVotes({ ...customVotes, [node]: e.target.value })}
                  >
                    <option value="VOTE_COMMIT">VOTE_COMMIT (Ready)</option>
                    <option value="VOTE_ABORT">VOTE_ABORT (Abort)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleExecute2PC} disabled={executing}>
            <Play size={14} className={executing ? 'animate-spin' : ''} />
            {executing ? 'Coordinating 2PC Across Nodes...' : 'Execute 2-Phase Commit'}
          </button>
        </div>
      </div>

      {/* Real-Time Execution Timeline */}
      {txResult && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                Transaction Execution Log: {txResult.tx_id}
              </h3>
              <p className="card-subtitle">
                Outcome: <strong style={{ color: txResult.decision === 'GLOBAL_COMMIT' ? '#059669' : '#dc2626' }}>{txResult.decision}</strong> &bull; Status: <strong>{txResult.status}</strong>
              </p>
            </div>
            <span className={`badge ${txResult.decision === 'GLOBAL_COMMIT' ? 'badge-green' : 'badge-red'}`}>
              {txResult.decision}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {txResult.events?.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: ev.action.includes('ABORT') ? '#fef2f2' : ev.action.includes('COMMIT') ? '#ecfdf5' : '#f8fafc',
                  border: `1px solid ${ev.action.includes('ABORT') ? '#fecaca' : ev.action.includes('COMMIT') ? '#a7f3d0' : '#e2e8f0'}`
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  Step {ev.step}
                </span>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{ev.actor}</strong>
                    <span className="badge badge-gray" style={{ fontSize: '11px' }}>{ev.action}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>{ev.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#334155', marginTop: '3px' }}>{ev.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistent 2PC Transaction Log Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Persistent 2PC Transaction History (WAL)</h3>
            <p className="card-subtitle">Direct records from distributed_transactions & participant_votes tables</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Global Tx ID</th>
                <th>Type / Intent</th>
                <th>Participant Votes</th>
                <th>Decision</th>
                <th>Final State</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading transaction history...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No transactions recorded.</td></tr>
              ) : (
                history.map((tx) => (
                  <tr key={tx.tx_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12.5px' }}>{tx.tx_id}</td>
                    <td style={{ fontSize: '13px' }}>{tx.tx_type}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {tx.participant_votes?.map((v) => (
                          <span
                            key={v.participant}
                            className={`badge ${v.vote === 'VOTE_COMMIT' ? 'badge-green' : 'badge-red'}`}
                            style={{ fontSize: '10.5px' }}
                          >
                            {v.participant.replace('-Node', '')}: {v.vote === 'VOTE_COMMIT' ? 'YES' : 'NO'}
                          </span>
                        ))}
                      </div>
                    </td>
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
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{tx.start_time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
