import React, { useState, useEffect } from 'react';
import {
  Search, Clock, User, ClipboardList, CheckCircle, XCircle,
  Scissors, Shuffle, Truck, QrCode, ShieldCheck, AlertCircle, FileText
} from 'lucide-react';

const formatDateTime = (dateVal) => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();

  // Handle dd/mm/yyyy hh:mm or dd/mm/yyyy
  const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?(?:\s*(AM|PM))?/i;
  const match = str.match(dmyRegex);

  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    const hour = match[4];
    const minute = match[5];
    const ampm = match[6];

    if (hour && minute) {
      if (ampm) {
        return `${day}/${month}/${year} ${hour.padStart(2, '0')}:${minute} ${ampm.toUpperCase()}`;
      }
      let hr = parseInt(hour, 10);
      const calculatedAmPm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12;
      hr = hr ? hr : 12;
      return `${day}/${month}/${year} ${String(hr).padStart(2, '0')}:${minute} ${calculatedAmPm}`;
    }
    return `${day}/${month}/${year}`;
  }

  // Try JS standard Date parsing
  try {
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(',', '');
    }
  } catch (e) { }

  return str;
};

const parseToDateObject = (dateVal) => {
  if (!dateVal) return new Date(0);

  // Handle string like 'Fri Sep 19 2025 15:42:22 GMT...' or ISO strings
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  const str = String(dateVal).trim();
  const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?(?:\s*(AM|PM))?/i;
  const match = str.match(dmyRegex);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    let hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const ampm = match[6];

    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }

    return new Date(year, month, day, hour, minute);
  }

  return new Date(0);
};

