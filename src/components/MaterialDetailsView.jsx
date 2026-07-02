import React, { useState, useEffect, useRef } from 'react';
import { Layers, FileSpreadsheet, PlusCircle, AlertCircle, TrendingDown, DollarSign, Search, Printer, Barcode, ChevronDown, ChevronUp, Trash2, ClipboardCheck, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

// Barcode Renderer Component
const BarcodeVisual = ({ code }) => {
  const seed = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bars = [];
  
  for (let i = 0; i < 30; i++) {
    const width = ((seed * (i + 1)) % 3 === 0) ? 3 : ((seed * (i + 1)) % 5 === 0) ? 2 : 1;
    bars.push(
      <rect 
        key={i} 
        x={i * 4.2} 
        width={width} 
        height={40} 
        fill="#000000" 
      />
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: '8px',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      width: '140px',
      color: '#000000',
      textAlign: 'center',
      margin: '0 auto'
    }}>
      <svg width="120" height="40" viewBox="0 0 130 40">
        <g>{bars}</g>
      </svg>
      <span style={{ 
        fontSize: '9px', 
        fontFamily: 'monospace', 
        fontWeight: 'bold', 
        marginTop: '4px', 
        letterSpacing: '1px',
        color: '#000000'
      }}>
        {code}
      </span>
    </div>
  );
};

