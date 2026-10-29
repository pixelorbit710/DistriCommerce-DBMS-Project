import React, { useState, useEffect } from 'react';
import { api } from './api';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import OverviewDashboard from './components/OverviewDashboard';
import PlaceOrder from './components/PlaceOrder';
import OrderManagement from './components/OrderManagement';
import RegionalDatabase from './components/RegionalDatabase';
import DataDistribution from './components/DataDistribution';
import ProductReplication from './components/ProductReplication';
import ParallelQuery from './components/ParallelQuery';
import DistributedTransactions from './components/DistributedTransactions';
import TransactionRecovery from './components/TransactionRecovery';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGlobalState = async () => {
    try {
      setIsRefreshing(true);
      const [statsRes, healthRes] = await Promise.all([
        api.getDashboardStats(),
        api.getHealth(),
      ]);
      setStats(statsRes);
      setHealth(healthRes);
    } catch (err) {
      console.error('Failed to fetch initial stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalState();
  }, []);

  const renderModuleContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewDashboard
            stats={stats}
            health={health}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'place-order':
        return (
          <PlaceOrder
            onOrderCreated={fetchGlobalState}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'order-mgmt':
        return <OrderManagement onDataChanged={fetchGlobalState} />;
      case 'regional-db':
        return <RegionalDatabase />;
      case 'data-dist':
        return <DataDistribution />;
      case 'replication':
        return <ProductReplication />;
      case 'parallel-query':
        return <ParallelQuery />;
      case 'dist-tx':
        return <DistributedTransactions onTransactionExecuted={fetchGlobalState} />;
      case 'recovery':
        return <TransactionRecovery />;
      default:
        return <OverviewDashboard stats={stats} health={health} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        health={health}
      />

      <div className="main-wrapper">
        <Navbar
          activeTab={activeTab}
          onRefresh={fetchGlobalState}
          isRefreshing={isRefreshing}
          health={health}
        />

        <main className="content-area">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
