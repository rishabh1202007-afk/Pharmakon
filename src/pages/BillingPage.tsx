import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { ErpNavigation } from '../components/ErpNavigation';
import {
  createBillingInvoice,
  fetchBillingInvoices,
  fetchPatientRegistry,
  updateBillingInvoice,
} from '../services/erpService';
import { useAuth } from '../state/authStore';
import type { BillingInvoice, BillingLineItem, PatientRegistryItem } from '../types/domain';

export function BillingPage() {
  const { user, hospital } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [patients, setPatients] = useState<PatientRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invForm, setInvForm] = useState<{
    patientId: string;
    patientName: string;
    items: BillingLineItem[];
    insuranceCoverage: number;
    paymentMethod: string;
    paymentStatus: string;
    notes: string;
  }>({
    patientId: initialPatientId || '',
    patientName: '',
    items: [
      {
        description: 'Pharmacogenomic CYP2C19 / CYP2D6 Diagnostic Panel',
        category: 'Genomics Test',
        quantity: 1,
        amount: 450.0,
      },
      {
        description: 'Specialist Attending Physician Consultation',
        category: 'Consultation',
        quantity: 1,
        amount: 180.0,
      },
    ],
    insuranceCoverage: 350.0,
    paymentMethod: 'Insurance',
    paymentStatus: 'Pending',
    notes: 'Covered under Standard Comprehensive Health Care Plan',
  });

  // Invoice Receipt View Modal
  const [viewInvoice, setViewInvoice] = useState<BillingInvoice | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invList, patientList] = await Promise.all([
        fetchBillingInvoices(),
        fetchPatientRegistry(),
      ]);
      setInvoices(invList);
      setPatients(patientList);
    } catch (err) {
      console.error('Failed to load billing invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePatientSelect = (pid: string) => {
    const selected = patients.find((p) => p.patientId === pid);
    setInvForm((prev) => ({
      ...prev,
      patientId: pid,
      patientName: selected ? selected.patientName : pid,
    }));
  };

  const addItemRow = () => {
    setInvForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: 'Medication Dispense / Bed Charge',
          category: 'Medication',
          quantity: 1,
          amount: 50.0,
        },
      ],
    }));
  };

  const removeItemRow = (index: number) => {
    setInvForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItemRow = (index: number, field: keyof BillingLineItem, value: unknown) => {
    setInvForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const subtotal = invForm.items.reduce((sum, item) => sum + item.quantity * item.amount, 0);
  const totalDue = Math.max(0, subtotal - invForm.insuranceCoverage);

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.patientId.trim() || !invForm.items.length) {
      setInvoiceError('Patient ID and at least one billable line item are required.');
      return;
    }

    setGenerating(true);
    setInvoiceError(null);

    const invoicePayload = {
      ...invForm,
      createdBy: user?.display_name || 'Finance Office',
    };
    try {
      await createBillingInvoice(invoicePayload);
      setShowInvoiceModal(false);
      await loadData();
    } catch (err: unknown) {
      setInvoiceError((err as Error)?.message || 'Failed to generate invoice.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusToggle = async (invoiceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
      await updateBillingInvoice(invoiceId, { paymentStatus: newStatus as BillingInvoice['paymentStatus'] });
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, paymentStatus: newStatus as BillingInvoice['paymentStatus'] } : inv))
      );
    } catch (err) {
      console.error('Failed to update invoice status:', err);
    }
  };

  const handleDownloadPdf = (invoice: BillingInvoice) => {
    const doc = new jsPDF();
    const hospitalName = hospital?.name || 'Metropolitan Medical Center';

    doc.setFillColor(11, 22, 36);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(34, 199, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PHARMAKON HOSPITAL HEALTHCARE ERP', 14, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hospitalName} · Department of Financial & Clinical Billing`, 14, 26);

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`OFFICIAL MEDICAL INVOICE: ${invoice.id}`, 14, 48);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient Name: ${invoice.patientName}`, 14, 58);
    doc.text(`Patient ID: ${invoice.patientId}`, 14, 64);
    doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 70);
    doc.text(`Payment Method: ${invoice.paymentMethod}`, 120, 58);
    doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, 120, 64);
    doc.text(`Billed By: ${invoice.createdBy || 'Finance Office'}`, 120, 70);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 76, 196, 76);

    let y = 86;
    doc.setFont('helvetica', 'bold');
    doc.text('Item Description', 14, y);
    doc.text('Category', 110, y);
    doc.text('Qty', 150, y);
    doc.text('Amount ($)', 175, y);

    y += 4;
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    invoice.items.forEach((item) => {
      doc.text(item.description, 14, y);
      doc.text(item.category, 110, y);
      doc.text(String(item.quantity), 150, y);
      doc.text(`$${(item.amount * item.quantity).toFixed(2)}`, 175, y);
      y += 8;
    });

    y += 4;
    doc.line(14, y, 196, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 140, y);
    y += 6;
    doc.text(`Insurance Coverage Deduction: -$${invoice.insuranceCoverage.toFixed(2)}`, 140, y);
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(15, 109, 144);
    doc.text(`Total Amount Due: $${invoice.totalAmount.toFixed(2)}`, 140, y);

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated billing statement verified through the Pharmakon Clinical ERP System.', 14, y);
    doc.text('Direct inquiries to the Department of Medical Accounts & Health Insurance Services.', 14, y + 5);

    doc.save(`Invoice_${invoice.id}_${invoice.patientId}.pdf`);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      searchFilter === '' ||
      inv.patientId.toLowerCase().includes(searchFilter.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.filter((inv) => inv.paymentStatus === 'Paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPending = invoices.filter((inv) => inv.paymentStatus === 'Pending').reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="erp-page-container">
      <ErpNavigation activeTab="billing" />

      <main className="erp-main-body">
        <div className="erp-page-header">
          <div className="erp-title-area">
            <h1>
              <span>💳</span> Invoicing & Clinical Billing Management
            </h1>
            <p>
              Itemized billing, insurance claims, and real-time per-patient folder accounting · {hospital?.name || 'Hospital'}
            </p>
          </div>

          <div className="erp-header-actions">
            <button
              type="button"
              className="erp-btn-primary"
              onClick={() => setShowInvoiceModal(true)}
            >
              + Create New Invoice
            </button>
            <button
              type="button"
              className="erp-btn-secondary"
              onClick={loadData}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* FINANCIAL SUMMARY TILES */}
        <section className="erp-stats-grid">
          <div className="erp-stat-card" style={{ '--card-accent': '#22c7ff' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Invoices Issued</span>
            <div className="erp-stat-value">${totalBilled.toFixed(2)}</div>
            <span className="erp-stat-meta">{invoices.length} total generated invoices</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Collected (Paid)</span>
            <div className="erp-stat-value">${totalPaid.toFixed(2)}</div>
            <span className="erp-stat-meta">
              {invoices.filter((i) => i.paymentStatus === 'Paid').length} paid statements
            </span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#f59e0b' } as React.CSSProperties}>
            <span className="erp-stat-label">Pending Receivables</span>
            <div className="erp-stat-value">${totalPending.toFixed(2)}</div>
            <span className="erp-stat-meta">
              {invoices.filter((i) => i.paymentStatus === 'Pending').length} pending claims
            </span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#8b5cf6' } as React.CSSProperties}>
            <span className="erp-stat-label">Avg Claim Settlement</span>
            <div className="erp-stat-value">
              ${invoices.length ? (totalBilled / invoices.length).toFixed(2) : '0.00'}
            </div>
            <span className="erp-stat-meta">Average amount per clinical encounter</span>
          </div>
        </section>

        {/* INVOICES TABLE PANEL */}
        <section className="erp-panel-card">
          <div className="erp-panel-header">
            <h3>
              <span>📑</span> Patient Invoices & Statements ({filteredInvoices.length})
            </h3>

            <div className="erp-search-filter-bar">
              <input
                type="text"
                placeholder="Search invoice ID, patient name or ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="erp-search-input"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Waived">Waived</option>
              </select>
            </div>
          </div>

          <div className="erp-table-responsive">
            <table className="erp-data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Patient</th>
                  <th>Line Items</th>
                  <th>Subtotal</th>
                  <th>Insurance Ded.</th>
                  <th>Net Total</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Loading patient billing records...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No billing invoices matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const isPaid = invoice.paymentStatus === 'Paid';
                    return (
                      <tr key={invoice.id}>
                        <td>
                          <strong>{invoice.id}</strong>
                        </td>
                        <td>
                          <div>
                            <strong>{invoice.patientName}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#8da2bc' }}>
                              ID: {invoice.patientId}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span title={invoice.items.map((i) => i.description).join(', ')}>
                            {invoice.items.length} item{invoice.items.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td>${invoice.subtotal.toFixed(2)}</td>
                        <td style={{ color: '#86efac' }}>-${invoice.insuranceCoverage.toFixed(2)}</td>
                        <td>
                          <strong style={{ color: '#7be1ff' }}>${invoice.totalAmount.toFixed(2)}</strong>
                        </td>
                        <td>{invoice.paymentMethod}</td>
                        <td>
                          <span
                            className="erp-badge"
                            style={{
                              backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              borderColor: isPaid ? '#10b981' : '#f59e0b',
                              color: isPaid ? '#6ee7b7' : '#fde68a',
                            }}
                          >
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <small style={{ color: '#8da2bc' }}>
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </small>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="erp-action-btn-sm"
                              onClick={() => handleStatusToggle(invoice.id, invoice.paymentStatus)}
                              title="Toggle Payment Status"
                            >
                              {isPaid ? '↺ Mark Pending' : '✓ Mark Paid'}
                            </button>

                            <button
                              type="button"
                              className="erp-action-btn-sm"
                              onClick={() => handleDownloadPdf(invoice)}
                              title="Download PDF Bill"
                            >
                              📥 PDF
                            </button>

                            <button
                              type="button"
                              className="erp-action-btn-sm"
                              onClick={() => setViewInvoice(invoice)}
                              title="View Full Itemized Statement"
                            >
                              👁 View
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
        </section>
      </main>

      {/* CREATE INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box" style={{ maxWidth: '780px' }}>
            <div className="erp-modal-header">
              <h2>
                <span>💳</span> Issue Patient Medical Invoice
              </h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setShowInvoiceModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit}>
              <div className="erp-modal-body">
                {invoiceError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    {invoiceError}
                  </div>
                )}

                <div className="erp-form-grid">
                  <div className="erp-form-group">
                    <label>Select Patient *</label>
                    <select
                      className="erp-input"
                      value={invForm.patientId}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Existing Patient --</option>
                      {patients.map((p) => (
                        <option key={p.patientId} value={p.patientId}>
                          {p.patientName} ({p.patientId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Patient ID</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={invForm.patientId}
                      onChange={(e) => setInvForm({ ...invForm, patientId: e.target.value })}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Patient Full Name</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={invForm.patientName}
                      onChange={(e) => setInvForm({ ...invForm, patientName: e.target.value })}
                      placeholder="e.g. Eleanor Vance"
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Payment Method</label>
                    <select
                      className="erp-input"
                      value={invForm.paymentMethod}
                      onChange={(e) => setInvForm({ ...invForm, paymentMethod: e.target.value })}
                    >
                      <option value="Insurance">Health Insurance Direct</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit / Debit Card</option>
                      <option value="Wire Transfer">Wire Transfer / Online</option>
                    </select>
                  </div>
                </div>

                {/* LINE ITEMS TABLE */}
                <div style={{ margin: '1rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#7be1ff', textTransform: 'uppercase' }}>
                      Billable Items & Services
                    </strong>
                    <button
                      type="button"
                      className="erp-action-btn-sm"
                      onClick={addItemRow}
                    >
                      + Add Item Row
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {invForm.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 70px 100px 40px',
                          gap: '0.5rem',
                          alignItems: 'center',
                          background: 'rgba(5, 12, 23, 0.8)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <input
                          type="text"
                          className="erp-input"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItemRow(idx, 'description', e.target.value)}
                          required
                        />

                        <select
                          className="erp-input"
                          value={item.category}
                          onChange={(e) => updateItemRow(idx, 'category', e.target.value)}
                        >
                          <option value="Genomics Test">Genomics Test</option>
                          <option value="Consultation">Consultation</option>
                          <option value="Medication">Medication</option>
                          <option value="Bed Charge">Bed Charge</option>
                          <option value="Lab Diagnostic">Lab Diagnostic</option>
                          <option value="Procedure">Procedure</option>
                        </select>

                        <input
                          type="number"
                          min={1}
                          className="erp-input"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value) || 1)}
                        />

                        <input
                          type="number"
                          step="0.01"
                          className="erp-input"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => updateItemRow(idx, 'amount', Number(e.target.value) || 0)}
                        />

                        <button
                          type="button"
                          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.1rem' }}
                          onClick={() => removeItemRow(idx)}
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TOTALS COMPUTATION */}
                <div
                  style={{
                    background: 'rgba(17, 31, 48, 0.6)',
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                    <span>Subtotal:</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem' }}>Insurance Coverage Deduction ($):</span>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input"
                      style={{ width: '120px', textAlign: 'right' }}
                      value={invForm.insuranceCoverage}
                      onChange={(e) => setInvForm({ ...invForm, insuranceCoverage: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#22c7ff',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      paddingTop: '0.5rem',
                    }}
                  >
                    <span>Net Balance Due:</span>
                    <span>${totalDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="erp-modal-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', background: 'transparent' }}>
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn-primary"
                  disabled={generating}
                >
                  {generating ? 'Issuing Invoice...' : 'Generate & Save Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE MODAL */}
      {viewInvoice && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box" style={{ maxWidth: '640px' }}>
            <div className="erp-modal-header">
              <h2>
                <span>📄</span> Invoice Statement: {viewInvoice.id}
              </h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setViewInvoice(null)}
              >
                ×
              </button>
            </div>

            <div className="erp-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc' }}>{viewInvoice.patientName}</h3>
                  <div style={{ color: '#8da2bc', fontSize: '0.84rem' }}>Patient ID: {viewInvoice.patientId}</div>
                  <div style={{ color: '#8da2bc', fontSize: '0.84rem' }}>
                    Created: {new Date(viewInvoice.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c7ff' }}>
                    ${viewInvoice.totalAmount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                    Status: {viewInvoice.paymentStatus}
                  </div>
                </div>
              </div>

              <table className="erp-data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity}</td>
                      <td>${(item.amount * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1.25rem', background: 'rgba(17, 31, 48, 0.5)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.3rem' }}>
                  <span>Subtotal:</span>
                  <strong>${viewInvoice.subtotal.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#86efac', marginBottom: '0.3rem' }}>
                  <span>Insurance Coverage:</span>
                  <strong>-${viewInvoice.insuranceCoverage.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: '#22c7ff' }}>
                  <span>Total Due:</span>
                  <strong>${viewInvoice.totalAmount.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="erp-modal-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', background: 'transparent' }}>
              <button
                type="button"
                className="erp-btn-primary"
                onClick={() => handleDownloadPdf(viewInvoice)}
              >
                📥 Download PDF Receipt
              </button>
              <button
                type="button"
                className="erp-btn-secondary"
                onClick={() => setViewInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
