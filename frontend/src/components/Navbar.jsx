import React, { useState } from 'react';
import { RefreshCw, Database, Server, CheckCircle2, GraduationCap, X, Users, BookOpen } from 'lucide-react';

const TAB_TITLES = {
  'dashboard': { title: 'Overview Dashboard', subtitle: 'Live multi-site operational metrics computed directly from database records' },
  'place-order': { title: 'Place an Order', subtitle: 'Generic e-commerce ordering with dynamic regional fragmentation routing' },
  'order-mgmt': { title: 'Order Management', subtitle: 'Global relations reconstructed via relational UNION ALL with multi-city search' },
  'regional-db': { title: 'Regional Database Demonstration', subtitle: 'Physical & logical site partitioning across Pune, Delhi, and Chennai nodes' },
  'data-dist': { title: 'Data Distribution & Partitioning', subtitle: 'Horizontal fragmentation theory, Range, Hash, and Round-Robin simulators' },
  'replication': { title: 'Product Replication Manager', subtitle: 'Central catalog write-master and regional replica synchronization' },
  'parallel-query': { title: 'Parallel Query Processing', subtitle: 'Multithreaded intraoperation sales aggregation vs sequential execution' },
  'dist-tx': { title: 'Distributed Transactions (2PC)', subtitle: 'Two-Phase Commit Protocol coordinator & participant state transitions' },
  'recovery': { title: 'Transaction Recovery Protocol', subtitle: 'In-doubt participant failure simulation and persistent WAL recovery' },
};

export default function Navbar({ activeTab, onRefresh, isRefreshing, health }) {
  const current = TAB_TITLES[activeTab] || { title: 'DistriCommerce', subtitle: '' };
  const [showAcademicInfo, setShowAcademicInfo] = useState(false);

  return (
    <>
      <header className="top-bar">
        <div>
          <h1 className="page-header-title">{current.title}</h1>
          <p className="page-header-subtitle">{current.subtitle}</p>
        </div>

        <div className="top-bar-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAcademicInfo(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: 600 }}
            title="View Academic Project & Team Details"
          >
            <GraduationCap size={15} style={{ color: '#2563eb' }} />
            RSCOE IT Project Info
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-blue">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }}></span>
              Pune Hub
            </span>
            <span className="badge badge-purple">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }}></span>
              Delhi Hub
            </span>
            <span className="badge badge-green">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
              Chennai Hub
            </span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh live data from database"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Academic Project Info Modal */}
      {showAcademicInfo && (
        <div className="modal-overlay" onClick={() => setShowAcademicInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-blue" style={{ marginBottom: '6px' }}>Academic DBMS Mini-Project</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  DistriCommerce
                </h3>
                <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                  "One Platform. Three Regions. Distributed Intelligence."
                </div>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowAcademicInfo(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                Order Management of a Multi-City E-Commerce Company Using Parallel and Distributed Databases
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                <strong>Institution:</strong> JSPM's Rajarshi Shahu College of Engineering, Tathawade, Pune.<br />
                <strong>Faculty Guide:</strong> Dr. Pallavi Tekade
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} style={{ color: '#2563eb' }} />
                Student Project Team
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Riya Pardhi</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Roll: IT3256 &bull; PRN: RBT24IT121</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Pooja Jagtap</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Roll: IT3265 &bull; PRN: RBTL25IT142</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Aditi Gite</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Roll: IT3272 &bull; PRN: RBTL25IT149</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Shanitej Patil</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Roll: IT3273 &bull; PRN: RBTL25IT150</div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAcademicInfo(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
