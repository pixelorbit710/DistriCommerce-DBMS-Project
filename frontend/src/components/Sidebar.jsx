import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ListOrdered,
  Database,
  Network,
  CopyCheck,
  Zap,
  GitMerge,
  RotateCcw,
  Server
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', label: '1. Overview Dashboard', icon: LayoutDashboard },
  { id: 'place-order', label: '2. Place an Order', icon: ShoppingCart },
  { id: 'order-mgmt', label: '3. Order Management', icon: ListOrdered },
  { id: 'regional-db', label: '4. Regional Database', icon: Database },
  { id: 'data-dist', label: '5. Data Distribution', icon: Network },
  { id: 'replication', label: '6. Product Replication', icon: CopyCheck },
  { id: 'parallel-query', label: '7. Parallel Queries', icon: Zap },
  { id: 'dist-tx', label: '8. Distributed 2PC', icon: GitMerge },
  { id: 'recovery', label: '9. Tx Recovery', icon: RotateCcw },
];

export default function Sidebar({ activeTab, setActiveTab, stats, health }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-badge">JSPM RSCOE IT &bull; DBMS Project</div>
        <div className="brand-title">DistriCommerce</div>
        <div className="brand-subtitle">One Platform. Three Regions. Distributed Intelligence.</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Modules</div>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="nav-item-icon">
                <Icon size={18} />
              </div>
              <span>{item.label}</span>
              {item.id === 'order-mgmt' && stats?.total_orders > 0 && (
                <span className="nav-badge">{stats.total_orders}</span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-node-pill">
          <span className="status-dot"></span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '11.5px', color: '#f8fafc' }}>
              Nodes: Pune | Delhi | Chennai
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              {health?.engine ? (health.engine.includes('Postgres') ? 'PostgreSQL Engine' : 'Multi-Node SQLite Engine') : 'Connecting...'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
