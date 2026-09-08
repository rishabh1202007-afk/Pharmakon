import { useEffect, useState } from 'react';
import { ErpNavigation } from '../components/ErpNavigation';
import { fetchInventory, restockInventoryItem } from '../services/erpService';
import { useAuth } from '../state/authStore';
import type { InventoryItem } from '../types/domain';

export function PharmacyInventoryPage() {
  const { user, hospital } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [geneFilter, setGeneFilter] = useState('ALL');

  // Restock Modal
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(100);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [restocking, setRestocking] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchInventory();
      setInventory(list);
    } catch (err) {
      console.error('Failed to load pharmacy inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQty(100);
    setNewBatchNo(`${item.drugName.slice(0, 3).toUpperCase()}-2026-N${Math.floor(1 + Math.random() * 9)}`);
    setNewExpiry('2028-12-31');
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setRestocking(true);
    try {
      const updated = await restockInventoryItem({
        id: selectedItem.id,
        addedQuantity: restockQty,
        newBatchNo,
        newExpiryDate: newExpiry,
      });

      setInventory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedItem(null);
    } catch (err) {
      console.error('Failed to restock item:', err);
    } finally {
      setRestocking(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      searchFilter === '' ||
      item.drugName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.geneTarget.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesGene = geneFilter === 'ALL' || item.geneTarget === geneFilter;

    return matchesSearch && matchesCategory && matchesGene;
  });

  const uniqueCategories = Array.from(new Set(inventory.map((i) => i.category).filter(Boolean)));
  const uniqueGenes = Array.from(new Set(inventory.map((i) => i.geneTarget).filter((g) => g && g !== 'None')));

  const totalUnits = inventory.reduce((sum, item) => sum + item.stockLevel, 0);
  const lowStockCount = inventory.filter((i) => i.stockLevel <= i.minThreshold).length;

  return (
    <div className="erp-page-container">
      <ErpNavigation activeTab="pharmacy" />

      <main className="erp-main-body">
        <div className="erp-page-header">
          <div className="erp-title-area">
            <h1>
              <span>💊</span> Pharmacy & Pharmacogenomic Drug Inventory
            </h1>
            <p>
              Hospital formulary stock tracking with gene target metadata and auto-dispense decrementing · {hospital?.name || 'Hospital'}
            </p>
          </div>

          <div className="erp-header-actions">
            <button
              type="button"
              className="erp-btn-secondary"
              onClick={loadData}
            >
              🔄 Refresh Formulary
            </button>
          </div>
        </div>

        {/* PHARMACY KPI TILES */}
        <section className="erp-stats-grid">
          <div className="erp-stat-card" style={{ '--card-accent': '#22c7ff' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Formulations</span>
            <div className="erp-stat-value">{inventory.length}</div>
            <span className="erp-stat-meta">Active pharmaceutical products in stock</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Units on Hand</span>
            <div className="erp-stat-value">{totalUnits}</div>
            <span className="erp-stat-meta">Total doses, tablets, and capsules</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#ef4444' } as React.CSSProperties}>
            <span className="erp-stat-label">Low Stock Alerts</span>
            <div className="erp-stat-value">{lowStockCount}</div>
            <span className="erp-stat-meta">Medications below safety threshold</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#8b5cf6' } as React.CSSProperties}>
            <span className="erp-stat-label">PGx Actionable Drugs</span>
            <div className="erp-stat-value">
              {inventory.filter((i) => i.geneTarget && i.geneTarget !== 'None').length}
            </div>
            <span className="erp-stat-meta">Mapped to FDA & CPIC gene guidelines</span>
          </div>
        </section>

        {/* INVENTORY TABLE PANEL */}
        <section className="erp-panel-card">
          <div className="erp-panel-header">
            <h3>
              <span>📦</span> Drug Formulary & Inventory Levels ({filteredInventory.length})
            </h3>

            <div className="erp-search-filter-bar">
              <input
                type="text"
                placeholder="Search drug name or gene target..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="erp-search-input"
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={geneFilter}
                onChange={(e) => setGeneFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All PGx Targets</option>
                {uniqueGenes.map((g) => (
                  <option key={g} value={g}>
                    Target: {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="erp-table-responsive">
            <table className="erp-data-table">
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th>Therapeutic Class</th>
                  <th>Stock Meter</th>
                  <th>Stock Units</th>
                  <th>PGx Gene Target</th>
                  <th>Batch / Expiry</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Loading pharmacy stock...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No formulary items found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const isLow = item.stockLevel <= item.minThreshold;
                    const stockRatio = Math.min(100, Math.round((item.stockLevel / (item.minThreshold * 4)) * 100));

                    return (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#f8fafc' }}>{item.drugName}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#8da2bc' }}>{item.id}</div>
                          </div>
                        </td>
                        <td>{item.category}</td>
                        <td>
                          <div style={{ width: '120px' }}>
                            <div className="erp-progress-track">
                              <div
                                className="erp-progress-fill"
                                style={{
                                  width: `${stockRatio}%`,
                                  background: isLow ? '#ef4444' : '#10b981',
                                }}
                              />
                            </div>
                            <small style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              Min: {item.minThreshold} units
                            </small>
                          </div>
                        </td>
                        <td>
                          <strong>{item.stockLevel}</strong> <small style={{ color: '#8da2bc' }}>{item.unit}</small>
                        </td>
                        <td>
                          {item.geneTarget && item.geneTarget !== 'None' ? (
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                background: 'rgba(34, 199, 255, 0.15)',
                                border: '1px solid rgba(34, 199, 255, 0.4)',
                                color: '#7be1ff',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              🧬 {item.geneTarget}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Non-genomic</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>{item.batchNo}</div>
                          <small style={{ color: '#8da2bc' }}>Exp: {item.expiryDate}</small>
                        </td>
                        <td>${item.unitPrice.toFixed(2)}</td>
                        <td>
                          <span
                            className="erp-badge"
                            style={{
                              backgroundColor: isLow ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              borderColor: isLow ? '#ef4444' : '#10b981',
                              color: isLow ? '#fca5a5' : '#86efac',
                            }}
                          >
                            {isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="erp-action-btn-sm"
                            onClick={() => openRestockModal(item)}
                            title="Restock medication batch"
                          >
                            + Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* RESTOCK MODAL */}
      {selectedItem && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box" style={{ maxWidth: '540px' }}>
            <div className="erp-modal-header">
              <h2>
                <span>📦</span> Restock Formulary: {selectedItem.drugName}
              </h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setSelectedItem(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRestockSubmit}>
              <div className="erp-modal-body">
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(17, 31, 48, 0.5)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span>Current Inventory Level:</span>
                    <strong>{selectedItem.stockLevel} units</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Minimum Safety Threshold:</span>
                    <strong>{selectedItem.minThreshold} units</strong>
                  </div>
                </div>

                <div className="erp-form-grid">
                  <div className="erp-form-group">
                    <label>Units to Add *</label>
                    <input
                      type="number"
                      min={1}
                      className="erp-input"
                      value={restockQty}
                      onChange={(e) => setRestockQty(Number(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Batch / Lot Number *</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={newBatchNo}
                      onChange={(e) => setNewBatchNo(e.target.value)}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Batch Expiry Date *</label>
                    <input
                      type="date"
                      className="erp-input"
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(e.target.value)}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Authorized By</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={user?.display_name || 'Pharmacist'}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="erp-modal-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', background: 'transparent' }}>
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => setSelectedItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn-primary"
                  disabled={restocking}
                >
                  {restocking ? 'Updating Stock...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
