import React, { useState } from 'react';
import { TrendingUp, FileText, Calendar, DollarSign, Download, Printer, ClipboardList } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PDFDocument } from './PDFDocument';

export default function ReportsHistoryView({ 
  pos = [], 
  designs = [],
  issueLogs = [],
  currencySymbol = 'R' 
}) {
  const [selectedPo, setSelectedPo] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('procurement'); // 'procurement' or 'material_ledger'
  const [selectedLotId, setSelectedLotId] = useState('');

  // Calculate stats
  const totalPOValue = pos.reduce((sum, po) => sum + po.total, 0);
  const totalTaxPaid = pos.reduce((sum, po) => sum + po.tax, 0);
  const activePOUnits = pos.length;

  // Render a responsive bar/line chart using SVG
  const monthData = [
    { label: 'March', amount: 45000 },
    { label: 'April', amount: 82000 },
    { label: 'May', amount: 55000 },
    { label: 'June', amount: totalPOValue > 0 ? totalPOValue : 38500 }
  ];

  const maxVal = Math.max(...monthData.map(m => m.amount)) * 1.2;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '22px', fontWeight: '700' }}>Reports & Transaction Ledger</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Analyze manufacturing cost expenditures, check PO archives, and inspect material consumption by Lot.</p>
      </div>

      {/* Tab navigation */}
      <div className="print-hide" style={{
        display: 'flex',
        backgroundColor: 'var(--bg-secondary)',
        padding: '4px',
        borderRadius: 'var(--border-radius-sm)',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        width: 'fit-content'
      }}>
        <button
          type="button"
          onClick={() => setActiveReportTab('procurement')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeReportTab === 'procurement' ? 'var(--accent-color)' : 'transparent',
            color: activeReportTab === 'procurement' ? '#ffffff' : 'var(--text-main)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <DollarSign size={14} />
          <span>Procurement Expenses</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('material_ledger')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeReportTab === 'material_ledger' ? 'var(--accent-color)' : 'transparent',
            color: activeReportTab === 'material_ledger' ? '#ffffff' : 'var(--text-main)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ClipboardList size={14} />
          <span>Material Issue & Return Ledger</span>
        </button>
      </div>

      {activeReportTab === 'procurement' && (
        <>
          {/* Analytics Summary */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <DollarSign size={24} />
              </div>
              <span className="stat-title">Total PO Value Issued</span>
              <span className="stat-value">
                {currencySymbol} {totalPOValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <TrendingUp size={24} />
              </div>
              <span className="stat-title">Total Procurement Tax</span>
              <span className="stat-value">
                {currencySymbol} {totalTaxPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
                <FileText size={24} />
              </div>
              <span className="stat-title">Purchase Orders Transacted</span>
              <span className="stat-value">{activePOUnits} POs</span>
            </div>
          </div>

          {/* Expenditures Chart Panel */}
          <div className="panel animate-scale">
            <div className="panel-header">
              <h3 className="panel-title">
                <TrendingUp size={18} className="text-accent" />
                Purchasing Expenditure History (Current Season)
              </h3>
            </div>

            {/* SVG Graph */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg width="100%" height="220" viewBox="0 0 600 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {/* Horizontal Grid Lines */}
                <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="65" x2="580" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="110" x2="580" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="150" x2="580" y2="150" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Y Axis Labels */}
                <text x="5" y="25" fill="#94a3b8" fontSize="9" fontFamily="var(--font-family-body)">{currencySymbol} {(maxVal * 0.8 / 1000).toFixed(0)}k</text>
                <text x="5" y="70" fill="#94a3b8" fontSize="9" fontFamily="var(--font-family-body)">{currencySymbol} {(maxVal * 0.5 / 1000).toFixed(0)}k</text>
                <text x="5" y="115" fill="#94a3b8" fontSize="9" fontFamily="var(--font-family-body)">{currencySymbol} {(maxVal * 0.2 / 1000).toFixed(0)}k</text>
                <text x="5" y="155" fill="#94a3b8" fontSize="9" fontFamily="var(--font-family-body)">0</text>

                {/* Drawing Bars */}
                {monthData.map((d, index) => {
                  const x = 70 + (index * 135);
                  const height = (d.amount / maxVal) * 130;
                  const y = 150 - height;
                  const barWidth = 45;

                  return (
                    <g key={index} className="animate-scale">
                      {/* Bar shadow */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={height} 
                        fill="var(--accent-color)" 
                        opacity="0.9"
                        rx="4"
                      />
                      {/* Label */}
                      <text 
                        x={x + (barWidth / 2)} 
                        y="170" 
                        fill="var(--text-main)" 
                        fontSize="11" 
                        fontWeight="500"
                        fontFamily="var(--font-family-title)"
                        textAnchor="middle"
                      >
                        {d.label}
                      </text>
                      {/* Value */}
                      <text 
                        x={x + (barWidth / 2)} 
                        y={y - 8} 
                        fill="var(--accent-color)" 
                        fontSize="10" 
                        fontWeight="bold"
                        fontFamily="var(--font-family-body)"
                        textAnchor="middle"
                      >
                        {currencySymbol}{Math.round(d.amount).toLocaleString()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* PO Archives list */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <FileText size={18} className="text-accent" />
                Historic Issued Purchase Orders
              </h3>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier Vendor</th>
                    <th>Design Context</th>
                    <th>Issued Date</th>
                    <th>Target Delivery</th>
                    <th>Total Cost</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No purchase orders have been transacted yet. Go to <strong>Generate PO</strong> to create one.
                      </td>
                    </tr>
                  ) : (
                    pos.map((po) => (
                      <tr key={po.id}>
                        <td style={{ fontWeight: 'bold' }}>{po.poNumber}</td>
                        <td>{po.vendorName}</td>
                        <td>{po.designName ? `${po.designName} (${po.designCategory})` : 'Manual Purchase'}</td>
                        <td>{po.date}</td>
                        <td>{po.deliveryDate}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
                          {currencySymbol} {po.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <PDFDownloadLink 
                              document={<PDFDocument po={po} currencySymbol={currencySymbol} />} 
                              fileName={`PO_${po.poNumber}.pdf`}
                              className="btn btn-secondary btn-sm"
                              style={{ textDecoration: 'none', padding: '6px' }}
                            >
                              {({ loading }) => (
                                <Download size={14} style={{ color: 'var(--accent-color)' }} />
                              )}
                            </PDFDownloadLink>
                            
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedPo(po)}
                              style={{ padding: '6px' }}
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeReportTab === 'material_ledger' && (
        <div className="animate-scale">
          {/* Lot Selector Panel */}
          <div className="panel print-hide" style={{ marginBottom: '24px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '15px', fontWeight: '700' }}>Select Manufacturing Lot to Filter Report</label>
              <select
                className="form-input"
                value={selectedLotId}
                onChange={(e) => setSelectedLotId(e.target.value)}
                style={{ maxWidth: '400px' }}
              >
                <option value="">-- Choose Approved Lot --</option>
                {designs.map(design => (
                  <option key={design.id} value={design.id}>
                    Lot {design.id} &mdash; {design.brand || 'No Brand'} ({design.category})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Generates a complete breakdown of raw materials issued, returned, and net consumed for the selected manufacturing cycle.
              </span>
            </div>
          </div>

          {selectedLotId ? (
            (() => {
              // Filter logs for this lot
              const lotLogs = issueLogs.filter(log => String(log.lotId) === String(selectedLotId));
              const selectedDesign = designs.find(d => d.id === selectedLotId);

              if (lotLogs.length === 0) {
                return (
                  <div className="panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <ClipboardList size={48} strokeWidth={1} style={{ marginBottom: '12px', color: 'var(--text-light)', display: 'inline-block' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>No Transactions Recorded</h3>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>No material issues or return logs have been compiled yet for Lot {selectedLotId}.</p>
                  </div>
                );
              }

              // Compile consumption summary mapping
              const consumptionSummary = {};
              let totalIssuedCount = 0;
              let totalReturnedCount = 0;

              lotLogs.forEach(log => {
                log.materials.forEach(item => {
                  const key = `${item.bomItemName || 'Return'}::${item.name}`;
                  if (!consumptionSummary[key]) {
                    consumptionSummary[key] = {
                      bomItemName: item.bomItemName || 'Return',
                      materialName: item.name,
                      unit: item.unit || 'pcs',
                      issued: 0,
                      returned: 0
                    };
                  }
                  if (log.isReturn) {
                    consumptionSummary[key].returned += item.qty;
                    totalReturnedCount += item.qty;
                  } else {
                    consumptionSummary[key].issued += item.qty;
                    totalIssuedCount += item.qty;
                  }
                });
              });

              const summaryList = Object.values(consumptionSummary);

              // Find manufacturing batch volume if recorded
              const initialLog = lotLogs.find(log => !log.isReissue && !log.isReturn);
              const batchVolume = initialLog ? initialLog.volume : 0;

              return (
                <div>
                  {/* Lot Report Analytics Cards */}
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
                    <div className="stat-card" style={{ padding: '20px' }}>
                      <span className="stat-title">Garment Target Batch</span>
                      <span className="stat-value" style={{ fontSize: '22px' }}>
                        {batchVolume > 0 ? `${batchVolume.toLocaleString()} units` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {selectedDesign ? `${selectedDesign.category} — ${selectedDesign.brand || 'No Brand'}` : 'Details Loaded'}
                      </span>
                    </div>

                    <div className="stat-card" style={{ padding: '20px' }}>
                      <span className="stat-title" style={{ color: 'var(--accent-color)' }}>Total Materials Issued</span>
                      <span className="stat-value" style={{ fontSize: '22px', color: 'var(--accent-color)' }}>
                        {totalIssuedCount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Raw materials checked out of store
                      </span>
                    </div>

                    <div className="stat-card" style={{ padding: '20px' }}>
                      <span className="stat-title" style={{ color: 'var(--success)' }}>Total Materials Returned</span>
                      <span className="stat-value" style={{ fontSize: '22px', color: 'var(--success)' }}>
                        {totalReturnedCount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Returned leftovers back to inventory
                      </span>
                    </div>
                  </div>

                  {/* Summary Consumption Table */}
                  <div className="panel">
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="panel-title">
                        <FileText size={18} className="text-accent" />
                        Lot Material Consumption Ledger (Lot {selectedLotId})
                      </h3>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm print-hide"
                        onClick={() => window.print()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Printer size={14} />
                        <span>Print Report</span>
                      </button>
                    </div>

                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>BOM Component Name</th>
                            <th>Inventory Material Mapped</th>
                            <th style={{ textAlign: 'right' }}>Total Quantity Issued</th>
                            <th style={{ textAlign: 'right' }}>Total Quantity Returned</th>
                            <th style={{ textAlign: 'right' }}>Net Quantity Consumed</th>
                            <th style={{ textAlign: 'left', paddingLeft: '24px' }}>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryList.map((item, idx) => {
                            const net = Math.round((item.issued - item.returned) * 100) / 100;
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 'bold' }}>{item.bomItemName}</td>
                                <td>{item.materialName}</td>
                                <td style={{ textAlign: 'right', fontWeight: '500' }}>{item.issued.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                <td style={{ textAlign: 'right', fontWeight: '500', color: item.returned > 0 ? 'var(--success)' : 'inherit' }}>
                                  {item.returned > 0 ? `+${item.returned.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '0'}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                  {net.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ textAlign: 'left', paddingLeft: '24px', color: 'var(--text-muted)' }}>{item.unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Lot Logs Audit Trail History */}
                  <div className="panel">
                    <div className="panel-header">
                      <h3 className="panel-title">
                        <Calendar size={18} className="text-accent" />
                        Transaction History (Audit Trail for Lot {selectedLotId})
                      </h3>
                    </div>

                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Log ID</th>
                            <th>Transaction Type</th>
                            <th>Date & Time</th>
                            <th>Issuer Name / Comments</th>
                            <th>Materials Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotLogs.map((log) => (
                            <tr key={log.id}>
                              <td style={{ fontWeight: 'bold' }}>{log.id}</td>
                              <td>
                                {log.isReturn ? (
                                  <span className="status-badge verified" style={{ textTransform: 'uppercase', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                                    Material Return
                                  </span>
                                ) : log.isReissue ? (
                                  <span className="status-badge pending" style={{ textTransform: 'uppercase' }}>
                                    Re-issue (Wastage)
                                  </span>
                                ) : (
                                  <span className="status-badge po-generated" style={{ textTransform: 'uppercase' }}>
                                    Initial Issue
                                  </span>
                                )}
                              </td>
                              <td>{log.date}</td>
                              <td>
                                <strong>{log.personName || 'System'}</strong>
                              </td>
                              <td style={{ fontSize: '12px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {log.materials.map((m, mIdx) => (
                                    <span key={mIdx} style={{ backgroundColor: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                      <strong>{m.bomItemName || 'Return'}</strong> ({m.name}): <strong>{m.qty} {m.unit}</strong>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <ClipboardList size={48} strokeWidth={1} style={{ marginBottom: '12px', color: 'var(--text-light)', display: 'inline-block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>Select a Lot Number</h3>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>Please choose a manufacturing lot from the dropdown above to display its consumption report ledger.</p>
            </div>
          )}
        </div>
      )}

      {/* Selected PO Detail Modal */}
      {selectedPo && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-lg animate-scale">
            <div className="modal-header">
              <h3 className="modal-title">Receipt Review: {selectedPo.poNumber}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPo(null)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: '#ffffff', color: '#333333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0b2240', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ color: '#0b2240', margin: 0, fontFamily: 'var(--font-family-title)', fontWeight: '800' }}>G-PDMS</h2>
                    <span style={{ fontSize: '9px', color: '#666' }}>Apparel Park Industrial Zone</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#0b2240', fontWeight: 'bold' }}>PURCHASE ORDER</h3>
                    <span style={{ fontSize: '10px', display: 'block' }}>PO #: {selectedPo.poNumber}</span>
                    <span style={{ fontSize: '10px', display: 'block' }}>Date: {selectedPo.date}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#0b2240', display: 'block', textTransform: 'uppercase', fontSize: '9px' }}>Supplier</span>
                    <strong>{selectedPo.vendorName}</strong>
                    <span style={{ display: 'block' }}>{selectedPo.vendorEmail}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#0b2240', display: 'block', textTransform: 'uppercase', fontSize: '9px' }}>Ship To</span>
                    <strong>G-PDMS Hub</strong>
                    <span style={{ display: 'block' }}>Apparel Warehouse, Unit 4</span>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0b2240', color: '#ffffff' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Item Description</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo.items.map((it, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '4px 6px' }}>
                          <div style={{ fontWeight: '600' }}>{it.name}</div>
                          {it.description && (
                            <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{it.description}</div>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{it.qty} {it.unit}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{Number(it.price).toFixed(2)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold' }}>{(it.qty * it.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', fontSize: '10px' }}>
                  <div style={{ width: '150px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>{currencySymbol} {selectedPo.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tax ({selectedPo.taxRate}%):</span>
                      <span>{currencySymbol} {selectedPo.tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '3px', fontWeight: 'bold' }}>
                      <span>Grand Total:</span>
                      <span>{currencySymbol} {selectedPo.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                <PDFDownloadLink 
                  document={<PDFDocument po={selectedPo} currencySymbol={currencySymbol} />} 
                  fileName={`PO_${selectedPo.poNumber}.pdf`}
                  className="btn btn-primary"
                  style={{ width: '100%', textDecoration: 'none' }}
                >
                  {({ loading }) => (
                    loading ? 'Compiling PDF...' : <><Download size={16} /> Download PDF</>
                  )}
                </PDFDownloadLink>
                 <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    document.body.classList.add('print-po-mode');
                    window.print();
                    document.body.classList.remove('print-po-mode');
                  }}
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button className="btn btn-danger" onClick={() => setSelectedPo(null)}>
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable PO Container (Original & Duplicate Copies) */}
      {selectedPo && (
        <div className="po-print-container print-only-element">
          {/* Original Copy */}
          <div className="po-print-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: '800' }}>G-PDMS</h2>
                <span style={{ fontSize: '10px', color: '#666' }}>Apparel Park Manufacturing Hub</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>PURCHASE ORDER</h3>
                <span style={{ fontSize: '11px', display: 'block', fontWeight: 'bold' }}>ORIGINAL COPY</span>
                <span style={{ fontSize: '11px', display: 'block' }}>PO #: {selectedPo.poNumber}</span>
                <span style={{ fontSize: '11px', display: 'block' }}>Date: {selectedPo.date}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '11px' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Vendor</span>
                <strong style={{ fontSize: '12px', display: 'block' }}>{selectedPo.vendorName}</strong>
                <span>{selectedPo.vendorEmail}</span>
                <span style={{ display: 'block', color: '#666' }}>{selectedPo.vendorAddress}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Ship To</span>
                <strong style={{ fontSize: '12px', display: 'block' }}>G-PDMS Warehouse</strong>
                <span>Mumbai, India</span>
                <span style={{ display: 'block', color: '#666' }}>Attn: Production Hub</span>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Detail/Description</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Total ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {selectedPo.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px', fontWeight: '600' }}>{it.name}</td>
                    <td style={{ padding: '6px', color: '#555' }}>{it.description || '—'}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{it.qty} {it.unit}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{Number(it.price).toFixed(2)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{(it.qty * it.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px' }}>
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{currencySymbol} {selectedPo.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax ({selectedPo.taxRate}%):</span>
                  <span>{currencySymbol} {selectedPo.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold' }}>
                  <span>Grand Total:</span>
                  <span>{currencySymbol} {selectedPo.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Page Break */}
          <div style={{ pageBreakBefore: 'always', breakBefore: 'page', height: '1px' }}></div>

          {/* Duplicate Copy */}
          <div className="po-print-sheet" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: '800' }}>G-PDMS</h2>
                <span style={{ fontSize: '10px', color: '#666' }}>Apparel Park Manufacturing Hub</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>PURCHASE ORDER</h3>
                <span style={{ fontSize: '11px', display: 'block', fontWeight: 'bold' }}>DUPLICATE COPY</span>
                <span style={{ fontSize: '11px', display: 'block' }}>PO #: {selectedPo.poNumber}</span>
                <span style={{ fontSize: '11px', display: 'block' }}>Date: {selectedPo.date}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '11px' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Vendor</span>
                <strong style={{ fontSize: '12px', display: 'block' }}>{selectedPo.vendorName}</strong>
                <span>{selectedPo.vendorEmail}</span>
                <span style={{ display: 'block', color: '#666' }}>{selectedPo.vendorAddress}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Ship To</span>
                <strong style={{ fontSize: '12px', display: 'block' }}>G-PDMS Warehouse</strong>
                <span>Mumbai, India</span>
                <span style={{ display: 'block', color: '#666' }}>Attn: Production Hub</span>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Detail/Description</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Total ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {selectedPo.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px', fontWeight: '600' }}>{it.name}</td>
                    <td style={{ padding: '6px', color: '#555' }}>{it.description || '—'}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{it.qty} {it.unit}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>0.00</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>0.00</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px' }}>
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{currencySymbol} 0.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax ({selectedPo.taxRate}%):</span>
                  <span>{currencySymbol} 0.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold' }}>
                  <span>Grand Total:</span>
                  <span>{currencySymbol} 0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
