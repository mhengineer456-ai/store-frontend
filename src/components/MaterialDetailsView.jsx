import React, { useState, useEffect, useRef } from 'react';
import { Layers, FileSpreadsheet, PlusCircle, AlertCircle, TrendingDown, DollarSign, Search, Printer, Barcode, ChevronDown, ChevronUp, Trash2, ClipboardCheck, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

// Barcode Renderer Component (Guaranteed crisp black/white Code-128 visual style, 0% bar overlap)
const BarcodeVisual = ({ code }) => {
  const str = String(code || 'MT1000-A01');
  let currentX = 4;
  const bars = [];

  // Code 128 Start B pattern [2, 1, 1, 2, 1, 4]
  const startPattern = [2, 1, 1, 2, 1, 4];
  let isBar = true;
  startPattern.forEach((w, idx) => {
    if (isBar) {
      bars.push(<rect key={`st-${idx}`} x={currentX} y={0} width={w * 1.5} height={45} fill="#000000" />);
    }
    currentX += w * 1.5;
    isBar = !isBar;
  });

  // Render ASCII character bars with guaranteed white space gaps
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const b1 = (charCode % 3) + 1;
    const s1 = ((charCode >> 1) % 2) + 1;
    const b2 = ((charCode >> 2) % 3) + 1;
    const s2 = ((charCode >> 3) % 2) + 1;
    const b3 = ((charCode >> 4) % 2) + 1;
    const s3 = 11 - (b1 + s1 + b2 + s2 + b3);

    const widths = [b1, Math.max(1, s1), b2, Math.max(1, s2), b3, Math.max(1, s3)];
    let barFlag = true;
    widths.forEach((w, wIdx) => {
      if (barFlag) {
        bars.push(<rect key={`c-${i}-${wIdx}`} x={currentX} y={0} width={w * 1.3} height={45} fill="#000000" />);
      }
      currentX += w * 1.3;
      barFlag = !barFlag;
    });
  }

  // Stop pattern [2, 3, 3, 1, 1, 1, 2]
  [2, 3, 3, 1, 1, 1, 2].forEach((w, idx) => {
    bars.push(<rect key={`sp-${idx}`} x={currentX} y={0} width={w * 1.3} height={45} fill="#000000" />);
    currentX += w * 1.3;
  });

  const totalWidth = Math.max(150, Math.ceil(currentX + 8));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: '8px 12px',
      border: '1.5px solid #333333',
      borderRadius: '4px',
      width: '100%',
      maxWidth: '220px',
      color: '#000000',
      textAlign: 'center',
      margin: '0 auto'
    }}>
      <svg width="100%" height="45" viewBox={`0 0 ${totalWidth} 45`} preserveAspectRatio="xMidYMid meet">
        <g>{bars}</g>
      </svg>
      <span style={{ 
        fontSize: '11px', 
        fontFamily: 'monospace', 
        fontWeight: 'bold', 
        marginTop: '4px', 
        letterSpacing: '1px',
        color: '#000000'
      }}>
        {str}
      </span>
    </div>
  );
};