export default function HistoryView({ designs = [], currencySymbol = 'R', currentUser }) {
  const [selectedLotId, setSelectedLotId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists fetched from backend
  const [historyLogs, setHistoryLogs] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  const [cuttingHeaders, setCuttingHeaders] = useState([]);
  const [dooriOrders, setDooriOrders] = useState([]);
  const [pos, setPOs] = useState([]);
  const [issueLogs, setIssueLogs] = useState([]);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all history data from backend on mount
  useEffect(() => {
    const fetchHistoryData = async () => {
      setIsLoading(true);
      setErrorMessage('');
      const hostname = window.location.hostname;
      const backendUrl = `http://${hostname}:5000`;

      try {
        const [historyRes, scansRes, headersRes, dooriRes, posRes, issueRes] = await Promise.all([
          fetch(`${backendUrl}/api/design-history`),
          fetch(`${backendUrl}/api/scans`),
          fetch(`${backendUrl}/api/cutting-headers`),
          fetch(`${backendUrl}/api/doori-orders`),
          fetch(`${backendUrl}/api/pos`),
          fetch(`${backendUrl}/api/issue-logs`)
        ]);

        if (historyRes.ok) setHistoryLogs(await historyRes.json());
        if (scansRes.ok) setScanLogs(await scansRes.json());
        if (headersRes.ok) setCuttingHeaders(await headersRes.json());
        if (dooriRes.ok) setDooriOrders(await dooriRes.json());
        if (posRes.ok) setPOs(await posRes.json());
        if (issueRes.ok) setIssueLogs(await issueRes.json());
      } catch (err) {
        console.error('Failed to load history lists:', err);
        setErrorMessage('Failed to connect to the backend server. Make sure port 5000 is running.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, []);

  // Filter approved/verification lot list for selection
  const filteredLotsList = designs.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.id.toLowerCase().includes(q) ||
      (d.style || '').toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.brand || '').toLowerCase().includes(q)
    );
  });

  const selectedDesign = designs.find(d => d.id === selectedLotId);

  // Compile timeline events dynamically for the selected lot ID
  const getTimelineEvents = () => {
    if (!selectedLotId) return [];

    const events = [];
    const lotIdLower = selectedLotId.toLowerCase();

    // 1. Milestone: Design Registration
    if (selectedDesign) {
      const regTime = selectedDesign.created_at || selectedDesign.date;
      events.push({
        type: 'registration',
        title: 'Design Pack Registered',
        timestamp: formatDateTime(regTime) || 'Initial Stage',
        dateObj: parseToDateObject(regTime),
        actor: selectedDesign.designer || 'System',
        icon: <FileText size={16} />,
        color: '#3b82f6',
        details: (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '6px' }}>
            <div><strong>Style:</strong> {selectedDesign.style || 'N/A'}</div>
            <div><strong>Category:</strong> {selectedDesign.category || 'N/A'}</div>
            <div><strong>Brand/Client:</strong> {selectedDesign.brand || 'N/A'}</div>
            <div><strong>Fabric Type:</strong> {selectedDesign.fabricType || 'N/A'}</div>
            <div><strong>Target Pieces:</strong> {selectedDesign.quantity || 100} pcs</div>
            <div><strong>Status:</strong> {selectedDesign.status}</div>
          </div>
        )
      });
    }

    // 2. Milestone: Technical Verification Approvals/Rejections (from design_history table)
    const lotHistory = historyLogs.filter(h => String(h.lotId).toLowerCase() === lotIdLower);
    lotHistory.forEach(h => {
      const isApprove = h.action === 'approved';
      events.push({
        type: 'verification',
        title: isApprove ? 'Technical Verification Approved' : 'Technical Verification Update',
        timestamp: formatDateTime(h.timestamp),
        dateObj: parseToDateObject(h.timestamp),
        actor: h.actorName || 'Admin',
        icon: isApprove ? <ShieldCheck size={16} /> : <AlertCircle size={16} />,
        color: isApprove ? '#10b981' : '#ef4444',
        details: (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <p><strong>Action:</strong> {h.action?.toUpperCase()}</p>
            {h.details && <p><strong>Comments:</strong> {h.details}</p>}
          </div>
        )
      });
    });

    // 3. Milestone: General Purchase Orders (PO) compiled
    const matchingPOs = pos.filter(po =>
      (po.designName && String(po.designName).toLowerCase() === lotIdLower) ||
      (po.poNumber && String(po.poNumber).toLowerCase() === lotIdLower)
    );
    matchingPOs.forEach(po => {
      let parsedItems = [];
      try {
        parsedItems = typeof po.items === 'string' ? JSON.parse(po.items) : po.items || [];
      } catch (e) { }

      events.push({
        type: 'po_general',
        title: `Trim Purchase Order Issued (${po.poNumber})`,
        timestamp: formatDateTime(po.date) || 'Processed',
        dateObj: parseToDateObject(po.date),
        actor: 'Purchasing',
        icon: <ClipboardList size={16} />,
        color: '#6366f1',
        details: (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <p><strong>Supplier:</strong> {po.vendorName}</p>
            <p><strong>Total Amount:</strong> {currencySymbol}{po.total?.toFixed(2)}</p>
            <p><strong>PO Status:</strong> <span className={`status-badge ${po.status?.toLowerCase() === 'approved' ? 'verified' : 'pending'}`}>{po.status}</span></p>
            {parsedItems.length > 0 && (
              <table style={{ width: '100%', marginTop: '6px', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '4px' }}>Item</th>
                    <th style={{ padding: '4px', textAlign: 'right' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '4px' }}>{item.description}</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>{item.qty} {item.uom || 'pcs'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      });
    });

    // 4. Milestone: Zip PO compiled selection caches (from cutting_headers table)
    const matchingZipHeader = cuttingHeaders.find(h => String(h.Lot_Number).toLowerCase() === lotIdLower);
    if (matchingZipHeader && matchingZipHeader.zip_payload) {
      let zipPayload = null;
      try {
        zipPayload = JSON.parse(matchingZipHeader.zip_payload);
      } catch (e) { }

      if (zipPayload) {
        const zipTime = matchingZipHeader.Saved_At || selectedDesign?.date;
        events.push({
          type: 'zip_po_created',
          title: 'Zip PO Selection Compiled',
          timestamp: formatDateTime(zipTime) || 'Processed',
          dateObj: parseToDateObject(zipTime),
          actor: matchingZipHeader.Supervisor || 'Storekeeper',
          icon: <Scissors size={16} />,
          color: '#ec4899',
          details: (
            <div style={{ fontSize: '12px', marginTop: '6px' }}>
              <p><strong>Priority:</strong> {matchingZipHeader.Priority || 'Normal'}</p>
              <p><strong>Fabric:</strong> {matchingZipHeader.Fabric || 'N/A'}</p>
              {zipPayload.zipSelections && zipPayload.zipSelections.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <strong>Selected Zippers:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {zipPayload.zipSelections.map((sel, idx) => (
                      <span key={idx} className="status-badge" style={{ fontSize: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        {sel.placement}: {sel.color} ({sel.zipperType})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        });
      }
    }

    // 5. Milestone: Doori PO compiled selection caches (from doori_orders table)
    const matchingDooriOrder = dooriOrders.find(h => String(h.Lot_Number).toLowerCase() === lotIdLower);
    if (matchingDooriOrder && matchingDooriOrder.dori_payload) {
      let doriPayload = null;
      try {
        doriPayload = JSON.parse(matchingDooriOrder.dori_payload);
      } catch (e) { }

      if (doriPayload) {
        const doriTime = matchingDooriOrder.Timestamp || selectedDesign?.date;
        events.push({
          type: 'doori_po_created',
          title: 'Thread / Doori PO Compiled',
          timestamp: formatDateTime(doriTime) || 'Processed',
          dateObj: parseToDateObject(doriTime),
          actor: doriPayload.supervisor || 'Storekeeper',
          icon: <Shuffle size={16} />,
          color: '#f59e0b',
          details: (
            <div style={{ fontSize: '12px', marginTop: '6px' }}>
              <p><strong>Priority:</strong> {doriPayload.priority || 'Normal'}</p>
              {doriPayload.zipSelections && doriPayload.zipSelections.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <strong>Selected Placements:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {doriPayload.zipSelections.map((sel, idx) => (
                      <span key={idx} className="status-badge" style={{ fontSize: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        {sel.placement}: {sel.color}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        });
      }
    }

    // 6. Milestones: Scanner activity and Returnable Gate Passes (RGPs) (from scans table)
    // First, find all RGP document numbers that are associated with the selected design lot
    const associatedRgpNumbers = new Set();
    scanLogs.forEach(s => {
      if (s.rgp_payload) {
        try {
          const rgpData = JSON.parse(s.rgp_payload);
          const hasLot = rgpData && Array.isArray(rgpData.entries) &&
            rgpData.entries.some(entry => String(entry.lotNo).toLowerCase() === lotIdLower);
          if (hasLot) {
            associatedRgpNumbers.add(String(s.lot_number).toLowerCase());
            if (rgpData.rgpNo) {
              associatedRgpNumbers.add(String(rgpData.rgpNo).toLowerCase());
            }
          }
        } catch (e) { }
      }
    });

    const matchingScans = scanLogs.filter(s => {
      const scanLotLower = String(s.lot_number).toLowerCase();
      // Direct Design Lot match
      if (scanLotLower === lotIdLower) return true;
      // RGP Number match
      if (associatedRgpNumbers.has(scanLotLower)) return true;
      return false;
    });

    matchingScans.forEach(s => {
      const isRGP = s.scan_type === 'rgp_entry' || s.scan_type === 'rgp_return' || s.rgp_payload;

      if (isRGP) {
        let rgpData = null;
        try {
          rgpData = s.rgp_payload ? JSON.parse(s.rgp_payload) : null;
        } catch (e) { }

        events.push({
          type: 'rgp_log',
          title: (s.scan_type === 'rgp_return' ? 'Fabric RGP Returned' : 'Fabric RGP Dispatched') + ` (#${s.lot_number})`,
          timestamp: formatDateTime(s.scanned_at) || 'Logged',
          dateObj: parseToDateObject(s.scanned_at),
          actor: s.person_name || 'Gatekeeper',
          icon: <Truck size={16} />,
          color: '#a855f7',
          details: (
            <div style={{ fontSize: '12px', marginTop: '6px' }}>
              <p><strong>Processor:</strong> {s.supplier_name}</p>
              <p><strong>Dispatched Item:</strong> {s.material_name}</p>
              {rgpData && (
                <>
                  {rgpData.rollsInfo && <p><strong>Rolls/Bales:</strong> {rgpData.rollsInfo}</p>}

                  {/* Detailed itemized list from the RGP entries */}
                  {rgpData.entries && rgpData.entries.length > 0 && (
                    <div style={{ marginTop: '10px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--accent-color)' }}>RGP Dispatch List:</strong>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '4px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '4px' }}>Item Details</th>
                            <th style={{ padding: '4px', textAlign: 'right' }}>Qty 1</th>
                            <th style={{ padding: '4px', textAlign: 'right' }}>Qty 2</th>
                            <th style={{ padding: '4px' }}>Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rgpData.entries.map((entry, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '4px' }}>{entry.itemDesc || 'N/A'}</td>
                              <td style={{ padding: '4px', textAlign: 'right' }}>{entry.qty1 || 0} {entry.uom || 'pcs'}</td>
                              <td style={{ padding: '4px', textAlign: 'right' }}>{entry.qty2 || 0} {entry.uom || 'pcs'}</td>
                              <td style={{ padding: '4px' }}>{entry.purpose || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        });
      } else {
        // Barcode scans (Gate Entry or Material Received)
        const isGate = s.scan_type === 'gate_entry';
        events.push({
          type: 'barcode_scan',
          title: isGate ? 'Arrival Scanned at Gate' : 'Material Received & Checked-In',
          timestamp: formatDateTime(s.scanned_at) || 'Scanned',
          dateObj: parseToDateObject(s.scanned_at),
          actor: s.person_name,
          icon: <QrCode size={16} />,
          color: isGate ? '#14b8a6' : '#06b6d4',
          details: (
            <div style={{ fontSize: '12px', marginTop: '6px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
              {isGate ? (
                <p><strong>Gatekeeper Log:</strong> Verified delivery bundle from <strong>{s.supplier_name}</strong> carrying item: <em>{s.material_name}</em>.</p>
              ) : (
                <p><strong>Store Log:</strong> Checked-in <strong>{s.quantity} pcs</strong> of <strong>{s.material_name}</strong> into catalog stock from supplier <strong>{s.supplier_name}</strong>.</p>
              )}
            </div>
          )
        });
      }
    });

    // 7. Milestone: Material Issues and Returns (from issue_logs table)
    const lotIssueLogs = issueLogs.filter(log => String(log.lotId).toLowerCase() === lotIdLower);
    lotIssueLogs.forEach(log => {
      const isRet = log.isReturn === 1 || log.isReturn === true;
      const isRe = log.isReissue === 1 || log.isReissue === true;

      let parsedMaterials = [];
      try {
        parsedMaterials = typeof log.materials === 'string' ? JSON.parse(log.materials) : log.materials || [];
      } catch (e) { }

      let title = "Materials Issued";
      if (isRet) title = "Materials Returned";
      else if (isRe) title = "Materials Re-Issued";

      events.push({
        type: 'material_issue_log',
        title: title,
        timestamp: formatDateTime(log.date) || 'Processed',
        dateObj: parseToDateObject(log.date),
        actor: log.personName || 'Storekeeper',
        icon: <ClipboardList size={16} />,
        color: isRet ? '#ef4444' : (isRe ? '#84cc16' : '#10b981'),
        details: (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <p><strong>Category:</strong> {log.category || 'N/A'}</p>
            <p><strong>Total Items Count:</strong> {log.volume || 0}</p>
            {parsedMaterials.length > 0 && (
              <table style={{ width: '100%', marginTop: '6px', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '4px' }}>Material Item</th>
                    <th style={{ padding: '4px', textAlign: 'right' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedMaterials.map((mat, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '4px' }}>{mat.name || mat.materialName || mat.description}</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>{mat.qty || mat.quantity || mat.issueQty || 0} {mat.unit || 'pcs'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      });
    });

    // Sort events chronologically
    return events.sort((a, b) => a.dateObj - b.dateObj);
  };

  const timelineEvents = getTimelineEvents();

  // Helper function to resolve dynamic design image preview URLs
  const getCleanImageUrl = (url) => {
    if (!url) return '';
    return url.replace('https://store-backend-1-ff8d.onrender.com', `http://${window.location.hostname}:5000`);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '22px', fontWeight: '700' }}>Lot Workflow History</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Compile the complete operational history of a design lot (registration, approvals, PO creations, fabric RGPs, gate check-ins, and store receipts).</p>
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '13px' }}>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Left Panel: Search & Lot select */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 className="panel-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} />
              <span>Select Design Lot</span>
            </h3>

            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Search Lot, Style, Brand..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px',
              maxHeight: '340px', overflowY: 'auto', paddingRight: '4px',
              border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px'
            }}>
              {filteredLotsList.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedLotId(d.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.15s',
                    backgroundColor: selectedLotId === d.id ? 'var(--accent-light, rgba(99, 102, 241, 0.08))' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedLotId === d.id ? 'var(--accent-color)' : 'transparent',
                    color: selectedLotId === d.id ? 'var(--accent-color)' : 'var(--text-main)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedLotId !== d.id) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedLotId !== d.id) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: '700' }}>Lot #{d.id}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>{d.brand} ({d.category})</span>
                    <span>{d.style}</span>
                  </div>
                </div>
              ))}
              {filteredLotsList.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No design lots found
                </div>
              )}
            </div>
          </div>

          {/* Lot Summary Details Card */}
          {selectedDesign && (
            <div className="panel animate-scale" style={{ padding: '20px' }}>
              <h3 className="panel-title" style={{ marginBottom: '14px' }}>Lot Specifications</h3>

              {selectedDesign.imageUrl && (
                <div style={{ width: '100%', height: '140px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px', marginBottom: '14px' }}>
                  <img
                    src={getCleanImageUrl(selectedDesign.imageUrl)}
                    alt="Design spec"
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Lot ID</span>
                  <span style={{ fontWeight: '700' }}>#{selectedDesign.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Style Code</span>
                  <span style={{ fontWeight: '600' }}>{selectedDesign.style}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Brand/Client</span>
                  <span style={{ fontWeight: '600' }}>{selectedDesign.brand}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Category</span>
                  <span style={{ fontWeight: '600' }}>{selectedDesign.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fabric Specification</span>
                  <span style={{ fontWeight: '600' }}>{selectedDesign.fabricType || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target Pieces</span>
                  <span style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{selectedDesign.quantity || 100} pcs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Workflow Timeline */}
        <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '24px', minHeight: '400px' }}>
            <h3 className="panel-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} />
              <span>Timeline Workflow {selectedLotId ? `for Lot #${selectedLotId}` : ''}</span>
            </h3>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--accent-light)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Compiling Workflow History Logs...</span>
              </div>
            ) : !selectedLotId ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>No Lot Selected</h4>
                <p style={{ fontSize: '13px', maxWidth: '360px' }}>Select an active design lot number from the left panel list to view its entire workflow sequence timeline.</p>
              </div>
            ) : timelineEvents.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>No timeline logs found</h4>
                <p style={{ fontSize: '13px', maxWidth: '360px' }}>We couldn't compile logs for this lot ID. Check if there are design status updates or scans linked to this lot.</p>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '20px' }}>

                {/* Vertical Line */}
                <div style={{
                  position: 'absolute', left: '7px', top: '10px', bottom: '10px',
                  width: '2px', backgroundColor: 'var(--border-color)', zIndex: 1
                }}></div>

                {/* Timeline Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'flex', gap: '16px', zIndex: 2 }}>

                      {/* Node Bullet */}
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: 'var(--bg-primary)', border: '3.5px solid',
                        borderColor: evt.color, flexShrink: 0, marginTop: '4px',
                        boxShadow: '0 0 0 3px var(--bg-primary)'
                      }}></div>

                      {/* Timeline Card */}
                      <div className="animate-scale" style={{
                        flex: 1, backgroundColor: 'var(--bg-secondary)',
                        border: '1.5px solid var(--border-color)', borderRadius: '10px',
                        padding: '14px 18px', boxShadow: 'var(--shadow-sm)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: evt.color, display: 'inline-flex' }}>{evt.icon}</span>
                            <span>{evt.title}</span>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{evt.timestamp}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          <span>by <strong>{evt.actor}</strong></span>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', color: 'var(--text-color)', fontSize: '13px' }}>
                          {evt.details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