export default function MaterialDetailsView({
  materials,
  onAddMaterial,
  onDeleteMaterial,
  currencySymbol = 'R',
  currentUser = null,
  onSubmitApproval = null
}) {
  const isAdmin = currentUser?.role === 'Admin';
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);
  const [printQueue, setPrintQueue] = useState(null);

  // Custom UI Dialog & Validation States
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm, isDanger }
  const [validationError, setValidationError] = useState('');
  const [formError, setFormError] = useState('');

  // Delete request modal state (for non-admin users)
  const [deleteRequestModal, setDeleteRequestModal] = useState(null); // { material }
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteRequestSuccess, setDeleteRequestSuccess] = useState('');

  const handleDeleteClick = (m) => {
    if (isAdmin) {
      setConfirmModal({
        message: `Are you sure you want to delete the material "${m.name}"? This action is permanent.`,
        isDanger: true,
        onConfirm: () => onDeleteMaterial(m.id)
      });
    } else {
      setDeleteRequestModal(m);
      setDeleteReason('');
      setValidationError('');
    }
  };

  const handleSubmitDeleteRequest = () => {
    if (!deleteReason.trim()) {
      setValidationError('Please provide a reason for deletion.');
      return;
    }
    if (onSubmitApproval) {
      onSubmitApproval('material_delete', {
        materialId: deleteRequestModal.id,
        materialName: deleteRequestModal.name,
        reason: deleteReason.trim()
      }, currentUser);
    }
    setDeleteRequestModal(null);
    setDeleteReason('');
    setValidationError('');
    setDeleteRequestSuccess(`Delete request for "${deleteRequestModal.name}" has been submitted for Admin approval.`);
    setTimeout(() => setDeleteRequestSuccess(''), 6000);
  };

  // WebSocket print service connection state
  const [printServiceStatus, setPrintServiceStatus] = useState('disconnected');
  const wsRef = useRef(null);

  useEffect(() => {
    let active = true;
    let socket = null;
    let reconnectTimeout = null;

    const connect = () => {
      if (!active) return;
      console.log("Connecting to Fabric Print Service WebSocket...");
      setPrintServiceStatus('connecting');
      
      socket = new WebSocket('ws://localhost:8765');
      wsRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        socket.send(JSON.stringify({
          type: 'auth',
          token: 'fabric-print-secret-key-2024'
        }));
        setPrintServiceStatus('connected');
        console.log("Print Service WebSocket connected");
      };

      socket.onclose = () => {
        if (!active) return;
        setPrintServiceStatus('disconnected');
        reconnectTimeout = setTimeout(connect, 5000);
        console.log("Print Service WebSocket disconnected - reconnecting in 5s");
      };

      socket.onerror = () => {
        if (!active) return;
        setPrintServiceStatus('error');
      };

      socket.onmessage = (e) => {
        if (!active) return;
        try {
          const res = JSON.parse(e.data);
          console.log("Print Service Response:", res);
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };
    };

    connect();

    return () => {
      active = false;
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const getMaterialBarcodes = (m) => {
    const currentStockCount = Math.max(0, Math.floor(m.stock));
    let currentBarcodes = m.barcodes || [];
    
    if (currentBarcodes.length === currentStockCount) {
      return currentBarcodes;
    }
    
    if (currentBarcodes.length > currentStockCount) {
      return currentBarcodes.slice(0, currentStockCount);
    } else {
      const extraCount = currentStockCount - currentBarcodes.length;
      const extraBarcodes = Array.from(
        { length: extraCount },
        (_, i) => `${m.id}-B${String(currentBarcodes.length + i + 1).padStart(3, '0')}`
      );
      return [...currentBarcodes, ...extraBarcodes];
    }
  };

  const handlePrintBarcodes = (barcodesList, material) => {
    // Check if silent print service is connected
    if (printServiceStatus === 'connected' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      barcodesList.forEach((code, idx) => {
        const match = code.match(/-B(\d+)$/);
        const rollNum = match ? parseInt(match[1]) : idx + 1;

        const payload = {
          type: 'print',
          data: {
            uniqueBarcodeId: code,
            cmfName: 'G-PDMS',
            fabricName: material.name,
            group: material.category || 'General',
            shade: material.color || 'Default',
            weight: "1.0",
            lotNumber: material.id,
            billNumber: 'PO-REC',
            date: new Date().toISOString().split('T')[0],
            location: 'WAREHOUSE',
            receivedPerson: 'Store Operator',
            authorizedPerson: 'Supervisor',
            rollNumber: rollNum,
            totalRolls: barcodesList.length
          }
        };
        wsRef.current.send(JSON.stringify(payload));
      });
      return;
    }

    // Fallback: standard browser printing
    setPrintQueue({ barcodes: barcodesList, name: material.name });
    document.body.classList.add('print-barcodes-only');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-barcodes-only');
      setPrintQueue(null);
    }, 100);
  };

  const handlePrint = () => {
    document.body.classList.add('print-materials-mode');
    window.print();
  };

  const filteredMaterials = materials.filter(m => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      m.id.toLowerCase().includes(query) ||
      m.name.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.color && m.color.toLowerCase().includes(query))
    );
  });

  // Add Material Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fabric');
  const [stock, setStock] = useState(0);
  const [unit, setUnit] = useState('meters');
  const [cost, setCost] = useState(0);
  const [threshold, setThreshold] = useState(50);
  const [color, setColor] = useState('');

  const handleExcelExport = () => {
    // Structure data for Excel sheet
    const excelData = materials.map(m => ({
      'Material ID': m.id,
      'Name': m.name,
      'Category': m.category,
      'Color/Style': m.color || 'Default',
      'Stock Level': m.stock,
      'Unit Of Measure': m.unit,
      'Unit Cost': m.cost,
      'Reorder Threshold': m.threshold,
      'Status': m.stock <= m.threshold ? 'Reorder Required' : 'Optimal'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Materials Inventory');

    // Auto-fit column widths
    const maxColumnLengths = {};
    excelData.forEach(row => {
      Object.keys(row).forEach(key => {
        const value = row[key] ? row[key].toString() : '';
        maxColumnLengths[key] = Math.max(maxColumnLengths[key] || key.length, value.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxColumnLengths).map(key => ({
      wch: maxColumnLengths[key] + 3
    }));

    // Download spreadsheet
    XLSX.writeFile(workbook, 'materials_inventory.xlsx');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter material name');
      return;
    }
    if (stock < 0 || cost < 0) {
      setFormError('Stock level and cost values cannot be negative');
      return;
    }
    setFormError('');

    const materialId = `M${Math.floor(1400 + Math.random() * 8000)}`;
    const generatedBarcodes = Array.from(
      { length: Number(stock) }, 
      (_, i) => `${materialId}-B${String(i + 1).padStart(3, '0')}`
    );

    const newMaterial = {
      id: materialId,
      name,
      category,
      stock: Number(stock),
      unit,
      cost: Number(cost),
      threshold: Number(threshold),
      color: color.trim() || 'Default',
      barcodes: generatedBarcodes
    };

    onAddMaterial(newMaterial);

    // Reset state
    setName('');
    setStock(0);
    setCost(0);
    setThreshold(50);
    setColor('');
    setIsAdding(false);
  };

  return (
    <div className="animate-fade">
      {/* Delete Request Success Banner */}
      {deleteRequestSuccess && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', marginBottom: '20px',
          backgroundColor: 'var(--success-light)', color: 'var(--success)',
          borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(16,185,129,0.2)',
          fontWeight: '600', fontSize: '13px'
        }}>
          <CheckCircle size={18} />
          <span>{deleteRequestSuccess}</span>
        </div>
      )}
      {/* Role Banner for normal users */}
      {!isAdmin && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', marginBottom: '16px',
          backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)',
          borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(99,102,241,0.2)',
          fontSize: '12px', fontWeight: '600'
        }}>
          <AlertCircle size={15} />
          <span>Material deletions require Admin approval. Clicking Delete will submit a request to your Admin.</span>
        </div>
      )}
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '22px', fontWeight: '700' }}>Raw Materials Inventory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Monitor textile fabrics, buttons, zippers, and trims, with reorder status alerts.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }} className="print-hide">
          <button className="btn btn-secondary" onClick={handleExcelExport}>
            <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
            Export to Excel
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} style={{ color: 'var(--accent-color)' }} />
            Print Inventory
          </button>
          {!isAdding && (
            <button className="btn btn-primary" onClick={() => { setIsAdding(true); setFormError(''); }}>
              <PlusCircle size={16} />
              Catalog Material
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        /* Add Material Form panel */
        <div className="panel animate-scale">
          <div className="panel-header">
            <h3 className="panel-title">Add Raw Material to Catalog</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsAdding(false)}>Cancel</button>
          </div>

          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="auth-alert error" style={{ padding: '8px 12px', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Material Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Indigo Denim Raw Roll"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material Category</label>
                <select
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Fabric">Fabric (Cotton, Denim, Silk)</option>
                  <option value="Trim">Trim (Zippers, Buttons, Rivets)</option>
                  <option value="Accessory">Accessory (Labels, Tags, Hangers)</option>
                  <option value="Packaging">Packaging (Poly bags, Cartons)</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select
                  className="form-input"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="meters">Meters</option>
                  <option value="yards">Yards</option>
                  <option value="rolls">Rolls</option>
                  <option value="pieces">Pieces</option>
                  <option value="kg">Kgs</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Unit Cost Price ({currencySymbol})</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 15.50"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Critical Reorder Threshold (Min Qty)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="50"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color / Style Reference Description</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Bleached Dark Blue, Matte Gold"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Catalog Material</button>
            </div>
          </form>
        </div>
      )}

      {/* Materials Table Listing */}
      <div className="panel materials-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="panel-title" style={{ margin: 0 }}>
            <Layers size={18} className="text-accent" />
            Materials Stock Database
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="print-hide">
            {/* Print Service Connection Status */}
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '600', 
              color: printServiceStatus === 'connected' ? 'var(--success)' : printServiceStatus === 'connecting' ? 'var(--warning)' : 'var(--text-light)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-primary)',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              marginRight: '8px'
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: printServiceStatus === 'connected' ? 'var(--success)' : printServiceStatus === 'connecting' ? 'var(--warning)' : 'var(--text-light)',
                display: 'inline-block'
              }} />
              {printServiceStatus === 'connected' 
                ? 'Print Service Connected' 
                : printServiceStatus === 'connecting' 
                  ? 'Connecting Print Service...' 
                  : 'Print Service Offline (Fallback Dialog)'
              }
            </span>
            <div style={{ position: 'relative', width: '220px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Search size={14} />
              </span>
              <input
                type="text"
                className="form-input"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px', height: '32px', fontSize: '13px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', width: '100%' }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Search size={12} />
              <span>Search</span>
            </button>
            {searchQuery && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchQuery('')}
                style={{ height: '32px', padding: '0 8px' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Material Details</th>
                <th>Category</th>
                <th>Color/Style</th>
                <th>Stock Quantity</th>

                <th>Stock Status</th>
                <th className="print-hide" style={{ textAlign: 'center', width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No materials found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m) => {
                  const isLow = m.stock <= m.threshold;
                  const percentage = Math.min((m.stock / (m.threshold * 3.5)) * 100, 100);
                  const barColor = isLow ? 'var(--danger)' : percentage < 50 ? 'var(--warning)' : 'var(--success)';
                  const barcodes = getMaterialBarcodes(m);

                  return (
                    <React.Fragment key={m.id}>
                      <tr>
                        <td 
                          style={{ fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={() => setExpandedMaterialId(expandedMaterialId === m.id ? null : m.id)}
                          title="Click to view/print item barcodes"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {expandedMaterialId === m.id ? <ChevronUp size={14} style={{ color: 'var(--accent-color)' }} /> : <ChevronDown size={14} />}
                            <span>{m.id}</span>
                            <Barcode size={14} style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
                          </div>
                        </td>
                        <td>
                          <strong style={{ display: 'block', fontSize: '14px' }}>{m.name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Threshold: {m.threshold} {m.unit}</span>
                        </td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-main)' }}>
                            {m.category}
                          </span>
                        </td>
                        <td>{m.color || 'Default'}</td>
                        <td>
                          <strong style={{ fontSize: '14px' }}>{m.stock.toLocaleString()}</strong> {m.unit}
                          <div className="stock-progress-bar">
                            <div
                              className="stock-progress-fill"
                              style={{ width: `${percentage}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </td>

                        <td>
                          {isLow ? (
                            <span className="status-badge rejected" style={{ display: 'flex', gap: '4px', alignItems: 'center', width: 'fit-content' }}>
                              <AlertCircle size={12} /> Low Stock
                            </span>
                          ) : (
                            <span className="status-badge verified">In Stock</span>
                          )}
                        </td>
                        <td className="print-hide" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleDeleteClick(m)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: 'var(--danger)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title={isAdmin ? `Delete ${m.name}` : `Request deletion of ${m.name} (requires Admin approval)`}
                          >
                            <Trash2 size={13} />
                            {!isAdmin && <span style={{ fontSize: '9px', fontWeight: '700' }}>REQ</span>}
                          </button>
                        </td>
                      </tr>
                      {expandedMaterialId === m.id && (
                        <tr>
                          <td colSpan="8" style={{ padding: '16px', backgroundColor: 'var(--bg-primary)' }}>
                            <div style={{ 
                              backgroundColor: 'var(--bg-secondary)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: 'var(--border-radius-sm)', 
                              padding: '16px' 
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Barcode size={16} className="text-accent" />
                                    Unique Item Registry & Barcodes ({m.stock} {m.unit})
                                  </h4>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Each roll or piece of this material has a unique serial barcode for individual stock tracking.
                                  </p>
                                </div>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handlePrintBarcodes(barcodes, m)}
                                  disabled={barcodes.length === 0}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', fontSize: '11px' }}
                                >
                                  <Printer size={12} />
                                  <span>Print All Labels ({barcodes.length})</span>
                                </button>
                              </div>

                              {barcodes.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                  No items registered (Stock level is 0).
                                </div>
                              ) : (
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                                  gap: '12px',
                                  maxHeight: '260px',
                                  overflowY: 'auto',
                                  paddingRight: '6px'
                                }}>
                                  {barcodes.map((code) => (
                                    <div 
                                      key={code} 
                                      style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        backgroundColor: 'var(--bg-primary)', 
                                        padding: '10px', 
                                        borderRadius: '6px', 
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-sm)'
                                      }}
                                    >
                                      <BarcodeVisual code={code} />
                                      <button 
                                        className="btn btn-secondary btn-sm" 
                                        style={{ marginTop: '8px', width: '100%', fontSize: '10px', height: '24px', padding: '0 8px' }}
                                        onClick={() => handlePrintBarcodes([code], m)}
                                      >
                                        <Printer size={10} />
                                        <span>Print Label</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Invisible print-only barcode sheet */}
      {printQueue && (
        <div className="barcode-print-sheet" style={{ display: 'none' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            backgroundColor: '#ffffff',
            padding: '20px',
            color: '#000000',
            fontFamily: 'monospace'
          }}>
            {printQueue.barcodes.map((code) => (
              <div 
                key={code} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '12px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px',
                  pageBreakInside: 'avoid',
                  textAlign: 'center',
                  backgroundColor: '#ffffff'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', color: '#334155' }}>
                  {printQueue.name}
                </span>
                <BarcodeVisual code={code} />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Delete Request Modal (Non-Admin Users) */}
      {deleteRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} style={{ color: 'var(--danger)' }} />
                Request Material Deletion
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setDeleteRequestModal(null)}>Cancel</button>
            </div>

            <div style={{ padding: '4px 0 16px' }}>
              {/* Material Info */}
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px',
                backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Material to Delete</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{deleteRequestModal.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ID: {deleteRequestModal.id} &bull; {deleteRequestModal.category} &bull; Stock: {deleteRequestModal.stock} {deleteRequestModal.unit}
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                You do not have permission to delete materials directly. Your request will be sent to an Admin for review.
              </p>
              {validationError && (
                <div className="auth-alert error" style={{ padding: '8px 12px', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason for Deletion <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Obsolete material, replaced by new stock, duplicated entry..."
                  value={deleteReason}
                  onChange={(e) => {
                    setDeleteReason(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteRequestModal(null)}>Cancel</button>
              <button
                className="btn"
                onClick={handleSubmitDeleteRequest}
                style={{
                  backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none',
                  padding: '8px 20px', borderRadius: 'var(--border-radius-sm)',
                  fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <ClipboardCheck size={14} />
                Submit for Admin Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content animate-scale" style={{ maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: confirmModal.isDanger ? 'var(--danger)' : 'var(--text-main)' }}>Confirm Action</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.4' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                style={{
                  backgroundColor: confirmModal.isDanger ? 'var(--danger)' : 'var(--accent-color)',
                  color: '#fff',
                  border: 'none'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
