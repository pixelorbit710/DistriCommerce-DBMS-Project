import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CopyCheck, RefreshCw, Edit3, CheckCircle2, AlertCircle, Database, Check } from 'lucide-react';

export default function ProductReplication() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts();
      setData(res);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to load replicated products.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleUpdateCentral = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await api.updateProduct({
        product_id: editingProduct.product_id,
        price: parseFloat(editPrice),
        stock_quantity: parseInt(editStock),
        auto_sync: false, // Leave out-of-sync intentionally to demonstrate manual sync!
      });
      setFeedback({
        type: 'success',
        message: `Product ${editingProduct.product_id} updated in Central Master Catalog. Regional replicas are now OUT-OF-SYNC until propagation is triggered.`
      });
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: `Update failed: ${err.message}` });
    }
  };

  const handleSyncAll = async (targetProduct = null) => {
    try {
      setSyncing(true);
      const res = await api.syncProducts({
        product_id: targetProduct,
      });
      setFeedback({
        type: 'success',
        message: `Product catalogue successfully synchronized across Pune, Delhi, and Chennai replicas at ${res.timestamp}.`
      });
      loadProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: `Sync failed: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const centralProducts = data?.central_products || [];
  const regionalReplicas = data?.regional_replicas || {};
  const regions = ['Pune', 'Delhi', 'Chennai'];

  return (
    <div>
      {/* Educational Banner */}
      <div className="theory-banner">
        <div className="theory-title">
          <CopyCheck size={18} /> Distributed Product Catalog Replication (Read-Any / Write-One)
        </div>
        <p className="theory-desc">
          <strong>Replication Model:</strong> Application-Level Master-Slave Replication.
          The central catalog (<code>products_central</code>) serves as the authoritative write master.
          Read-intensive regional transactions read local copies (<code>products_pune</code>, <code>products_delhi</code>, <code>products_chennai</code>)
          to avoid cross-WAN latency. Updates made to the master can be propagated lazily or eagerly.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '13.5px'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Sync Action Header Card */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Replication Manager Control Panel</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Propagate central product price and inventory updates to all three regional replica nodes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => handleSyncAll()} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Propagating Updates...' : 'Trigger Sync to All Regional Replicas'}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table with Live Regional Sync Comparison */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Central Master vs Regional Replicas Sync Audit</h3>
            <p className="card-subtitle">Compares master catalog values with local regional copies</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Master Price (Central)</th>
                <th>Master Stock</th>
                <th>Pune Replica</th>
                <th>Delhi Replica</th>
                <th>Chennai Replica</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Inspecting replica catalogs...</td></tr>
              ) : centralProducts.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No products found in central catalog.</td></tr>
              ) : (
                centralProducts.map((p) => {
                  const puneCopy = regionalReplicas['Pune']?.find((r) => r.product_id === p.product_id);
                  const delhiCopy = regionalReplicas['Delhi']?.find((r) => r.product_id === p.product_id);
                  const chennaiCopy = regionalReplicas['Chennai']?.find((r) => r.product_id === p.product_id);

                  const puneSynced = puneCopy && puneCopy.price === p.price && puneCopy.stock_quantity === p.stock_quantity;
                  const delhiSynced = delhiCopy && delhiCopy.price === p.price && delhiCopy.stock_quantity === p.stock_quantity;
                  const chennaiSynced = chennaiCopy && chennaiCopy.price === p.price && chennaiCopy.stock_quantity === p.stock_quantity;

                  return (
                    <tr key={p.product_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.product_id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{p.category}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(p.price)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.stock_quantity}</td>
                      <td>
                        <span className={`badge ${puneSynced ? 'badge-green' : 'badge-amber'}`}>
                          {puneSynced ? 'In-Sync' : `₹${puneCopy?.price} (${puneCopy?.stock_quantity})`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${delhiSynced ? 'badge-green' : 'badge-amber'}`}>
                          {delhiSynced ? 'In-Sync' : `₹${delhiCopy?.price} (${delhiCopy?.stock_quantity})`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${chennaiSynced ? 'badge-green' : 'badge-amber'}`}>
                          {chennaiSynced ? 'In-Sync' : `₹${chennaiCopy?.price} (${chennaiCopy?.stock_quantity})`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Edit Master Catalog"
                            onClick={() => {
                              setEditingProduct(p);
                              setEditPrice(p.price);
                              setEditStock(p.stock_quantity);
                            }}
                          >
                            <Edit3 size={13} /> Edit Master
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Sync Just This Product"
                            onClick={() => handleSyncAll(p.product_id)}
                          >
                            <RefreshCw size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
              Update Central Master Record
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Editing <strong>{editingProduct.name}</strong> ({editingProduct.product_id})
            </p>

            <form onSubmit={handleUpdateCentral}>
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save to Central Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