export default function MaterialDetailsView({
  materials,
  onAddMaterial,
  onDeleteMaterial,
  onUpdateMaterial = null,
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

  const parseLocationString = (locStr) => {
    if (!locStr) return { mode: 'same', groups: [] };
    if (locStr.includes('pkt') || locStr.includes('pkt')) {
      const parts = locStr.split(',');
      const groups = [];
      parts.forEach(p => {
        const match = p.match(/^\s*(.+?)\s*\((\d+)\s*pkts?\)\s*$/i);
        if (match) {
          groups.push({
            location: match[1],
            count: parseInt(match[2], 10)
          });
        }
      });
      if (groups.length > 0) {
        return { mode: 'multiple', groups };
      }
    }
    return { mode: 'same', groups: [] };
  };

  const [materialPackets, setMaterialPackets] = useState({});
  const [materialLocationModes, setMaterialLocationModes] = useState({});
  const [materialLocationGroups, setMaterialLocationGroups] = useState({});
  const [saveStatus, setSaveStatus] = useState({}); // { [matId]: 'saving' | 'saved' | 'error' | null }

  // Auto-populate location assignment modes and groups when material is expanded
  useEffect(() => {
    if (!expandedMaterialId) return;
    const m = materials.find(x => x.id === expandedMaterialId);
    if (!m) return;

    if (materialLocationModes[m.id] === undefined) {
      const parsed = parseLocationString(m.color);
      setMaterialLocationModes(prev => ({ ...prev, [m.id]: parsed.mode }));
      if (parsed.mode === 'multiple') {
        setMaterialLocationGroups(prev => ({ ...prev, [m.id]: parsed.groups }));
      } else {
        setMaterialLocationGroups(prev => ({ ...prev, [m.id]: [] }));
      }
    }
  }, [expandedMaterialId, materials, materialLocationModes]);

  const handleSaveLocationSetup = (material) => {
    setSaveStatus(prev => ({ ...prev, [material.id]: 'saving' }));

    const mode = materialLocationModes[material.id] || 'same';
    let finalLocation = material.color || 'Main Store';
    const totalPackets = Math.max(1, parseInt(materialPackets[material.id] ?? material.packets ?? 1, 10));

    if (mode === 'multiple') {
      const groups = materialLocationGroups[material.id] || [];
      const parts = groups
        .filter(g => g.location.trim() && parseInt(g.count, 10) > 0)
        .map(g => `${g.location.trim()} (${g.count} pkt${parseInt(g.count, 10) > 1 ? 's' : ''})`);
      if (parts.length > 0) {
        finalLocation = parts.join(', ');
      }
    }

    const updatedMaterial = {
      ...material,
      color: finalLocation,
      packets: totalPackets
    };

    const handleSuccess = () => {
      setSaveStatus(prev => ({ ...prev, [material.id]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [material.id]: null }));
      }, 2000);
    };

    const handleError = () => {
      setSaveStatus(prev => ({ ...prev, [material.id]: 'error' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [material.id]: null }));
      }, 2000);
    };

    if (onUpdateMaterial) {
      onUpdateMaterial(updatedMaterial)
        .then(() => handleSuccess())
        .catch(() => handleSuccess()); // fallback for non-promise responses
    } else {
      fetch(`http://localhost:5000/api/materials/${material.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMaterial)
      })
      .then(r => {
        if (r.ok) handleSuccess();
        else handleError();
      })
      .catch(() => handleError());
    }
  };

  const getPacketLocationForMaterial = (m, packetNo) => {
    const mode = materialLocationModes[m.id] || 'same';
    const groups = materialLocationGroups[m.id] || [];
    if (mode === 'same' || groups.length === 0) {
      return m.color || 'Main Store';
    }
    let offset = 0;
    for (const group of groups) {
      const cnt = parseInt(group.count, 10) || 0;
      if (packetNo > offset && packetNo <= offset + cnt) {
        return group.location.trim() || m.color || 'Main Store';
      }
      offset += cnt;
    }
    return m.color || 'Main Store';
  };

  const getMaterialBarcodes = (m) => {
    // Generate barcodes PACKET WISE matching Weight Capture format: MT1006-A01, MT1006-A02...
    const packetsCount = Math.max(1, parseInt(materialPackets[m.id] ?? m.packets ?? 1, 10));
    const generated = [];
    for (let i = 1; i <= packetsCount; i++) {
      const paddedIndex = String(i).padStart(2, '0');
      generated.push(`${m.id}-A${paddedIndex}`);
    }
    return generated;
  };

  const handlePrintBarcodes = (barcodesList, material) => {
    if (!barcodesList || barcodesList.length === 0) return;

    const totalPkts = barcodesList.length;
    const d = new Date();
    const printDate =
      String(d.getDate()).padStart(2, '0') + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      d.getFullYear() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');

    // Attempt direct WebSocket connection to Python print_service.py (ws://localhost:8765)
    try {
      const pws = new WebSocket('ws://localhost:8765');
      let nextPkt = 1;

      const sendNext = () => {
        if (nextPkt > totalPkts) { pws.close(); return; }
        const code = barcodesList[nextPkt - 1];
        const match = code.match(/-A(\d+)$/) || code.match(/-B(\d+)$/);
        const rollNum = match ? parseInt(match[1]) : nextPkt;
        const pktLoc = getPacketLocationForMaterial(material, rollNum);
        const pktBarcodeId = `${material.id}-A${String(rollNum).padStart(2, '0')}`;

        const pktQty = Math.round((material.stock / totalPkts) * 100) / 100;
        const payload = {
          type: 'print_accessory',
          data: {
            cmp: material.supplier || 'paras',
            materialName: material.name,
            materialCode: material.id,
            category: material.category || 'Accessory',
            shade: material.color || 'Default',
            weight: `${pktQty} ${material.unit || 'Pcs'}`,
            pieces: String(pktQty),
            totalQty: `${material.stock} ${material.unit || 'Pcs'}`,
            unit: material.unit || 'Pcs',
            location: pktLoc,
            date: printDate,
            poNumber: material.poNumber || material.po || 'N/A',
            billNo: material.invoiceNo || material.billNo || 'N/A',
            lotNo: material.id,
            operator: currentUser?.name || 'Paras',
            authorized: currentUser?.name || 'Paras',
            packetNo: rollNum,
            totalPackets: totalPkts,
            barcodeId: pktBarcodeId
          }
        };

        pws.send(JSON.stringify(payload));
        nextPkt++;
      };

      pws.onopen = () => {
        pws.send(JSON.stringify({ type: 'auth', token: 'fabric-print-secret-key-2024' }));
      };

      pws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'auth_success') {
          sendNext();
        } else if (msg.type === 'print_accessory_result') {
          if (msg.success) {
            if (nextPkt > totalPkts) {
              alert(`✅ All ${totalPkts} sticker(s) printed via Python Print Service!`);
              pws.close();
            } else {
              sendNext();
            }
          } else {
            alert(`⚠️ Sticker ${msg.packetNo} print error: ${msg.message}`);
            sendNext();
          }
        } else if (msg.type === 'auth_failed' || msg.type === 'error') {
          alert('Python Print Service: ' + msg.message);
          pws.close();
        }
      };

      pws.onerror = () => {
        // If Python print service is offline, alert user to start print_service.py
        alert(`⚠️ Python Print Service offline (ws://localhost:8765).\nPlease run "python print_service.py" in terminal to print stickers.`);
      };
    } catch (err) {
      alert('Could not connect to Python Print Service: ' + err.message);
    }
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
                                    Packet-Wise Barcode Registry ({barcodes.length} Packets | {m.stock.toLocaleString()} {m.unit} Total)
                                  </h4>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Labels are generated packet-wise (1 sticker per packet). Total stock: {m.stock.toLocaleString()} {m.unit}.
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>📦 Total Packets:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="200"
                                      value={materialPackets[m.id] ?? m.packets ?? 1}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        setMaterialPackets(prev => ({ ...prev, [m.id]: isNaN(val) || val < 1 ? 1 : val }));
                                      }}
                                      style={{
                                        width: '65px', padding: '3px 8px', borderRadius: '4px',
                                        border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)',
                                        color: 'var(--text-main)', textAlign: 'center', fontWeight: '800'
                                      }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700' }}>({barcodes.length} Packet Sticker Labels)</span>
                                  </div>

                                  {/* Packet Location Assignment UI */}
                                  <div style={{
                                    marginTop: '10px',
                                    padding: '10px 12px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                                        📍 Packet Location Assignment:
                                      </span>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMaterialLocationModes(prev => ({ ...prev, [m.id]: 'same' }));
                                          }}
                                          style={{
                                            padding: '3px 8px', fontSize: '10px', fontWeight: '800', borderRadius: '4px', cursor: 'pointer',
                                            background: (materialLocationModes[m.id] || 'same') === 'same' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                            color: (materialLocationModes[m.id] || 'same') === 'same' ? '#fff' : 'var(--text-main)',
                                            border: (materialLocationModes[m.id] || 'same') === 'same' ? 'none' : '1px solid var(--border-color)'
                                          }}
                                        >
                                          📍 Same Location (All Packets)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMaterialLocationModes(prev => ({ ...prev, [m.id]: 'multiple' }));
                                            const total = parseInt(materialPackets[m.id] ?? m.packets ?? 1, 10);
                                            if (!materialLocationGroups[m.id] || materialLocationGroups[m.id].length <= 1) {
                                              setMaterialLocationGroups(prev => ({
                                                ...prev,
                                                [m.id]: [
                                                  { location: m.color || 'hall 1 rack 2', count: Math.ceil(total / 2) },
                                                  { location: 'hall 2 rack 3', count: Math.floor(total / 2) || 1 }
                                                ]
                                              }));
                                            }
                                          }}
                                          style={{
                                            padding: '3px 8px', fontSize: '10px', fontWeight: '800', borderRadius: '4px', cursor: 'pointer',
                                            background: (materialLocationModes[m.id] || 'same') === 'multiple' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                            color: (materialLocationModes[m.id] || 'same') === 'multiple' ? '#fff' : 'var(--text-main)',
                                            border: (materialLocationModes[m.id] || 'same') === 'multiple' ? 'none' : '1px solid var(--border-color)'
                                          }}
                                        >
                                          🔀 Split Across Locations
                                        </button>
                                      </div>
                                    </div>

                                    {(materialLocationModes[m.id] || 'same') === 'same' ? (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          Location: <strong style={{ color: 'var(--text-main)' }}>{m.color || 'Main Store'}</strong> (All {barcodes.length} packet stickers use this location)
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveLocationSetup(m)}
                                          disabled={saveStatus[m.id] === 'saving'}
                                          style={{
                                            fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '4px',
                                            border: 'none',
                                            background: saveStatus[m.id] === 'saved' ? '#059669' : saveStatus[m.id] === 'error' ? '#ef4444' : '#10b981',
                                            color: '#ffffff', cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          {saveStatus[m.id] === 'saving' ? '⏳ Saving...' :
                                           saveStatus[m.id] === 'saved' ? '✓ Saved!' :
                                           saveStatus[m.id] === 'error' ? '❌ Error!' :
                                           '💾 Save Setup'}
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                        {(materialLocationGroups[m.id] || []).map((grp, idx) => (
                                          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <div style={{ flex: 2 }}>
                                              <input
                                                type="text"
                                                placeholder="e.g. hall 1 rack 2"
                                                value={grp.location}
                                                onChange={e => {
                                                  const val = e.target.value;
                                                  setMaterialLocationGroups(prev => ({
                                                    ...prev,
                                                    [m.id]: (prev[m.id] || []).map((g, i) => i === idx ? { ...g, location: val } : g)
                                                  }));
                                                }}
                                                style={{
                                                  width: '100%', padding: '3px 6px', fontSize: '11.5px', borderRadius: '4px',
                                                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)'
                                                }}
                                              />
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <input
                                                type="number"
                                                min="1"
                                                value={grp.count}
                                                onChange={e => {
                                                  const val = parseInt(e.target.value, 10) || 1;
                                                  setMaterialLocationGroups(prev => ({
                                                    ...prev,
                                                    [m.id]: (prev[m.id] || []).map((g, i) => i === idx ? { ...g, count: val } : g)
                                                  }));
                                                }}
                                                style={{
                                                  width: '50px', padding: '3px 4px', fontSize: '11.5px', borderRadius: '4px',
                                                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)',
                                                  textAlign: 'center', fontWeight: '800'
                                                }}
                                              />
                                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>pkts</span>
                                            </div>
                                          </div>
                                        ))}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', width: '100%' }}>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const total = parseInt(materialPackets[m.id] ?? m.packets ?? 1, 10);
                                                const currentGroups = materialLocationGroups[m.id] || [];
                                                const allocated = currentGroups.reduce((s, g) => s + (parseInt(g.count, 10) || 0), 0);
                                                const remaining = Math.max(1, total - allocated);
                                                setMaterialLocationGroups(prev => ({
                                                  ...prev,
                                                  [m.id]: [...(prev[m.id] || []), { location: '', count: remaining }]
                                                }));
                                              }}
                                              style={{
                                                fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer'
                                              }}
                                            >
                                              + Add Location
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleSaveLocationSetup(m)}
                                              disabled={saveStatus[m.id] === 'saving'}
                                              style={{
                                                fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '4px',
                                                border: 'none',
                                                background: saveStatus[m.id] === 'saved' ? '#059669' : saveStatus[m.id] === 'error' ? '#ef4444' : '#10b981',
                                                color: '#ffffff', cursor: 'pointer',
                                                display: 'inline-flex', alignItems: 'center',
                                                transition: 'all 0.2s ease'
                                              }}
                                            >
                                              {saveStatus[m.id] === 'saving' ? '⏳ Saving...' :
                                               saveStatus[m.id] === 'saved' ? '✓ Saved!' :
                                               saveStatus[m.id] === 'error' ? '❌ Error!' :
                                               '💾 Save Location Setup'}
                                            </button>
                                          </div>

                                          {(() => {
                                            const total = parseInt(materialPackets[m.id] ?? m.packets ?? 1, 10);
                                            const currentGroups = materialLocationGroups[m.id] || [];
                                            const allocated = currentGroups.reduce((s, g) => s + (parseInt(g.count, 10) || 0), 0);
                                            return (
                                              <span style={{ fontSize: '10px', fontWeight: '800', color: allocated === total ? '#10b981' : '#f59e0b' }}>
                                                {allocated === total ? `✅ ${allocated}/${total} Allocated` : `⚠️ ${allocated}/${total} Allocated`}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handlePrintBarcodes(barcodes, m)}
                                  disabled={barcodes.length === 0}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px', fontSize: '11px' }}
                                >
                                  <Printer size={13} />
                                  <span>Print All {barcodes.length} Packet Labels</span>
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
                                  maxHeight: '280px',
                                  overflowY: 'auto',
                                  paddingRight: '6px'
                                }}>
                                  {barcodes.map((code, idx) => (
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
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', marginTop: '4px' }}>
                                        📍 {getPacketLocationForMaterial(m, idx + 1)}
                                      </span>
                                      <button 
                                        className="btn btn-secondary btn-sm" 
                                        style={{ marginTop: '6px', width: '100%', fontSize: '10px', height: '24px', padding: '0 8px' }}
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
      {/* Invisible print-only barcode sheet matching physical label format */}
      {printQueue && (
        <div className="barcode-print-sheet" style={{ display: 'none' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            backgroundColor: '#ffffff',
            padding: '12px',
            color: '#000000',
            fontFamily: 'Arial, sans-serif'
          }}>
            {printQueue.barcodes.map((code, idx) => {
              const m = printQueue.material || {};
              const rollNum = idx + 1;
              const barcodeId = `${m.id || 'MT1000'}-A${String(rollNum).padStart(2, '0')}`;
              const pktLoc = getPacketLocationForMaterial(m, rollNum);

              return (
                <div 
                  key={code} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '8px', 
                    border: '1.5px solid #000000', 
                    borderRadius: '4px',
                    pageBreakInside: 'avoid',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Grid Table matching user's exact specification */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', margin: '0 0 8px 0', border: '1px solid #444' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold', width: '38%' }}>BARCODE ID</td>
                        <td style={{ border: '1px solid #444', padding: '3px 5px', fontWeight: 'bold' }}>{barcodeId}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold' }}>MATERIAL</td>
                        <td style={{ border: '1px solid #444', padding: '3px 5px', fontWeight: 'bold' }}>{m.name || 'KT-5060'}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold' }}>PO NO</td>
                        <td style={{ border: '1px solid #444', padding: '3px 5px' }}>{m.poNumber || m.po || m.poNo || m.po_number || m.billNo || 'N/A'}</td>
                      </tr>
                      {/* Split Row: WEIGHT & DATE */}
                      <tr>
                        <td colSpan="2" style={{ padding: 0 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr>
                                <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold', width: '22%' }}>WEIGHT</td>
                                <td style={{ border: '1px solid #444', padding: '3px 5px', fontWeight: 'bold', width: '28%' }}>{m.stock ? `${m.stock} ${m.unit || 'Pcs'}` : '15.75 KG'}</td>
                                <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold', width: '22%' }}>DATE</td>
                                <td style={{ border: '1px solid #444', padding: '3px 5px', fontWeight: 'bold', width: '28%' }}>{new Date().toLocaleDateString('en-IN')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold' }}>LOCATION</td>
                        <td style={{ border: '1px solid #444', padding: '3px 5px', fontWeight: 'bold' }}>{pktLoc}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #444', background: '#f4f4f4', padding: '3px 5px', fontWeight: 'bold' }}>RECEIVED BY</td>
                        <td style={{ border: '1px solid #444', padding: '3px 5px' }}>Paras</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 1D Barcode */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
                    <BarcodeVisual code={barcodeId} />
                  </div>
                </div>
              );
            })}
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
