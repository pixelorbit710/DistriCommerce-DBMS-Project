import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from database import get_sqlite_conn, get_pg_connection, USE_POSTGRES, CENTRAL_DB_PATH

PARTICIPANTS = ["Pune-Node", "Delhi-Node", "Chennai-Node"]

class TwoPhaseCommitCoordinator:
    """
    Two-Phase Commit (2PC) Protocol Coordinator & Transaction Recovery Engine.
    Implements:
    - Phase 1: Voting (PREPARE -> VOTE_COMMIT or VOTE_ABORT)
    - Phase 2: Decision (GLOBAL_COMMIT or GLOBAL_ABORT -> ACK)
    - Persistent WAL & transaction logging
    - In-Doubt State Failure & Recovery Protocol
    """

    @staticmethod
    def execute_2pc(
        tx_type: str,
        details: str,
        participant_votes: Optional[Dict[str, str]] = None,
        simulate_crash_participant: Optional[str] = None
    ) -> Dict[str, Any]:
        tx_id = f"GTX-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        events = []

        # Step 1: Coordinator Initialization
        events.append({
            "step": 1,
            "phase": "PREPARE_PHASE",
            "actor": "Central-Coordinator",
            "action": "TX_INIT",
            "message": f"Coordinator initialized Global Transaction {tx_id} [{tx_type}]. Registered participants: {', '.join(PARTICIPANTS)}.",
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
        })

        # Step 2: Phase 1 Broadcast PREPARE
        events.append({
            "step": 2,
            "phase": "PREPARE_PHASE",
            "actor": "Central-Coordinator",
            "action": "SEND_PREPARE",
            "message": f"Coordinator writes <START_2PC {tx_id}> to WAL and broadcasts PREPARE to all participants.",
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
        })

        # Step 3: Participants Vote
        votes = {}
        all_commit = True
        default_votes = participant_votes or {p: "VOTE_COMMIT" for p in PARTICIPANTS}

        for p in PARTICIPANTS:
            vote = default_votes.get(p, "VOTE_COMMIT")
            votes[p] = vote
            if vote != "VOTE_COMMIT":
                all_commit = False
                events.append({
                    "step": 3,
                    "phase": "PREPARE_PHASE",
                    "actor": p,
                    "action": "VOTE_ABORT",
                    "message": f"Participant {p} checks local resource locks/constraints and votes VOTE_ABORT.",
                    "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
                })
            else:
                events.append({
                    "step": 3,
                    "phase": "PREPARE_PHASE",
                    "actor": p,
                    "action": "VOTE_COMMIT",
                    "message": f"Participant {p} locks local records, writes <READY {tx_id}> to local WAL, and votes VOTE_COMMIT.",
                    "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
                })

        # Simulated participant failure during in-doubt window
        if simulate_crash_participant and simulate_crash_participant in PARTICIPANTS:
            events.append({
                "step": 4,
                "phase": "FAILURE_EVENT",
                "actor": simulate_crash_participant,
                "action": "NODE_CRASH",
                "message": f"CRITICAL: Participant {simulate_crash_participant} CRASHED immediately after writing READY and before receiving Coordinator decision! Node entered IN-DOUBT state.",
                "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
            })

        # Step 4: Coordinator Decision
        decision = "GLOBAL_COMMIT" if all_commit else "GLOBAL_ABORT"
        status = "COMMITTED" if all_commit else "ABORTED"
        end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        events.append({
            "step": 5,
            "phase": "DECISION_PHASE",
            "actor": "Central-Coordinator",
            "action": decision,
            "message": (
                f"Coordinator received all votes. Unanimous COMMIT? {all_commit}. "
                f"Coordinator writes <{decision} {tx_id}> to persistent WAL and broadcasts decision to participants."
            ),
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
        })

        # Step 5: Phase 2 Execution & Participant ACKs
        for p in PARTICIPANTS:
            if simulate_crash_participant and p == simulate_crash_participant:
                events.append({
                    "step": 6,
                    "phase": "DECISION_PHASE",
                    "actor": p,
                    "action": "OFFLINE_UNREACHABLE",
                    "message": f"Participant {p} is currently OFFLINE/CRASHED. Decision cannot be delivered. Locks remain held.",
                    "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
                })
                continue

            ack_action = "ACK_COMMIT" if decision == "GLOBAL_COMMIT" else "ACK_ABORT"
            p_final_state = "COMMITTED" if decision == "GLOBAL_COMMIT" else "ABORTED"
            events.append({
                "step": 6,
                "phase": "DECISION_PHASE",
                "actor": p,
                "action": ack_action,
                "message": f"Participant {p} applies {decision}, writes <{p_final_state} {tx_id}> to local log, releases locks, and replies {ack_action}.",
                "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
            })

        # Step 6: End of Transaction
        events.append({
            "step": 7,
            "phase": "COMPLETION",
            "actor": "Central-Coordinator",
            "action": "TX_END",
            "message": f"Coordinator writes <END_2PC {tx_id}> to WAL. Global transaction completed with status {status}.",
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3]
        })

        # Persist transaction into database
        TwoPhaseCommitCoordinator._persist_transaction(
            tx_id=tx_id,
            tx_type=tx_type,
            status=status,
            decision=decision,
            start_time=start_time,
            end_time=end_time,
            details=details,
            votes=votes,
            simulate_crash_participant=simulate_crash_participant
        )

        return {
            "tx_id": tx_id,
            "tx_type": tx_type,
            "status": status,
            "decision": decision,
            "start_time": start_time,
            "end_time": end_time,
            "details": details,
            "votes": votes,
            "in_doubt_participant": simulate_crash_participant,
            "events": events
        }

    @staticmethod
    def _persist_transaction(tx_id, tx_type, status, decision, start_time, end_time, details, votes, simulate_crash_participant=None):
        if USE_POSTGRES:
            conn = get_pg_connection()
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO distributed_transactions (tx_id, tx_type, coordinator, status, decision, start_time, end_time, details)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (tx_id, tx_type, "Central-Coordinator", status, decision, start_time, end_time, details))
                
                for p, vote in votes.items():
                    if simulate_crash_participant and p == simulate_crash_participant:
                        state = "CRASHED_IN_DOUBT"
                    else:
                        state = "COMMITTED" if decision == "GLOBAL_COMMIT" else "ABORTED"
                    cur.execute("""
                        INSERT INTO participant_votes (tx_id, participant, vote, state, vote_timestamp)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (tx_id, p, vote, state, end_time))
                conn.commit()
                cur.close()
            finally:
                conn.close()
        else:
            conn = get_sqlite_conn(CENTRAL_DB_PATH)
            try:
                conn.execute("""
                    INSERT INTO distributed_transactions (tx_id, tx_type, coordinator, status, decision, start_time, end_time, details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (tx_id, tx_type, "Central-Coordinator", status, decision, start_time, end_time, details))
                
                for p, vote in votes.items():
                    if simulate_crash_participant and p == simulate_crash_participant:
                        state = "CRASHED_IN_DOUBT"
                    else:
                        state = "COMMITTED" if decision == "GLOBAL_COMMIT" else "ABORTED"
                    conn.execute("""
                        INSERT INTO participant_votes (tx_id, participant, vote, state, vote_timestamp)
                        VALUES (?, ?, ?, ?, ?)
                    """, (tx_id, p, vote, state, end_time))
                conn.commit()
            finally:
                conn.close()

    @staticmethod
    def recover_participant(participant: str, tx_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes the Transaction Recovery Protocol for a failed/in-doubt participant:
        1. Participant restarts and inspects its local Write-Ahead Log.
        2. Detects an in-doubt transaction (voted READY, but no local COMMIT or ABORT record).
        3. Queries the Coordinator's persistent WAL for the global decision.
        4. If Coordinator decision exists, applies it and transitions state.
        5. If Coordinator decision does not exist, marks as BLOCKED (does not guess decision).
        6. Logs recovery to recovery_logs.
        """
        recovery_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Find latest transaction for this participant that needs recovery
        conn = get_pg_connection() if USE_POSTGRES else get_sqlite_conn(CENTRAL_DB_PATH)
        try:
            target_tx_id = tx_id
            if not target_tx_id:
                if USE_POSTGRES:
                    cur = conn.cursor()
                    cur.execute("""
                        SELECT tx_id FROM participant_votes
                        WHERE participant = %s AND state = 'CRASHED_IN_DOUBT'
                        ORDER BY id DESC LIMIT 1
                    """, (participant,))
                    row = cur.fetchone()
                    cur.close()
                else:
                    row = conn.execute("""
                        SELECT tx_id FROM participant_votes
                        WHERE participant = ? AND state = 'CRASHED_IN_DOUBT'
                        ORDER BY id DESC LIMIT 1
                    """, (participant,)).fetchone()
                if row:
                    target_tx_id = row["tx_id"] if isinstance(row, dict) else row[0]

            if not target_tx_id:
                # Check most recent transaction overall
                if USE_POSTGRES:
                    cur = conn.cursor()
                    cur.execute("SELECT tx_id FROM distributed_transactions ORDER BY start_time DESC LIMIT 1")
                    row = cur.fetchone()
                    cur.close()
                else:
                    row = conn.execute("SELECT tx_id FROM distributed_transactions ORDER BY start_time DESC LIMIT 1").fetchone()
                if row:
                    target_tx_id = row["tx_id"] if isinstance(row, dict) else row[0]

            if not target_tx_id:
                return {"error": "No transaction found to recover."}

            # Query coordinator record for this transaction
            if USE_POSTGRES:
                cur = conn.cursor()
                cur.execute("SELECT * FROM distributed_transactions WHERE tx_id = %s", (target_tx_id,))
                tx_record = cur.fetchone()
                cur.close()
            else:
                tx_record = conn.execute("SELECT * FROM distributed_transactions WHERE tx_id = ?", (target_tx_id,)).fetchone()
                if tx_record:
                    tx_record = dict(tx_record)

            if not tx_record or not tx_record.get("decision"):
                # Unknown decision case: Rule of 2PC - MUST NOT GUESS!
                msg = f"Recovery Protocol halted: Coordinator WAL has NO RECORDED DECISION for {target_tx_id}. Participant {participant} cannot commit or abort autonomously and must remain blocked."
                _log_recovery(conn, target_tx_id, participant, "IN_DOUBT_COORDINATOR_UNKNOWN", "BLOCKED_WAITING_COORDINATOR", "IN_DOUBT", recovery_time, msg)
                return {
                    "tx_id": target_tx_id,
                    "participant": participant,
                    "recovered": False,
                    "status": "BLOCKED",
                    "message": msg
                }

            decision = tx_record["decision"]
            resolved_state = "COMMITTED" if decision == "GLOBAL_COMMIT" else "ABORTED"
            msg = (
                f"Recovery Successful: Participant {participant} booted, found local <READY {target_tx_id}> record. "
                f"Consulted Coordinator persistent WAL and found recorded decision '{decision}'. "
                f"Participant applied local {resolved_state}, released locks, and updated state to {resolved_state}."
            )

            # Update participant state in database
            if USE_POSTGRES:
                cur = conn.cursor()
                cur.execute("""
                    UPDATE participant_votes
                    SET state = %s
                    WHERE tx_id = %s AND participant = %s
                """, (resolved_state, target_tx_id, participant))
                conn.commit()
                cur.close()
            else:
                conn.execute("""
                    UPDATE participant_votes
                    SET state = ?
                    WHERE tx_id = ? AND participant = ?
                """, (resolved_state, target_tx_id, participant))
                conn.commit()

            _log_recovery(conn, target_tx_id, participant, "SITE_FAILURE_IN_DOUBT", "CONSULTED_COORDINATOR_WAL", resolved_state, recovery_time, msg)

            return {
                "tx_id": target_tx_id,
                "participant": participant,
                "recovered": True,
                "decision_found": decision,
                "resolved_state": resolved_state,
                "message": msg,
                "recovery_time": recovery_time
            }
        finally:
            if not USE_POSTGRES:
                conn.close()

def _log_recovery(conn, tx_id, participant, failure_type, recovery_action, resolved_state, logged_at, message):
    if USE_POSTGRES:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO recovery_logs (tx_id, participant, failure_type, recovery_action, resolved_state, logged_at, message)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (tx_id, participant, failure_type, recovery_action, resolved_state, logged_at, message))
        conn.commit()
        cur.close()
    else:
        conn.execute("""
            INSERT INTO recovery_logs (tx_id, participant, failure_type, recovery_action, resolved_state, logged_at, message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (tx_id, participant, failure_type, recovery_action, resolved_state, logged_at, message))
        conn.commit()

def get_transaction_history(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_pg_connection() if USE_POSTGRES else get_sqlite_conn(CENTRAL_DB_PATH)
    if USE_POSTGRES:
        cur = conn.cursor()
        cur.execute("SELECT * FROM distributed_transactions ORDER BY start_time DESC LIMIT %s", (limit,))
        txs = [dict(r) for r in cur.fetchall()]
        for tx in txs:
            cur.execute("SELECT * FROM participant_votes WHERE tx_id = %s", (tx["tx_id"],))
            tx["participant_votes"] = [dict(v) for v in cur.fetchall()]
        cur.close()
        conn.close()
    else:
        rows = conn.execute("SELECT * FROM distributed_transactions ORDER BY start_time DESC LIMIT ?", (limit,)).fetchall()
        txs = [dict(r) for r in rows]
        for tx in txs:
            v_rows = conn.execute("SELECT * FROM participant_votes WHERE tx_id = ?", (tx["tx_id"],)).fetchall()
            tx["participant_votes"] = [dict(v) for v in v_rows]
        conn.close()
    return txs

def get_recovery_logs(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_pg_connection() if USE_POSTGRES else get_sqlite_conn(CENTRAL_DB_PATH)
    if USE_POSTGRES:
        cur = conn.cursor()
        cur.execute("SELECT * FROM recovery_logs ORDER BY log_id DESC LIMIT %s", (limit,))
        logs = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
    else:
        rows = conn.execute("SELECT * FROM recovery_logs ORDER BY log_id DESC LIMIT ?", (limit,)).fetchall()
        logs = [dict(r) for r in rows]
        conn.close()
    return logs
