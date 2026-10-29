import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { RotateCcw, AlertOctagon, CheckCircle2, ShieldCheck, Clock, Server, ArrowRight } from 'lucide-react';

export default function TransactionRecovery() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulatingCrash, setSimulatingCrash] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [crashResult, setCrashResult] = useState(null);
  const [recoveryResult, setRecoveryResult] = useState(null);

  const [failedNode, setFailedNode] = useState('Pune-Node');

  const loadRecoveryLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getRecoveryLogs(20);
      setLogs(res.recovery_logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecoveryLogs();
  }, []);

  const handleSimulateCrash = async () => {
    try {
      setSimulatingCrash(true);
      setRecoveryResult(null);

      // Execute a 2PC transaction where the target node votes COMMIT, but crashes right before receiving coordinator decision!
      const res = await api.execute2PC({
        tx_type: 'ORDER_FULFILLMENT_DISTRIBUTED',
        details: `Simulated crash: ${failedNode} voted READY and crashed immediately before receiving decision`,
        simulate_crash_participant: failedNode,
        participant_votes: {
          'Pune-Node': 'VOTE_COMMIT',
          'Delhi-Node': 'VOTE_COMMIT',
          'Chennai-Node': 'VOTE_COMMIT',
        }
      });

      setCrashResult(res);
      loadRecoveryLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingCrash(false);
    }
  };

  const handleTriggerRecovery = async () => {
    try {
      setRecovering(true);
      const res = await api.recoverParticipant({
        participant: failedNode,
        tx_id: crashResult?.tx_id,
      });

      setRecoveryResult(res);
      loadRecoveryLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div>
      {/* Theory Banner */}
      <div className="theory-banner">
        <div className="theory-title">
          <RotateCcw size={18} /> In-Doubt Window & 2PC Recovery Protocol (Simulation)
        </div>
        <p className="theory-desc">
          <strong>The "In-Doubt" Problem:</strong> When a participant node votes <code>VOTE_COMMIT</code> (writing <code>&lt;READY&gt;</code> to its WAL),
          it surrenders autonomy. If the participant crashes before receiving the Coordinator's decision, it cannot unilaterally commit or abort upon reboot.
          <strong>Recovery Protocol:</strong> Upon reboot, the participant scans its WAL, finds the uncommitted <code>READY</code> record,
          contacts the Coordinator's persistent log, discovers whether <code>GLOBAL_COMMIT</code> or <code>GLOBAL_ABORT</code> was chosen,
          applies the resolution, and releases local locks.
        </p>
      </div>

      {/* Failure Simulation Bench */}
      <div className="grid-2">
        {/* Step 1: Simulate Crash */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <AlertOctagon size={18} color="#dc2626" /> Step 1: Inject Participant Crash in READY State
              </h3>
              <p className="card-subtitle">Force node failure during the vulnerable in-doubt window</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Target Node to Crash</label>
            <select
              className="form-control"
              value={failedNode}
              onChange={(e) => setFailedNode(e.target.value)}
            >
              <option value="Pune-Node">Pune-Node (pune_site.db)</option>
              <option value="Delhi-Node">Delhi-Node (delhi_site.db)</option>
              <option value="Chennai-Node">Chennai-Node (chennai_site.db)</option>
            </select>
          </div>

          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '18px', lineHeight: 1.6 }}>
            The target node will write <code>&lt;READY&gt;</code> to local WAL, vote <code>COMMIT</code>, and immediately simulate a hardware/power failure.
            The Coordinator will log <code>GLOBAL_COMMIT</code>, but the crashed node remains stuck in <code>CRASHED_IN_DOUBT</code>.
          </p>

          <button
            className="btn btn-danger"
            onClick={handleSimulateCrash}
            disabled={simulatingCrash}
          >
            <AlertOctagon size={14} />
            {simulatingCrash ? 'Triggering Failure...' : `Crash ${failedNode} in READY State`}
          </button>
        </div>

        {/* Step 2: Trigger Recovery Protocol */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <ShieldCheck size={18} color="#059669" /> Step 2: Execute Node Recovery Protocol
              </h3>
              <p className="card-subtitle">Restart failed node and resolve in-doubt state via coordinator WAL</p>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '18px', lineHeight: 1.6 }}>
            The recovered node reboots, detects that its transaction is in the <code>READY</code> state,
            consults the Coordinator's persistent transaction log, retrieves the recorded decision,
            updates its state to <code>COMMITTED</code>, releases all locks, and writes a recovery log.
          </p>

          <button
            className="btn btn-success"
            onClick={handleTriggerRecovery}
            disabled={recovering}
          >
            <RotateCcw size={14} className={recovering ? 'animate-spin' : ''} />
            {recovering ? 'Consulting Coordinator WAL...' : `Run Recovery Protocol for ${failedNode}`}
          </button>
        </div>
      </div>

      {/* Crash / Recovery State Feedback Box */}
      {(crashResult || recoveryResult) && (
        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="card-header">
            <h3 className="card-title">Failure & Recovery Execution Audit</h3>
          </div>

          {crashResult && (
            <div style={{ marginBottom: '14px', padding: '12px 16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>
                Failure Triggered: Transaction {crashResult.tx_id}
              </div>
              <div style={{ fontSize: '12.5px', color: '#7f1d1d', marginTop: '4px' }}>
                Participant <strong>{failedNode}</strong> crashed after voting READY. Coordinator logged decision: <strong>{crashResult.decision}</strong>.
                Target node is currently <code>CRASHED_IN_DOUBT</code>.
              </div>
            </div>
          )}

          {recoveryResult && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#065f46' }}>
                Recovery Completed for {recoveryResult.participant}
              </div>
              <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '4px' }}>
                {recoveryResult.message}
              </div>
              <div style={{ fontSize: '12px', color: '#065f46', marginTop: '6px' }}>
                Resolved State: <strong>{recoveryResult.resolved_state}</strong> &bull; Coordinator Decision Found: <strong>{recoveryResult.decision_found}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recovery Audit Log Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Transaction Recovery Audit Trail</h3>
            <p className="card-subtitle">Persistent logs from recovery_logs relation</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Global Tx ID</th>
                <th>Participant Node</th>
                <th>Failure Classification</th>
                <th>Recovery Protocol Action</th>
                <th>Resolved State</th>
                <th>Logged At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading recovery logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No recovery events logged yet.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.log_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{l.log_id}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{l.tx_id}</td>
                    <td><strong>{l.participant}</strong></td>
                    <td>
                      <span className="badge badge-amber">{l.failure_type}</span>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>{l.recovery_action}</td>
                    <td>
                      <span className={`badge ${l.resolved_state === 'COMMITTED' ? 'badge-green' : l.resolved_state === 'ABORTED' ? 'badge-red' : 'badge-purple'}`}>
                        {l.resolved_state}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{l.logged_at}</td>
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
