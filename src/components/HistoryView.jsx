import { getBackendUrl } from '../utils/api';
import React, { useState, useEffect } from 'react';
import {
  Search, Clock, User, ClipboardList, CheckCircle, XCircle,
  Scissors, Shuffle, Truck, QrCode, ShieldCheck, AlertCircle, FileText, Check, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'chronological'

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
      const backendUrl = getBackendUrl();

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

  const getWorkflowSteps = () => {
    if (!selectedLotId) return [];

    const lotIdLower = selectedLotId.toLowerCase().trim();

    // 1. Design Stage
    const designExists = !!selectedDesign;
    const designDate = selectedDesign ? (selectedDesign.created_at || selectedDesign.date) : '';
    const designer = selectedDesign ? (selectedDesign.designer || 'System') : '';

    // 2. Approved Stage
    const approvedLog = historyLogs.find(h => String(h.lotId).toLowerCase() === lotIdLower && h.action === 'approved');
    const designApproved = (selectedDesign?.status?.toLowerCase() === 'approved') || !!approvedLog;
    const approvalDate = approvedLog ? approvedLog.timestamp : (designApproved ? designDate : '');
    const approvalActor = approvedLog ? approvedLog.actorName : (designApproved ? 'Admin' : '');

    // 3. Trim PO Stage
    const matchingPOs = pos.filter(po =>
      (po.designName && String(po.designName).toLowerCase() === lotIdLower) ||
      (po.poNumber && String(po.poNumber).toLowerCase() === lotIdLower)
    );
    const poReleased = matchingPOs.length > 0;
    const poDate = poReleased ? matchingPOs[0].date : '';

    // 4. ZIP Stage
    const matchingZipHeader = cuttingHeaders.find(h => String(h.Lot_Number).toLowerCase() === lotIdLower);
    const zipPayloadExists = matchingZipHeader && matchingZipHeader.zip_payload;
    let zipSelectionsCount = 0;
    if (zipPayloadExists) {
      try {
        const payload = JSON.parse(matchingZipHeader.zip_payload);
        if (payload && Array.isArray(payload.zipSelections)) {
          zipSelectionsCount = payload.zipSelections.length;
        }
      } catch (e) {}
    }
    const zipCompiled = !!zipPayloadExists;
    const zipDate = zipCompiled ? (matchingZipHeader.Saved_At || '') : '';
    const zipActor = zipCompiled ? (matchingZipHeader.Supervisor || 'Storekeeper') : '';

    // 5. Doori PO Stage
    const matchingDooriOrder = dooriOrders.find(h => String(h.Lot_Number).toLowerCase() === lotIdLower);
    const dooriPayloadExists = matchingDooriOrder && matchingDooriOrder.dori_payload;
    let dooriPlacementsCount = 0;
    if (dooriPayloadExists) {
      try {
        const payload = JSON.parse(matchingDooriOrder.dori_payload);
        if (payload && Array.isArray(payload.zipSelections)) {
          dooriPlacementsCount = payload.zipSelections.length;
        }
      } catch (e) {}
    }
    const dooriReleased = !!dooriPayloadExists;
    const dooriDate = dooriReleased ? (matchingDooriOrder.Timestamp || '') : '';
    const dooriActor = dooriReleased ? (matchingDooriOrder.supervisor || 'Storekeeper') : '';

    // 6. RGP Stage
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

    const rgpScans = scanLogs.filter(s => {
      const scanLotLower = String(s.lot_number).toLowerCase();
      if (scanLotLower === lotIdLower) return s.scan_type === 'rgp_entry' || s.scan_type === 'rgp_return' || s.rgp_payload;
      if (associatedRgpNumbers.has(scanLotLower)) return true;
      return false;
    });
    const rgpReleased = rgpScans.length > 0;
    const rgpDate = rgpReleased ? rgpScans[0].scanned_at : '';
    const rgpActor = rgpReleased ? rgpScans[0].person_name : '';

    // 7. Gate Scan Stage
    const gateScanLog = scanLogs.find(s => String(s.lot_number).toLowerCase() === lotIdLower && s.scan_type === 'gate_entry');
    const gateScanDone = !!gateScanLog;
    const gateScanDate = gateScanDone ? gateScanLog.scanned_at : '';
    const gateScanActor = gateScanDone ? gateScanLog.person_name : '';

    // 8. Material Scan Stage
    const matScanLog = scanLogs.find(s => String(s.lot_number).toLowerCase() === lotIdLower && s.scan_type === 'material_in');
    const materialScanDone = !!matScanLog;
    const materialScanDate = materialScanDone ? matScanLog.scanned_at : '';
    const materialScanActor = materialScanDone ? matScanLog.person_name : '';

    // 9. Supplier Scan Stage
    const supScanLog = scanLogs.find(s => String(s.lot_number).toLowerCase() === lotIdLower && s.scan_type === 'supplier_entry');
    const supplierScanDone = !!supScanLog;
    const supplierScanDate = supplierScanDone ? supScanLog.scanned_at : '';
    const supplierScanActor = supplierScanDone ? supScanLog.person_name : '';

    return [
      {
        id: 'design',
        name: 'Design Registration',
        isComplete: designExists,
        date: designDate,
        actor: designer,
        icon: <FileText size={16} />,
        details: selectedDesign ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '6px' }}>
            <div><strong>Style:</strong> {selectedDesign.style || 'N/A'}</div>
            <div><strong>Category:</strong> {selectedDesign.category || 'N/A'}</div>
            <div><strong>Brand/Client:</strong> {selectedDesign.brand || 'N/A'}</div>
            <div><strong>Fabric Type:</strong> {selectedDesign.fabricType || 'N/A'}</div>
            <div><strong>Target Pieces:</strong> {selectedDesign.quantity || 100} pcs</div>
          </div>
        ) : null
      },
      {
        id: 'approved',
        name: 'Technical Verification Approval',
        isComplete: designApproved,
        date: approvalDate,
        actor: approvalActor,
        icon: <ShieldCheck size={16} />,
        details: designApproved ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <div><strong>Status:</strong> Approved</div>
            {approvedLog?.details && <div style={{ marginTop: '4px' }}><strong>Comments:</strong> {approvedLog.details}</div>}
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Awaiting technical verification approval.</span>
      },
      {
        id: 'po',
        name: 'Trim Purchase Order (PO) Release',
        isComplete: poReleased,
        date: poDate,
        actor: poReleased ? 'Purchasing' : '',
        icon: <ClipboardList size={16} />,
        details: poReleased ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <strong>Associated Trim POs ({matchingPOs.length}):</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              {matchingPOs.map((po, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  PO #{po.poNumber} to <strong>{po.vendorName}</strong> - {currencySymbol}{po.total?.toFixed(2)} ({po.status})
                </li>
              ))}
            </ul>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No Trim Purchase Orders released yet.</span>
      },
      {
        id: 'rgp',
        name: 'Fabric Returnable Gate Pass (RGP)',
        isComplete: rgpReleased,
        date: rgpDate,
        actor: rgpActor,
        icon: <Truck size={16} />,
        details: rgpReleased ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <strong>RGP Dispatches ({rgpScans.length}):</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              {rgpScans.map((s, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  RGP #{s.lot_number} to <strong>{s.supplier_name}</strong> for <em>{s.material_name}</em>
                </li>
              ))}
            </ul>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>RGP dispatch has not been logged.</span>
      },
      {
        id: 'zip',
        name: 'Zip Selection Compiled',
        isComplete: zipCompiled,
        date: zipDate,
        actor: zipActor,
        icon: <Scissors size={16} />,
        details: zipCompiled ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <div><strong>Fabric:</strong> {matchingZipHeader.Fabric || 'N/A'}</div>
            <div><strong>Zippers Selected:</strong> {zipSelectionsCount} item(s)</div>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Zipper specifications not yet compiled.</span>
      },
      {
        id: 'doori',
        name: 'Thread / Doori PO Release',
        isComplete: dooriReleased,
        date: dooriDate,
        actor: dooriActor,
        icon: <Shuffle size={16} />,
        details: dooriReleased ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <div><strong>Thread/Doori Placements Selected:</strong> {dooriPlacementsCount} item(s)</div>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Thread / doori purchase specifications not yet compiled.</span>
      },
      {
        id: 'gate_scan',
        name: 'Gate Entry Scan',
        isComplete: gateScanDone,
        date: gateScanDate,
        actor: gateScanActor,
        icon: <QrCode size={16} />,
        details: gateScanDone ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <p><strong>Gatekeeper Log:</strong> Verified delivery bundle from <strong>{gateScanLog.supplier_name}</strong> carrying <em>{gateScanLog.material_name}</em>.</p>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Arrival has not been scanned at gate.</span>
      },
      {
        id: 'material_scan',
        name: 'Material Check-In Scan',
        isComplete: materialScanDone,
        date: materialScanDate,
        actor: materialScanActor,
        icon: <QrCode size={16} />,
        details: materialScanDone ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <p><strong>Store Log:</strong> Checked-in <strong>{matScanLog.quantity} pcs</strong> of <strong>{matScanLog.material_name}</strong> into catalog stock.</p>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Material count and quality check-in pending.</span>
      },
      {
        id: 'supplier_scan',
        name: 'Supplier Verification Scan',
        isComplete: supplierScanDone,
        date: supplierScanDate,
        actor: supplierScanActor,
        icon: <QrCode size={16} />,
        details: supplierScanDone ? (
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <p><strong>Supplier Log:</strong> Verified supplier check-in by <strong>{supScanLog.person_name}</strong> for supplier <strong>{supScanLog.supplier_name}</strong>.</p>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Supplier check-in verification pending.</span>
      }
    ];
  };

  const downloadWorkflowPDF = () => {
    if (!selectedDesign) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lotId = selectedDesign.id;
    const lotIdLower = lotId.toLowerCase().trim();
    const matchingZipHeader = cuttingHeaders.find(h => String(h.Lot_Number).toLowerCase() === lotIdLower);
    const matchingDooriOrder = dooriOrders.find(h => String(h.Lot_Number).toLowerCase() === lotIdLower);

    const allSteps = getWorkflowSteps();
    const steps = allSteps.filter(step => {
      if (step.id === 'design' || step.id === 'approved') return true;
      return step.isComplete;
    });
    const gateScanDone = allSteps.find(s => s.id === 'gate_scan')?.isComplete;
    const materialScanDone = allSteps.find(s => s.id === 'material_scan')?.isComplete;
    const supplierScanDone = allSteps.find(s => s.id === 'supplier_scan')?.isComplete;
    const designApproved = allSteps.find(s => s.id === 'approved')?.isComplete;
    const allComplete = designApproved && (gateScanDone || materialScanDone || supplierScanDone);

    // Title / Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // slate-800
    doc.text('Lot Operational Workflow Report', 40, 50);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 40, 68);

    // Status Banner in PDF
    const statusText = allComplete ? 'WORKFLOW STATUS: COMPLETE' : 'WORKFLOW STATUS: IN PROGRESS';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (allComplete) {
      doc.setTextColor(16, 185, 129); // green-500
    } else {
      doc.setTextColor(245, 158, 11); // amber-500
    }
    doc.text(statusText, 380, 50);
    doc.setTextColor(31, 41, 55); // Reset

    // Lot Info Box
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setFillColor(249, 250, 251); // gray-50
    doc.rect(40, 85, 515, 90, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Lot Information', 50, 105);

    doc.setFont('helvetica', 'normal');
    doc.text(`Lot Number: #${lotId}`, 50, 125);
    doc.text(`Style Code: ${selectedDesign.style || 'N/A'}`, 50, 140);
    doc.text(`Brand / Client: ${selectedDesign.brand || 'N/A'}`, 50, 155);

    doc.text(`Category: ${selectedDesign.category || 'N/A'}`, 260, 125);
    doc.text(`Fabric Spec: ${selectedDesign.fabricType || 'N/A'}`, 260, 140);
    doc.text(`Target Pieces: ${selectedDesign.quantity || 100} pcs`, 260, 155);

    // Section 1: Workflow Checklist
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('1. Workflow Stage Progress Checklist', 40, 205);

    const checklistHeaders = [['Step', 'Workflow Stage', 'Status', 'Completed Date/Time', 'Actor / Operator']];
    const checklistBody = steps.map((step, idx) => {
      let stepStatusText = step.isComplete ? 'COMPLETED' : 'PENDING';
      let formattedDate = step.isComplete ? formatDateTime(step.date) : '—';
      let actorName = step.isComplete ? step.actor : '—';

      return [
        idx + 1,
        step.name,
        stepStatusText,
        formattedDate,
        actorName
      ];
    });

    autoTable(doc, {
      head: checklistHeaders,
      body: checklistBody,
      startY: 215,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 6 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] }, // indigo-600
      didParseCell: function (data) {
        if (data.column.index === 2) {
          if (data.cell.text[0] === 'COMPLETED') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [156, 163, 175];
          }
        }
      }
    });

    // Section 2: Chronological History Audit Log
    const nextY = doc.lastAutoTable.finalY + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('2. Detailed Operational History Log', 40, nextY);

    const logHeaders = [['Timestamp', 'Event Title', 'Actor / Operator', 'Operational Details']];
    const logBody = timelineEvents.map(evt => {
      let detailsText = '';
      if (evt.type === 'registration') {
        detailsText = `Style: ${selectedDesign.style || 'N/A'}, Category: ${selectedDesign.category || 'N/A'}, Brand: ${selectedDesign.brand || 'N/A'}, Target: ${selectedDesign.quantity || 100} pcs`;
      } else if (evt.type === 'verification') {
        const matchingLog = historyLogs.find(h => formatDateTime(h.timestamp) === evt.timestamp);
        detailsText = matchingLog?.details || 'Technical Verification approved.';
      } else if (evt.type === 'po_general') {
        const poNum = evt.title.match(/\(([^)]+)\)/)?.[1] || '';
        const matchingPo = pos.find(p => p.poNumber === poNum);
        detailsText = `Supplier: ${matchingPo?.vendorName || 'N/A'}, Total Amount: ${currencySymbol}${matchingPo?.total || 0}`;
      } else if (evt.type === 'zip_po_created') {
        detailsText = `Compiled zipper specification selection. Priority: ${matchingZipHeader?.Priority || 'Normal'}`;
      } else if (evt.type === 'doori_po_created') {
        detailsText = `Compiled doori/thread specifications. Priority: ${matchingDooriOrder?.priority || 'Normal'}`;
      } else if (evt.type === 'rgp_log') {
        detailsText = `Dispatched/Returned fabric gate pass. Processor: ${evt.actor}`;
      } else if (evt.type === 'barcode_scan') {
        const isGate = evt.title.includes('Arrival');
        detailsText = isGate ? 'Scanned entry gate pass check.' : 'Materials received and catalog stock checked-in.';
      } else if (evt.type === 'material_issue_log') {
        const matchingLog = issueLogs.find(l => formatDateTime(l.date) === evt.timestamp);
        detailsText = `Category: ${matchingLog?.category || 'N/A'}, Vol: ${matchingLog?.volume || 0}`;
      } else {
        detailsText = 'Status update compiled in system logs.';
      }

      return [
        evt.timestamp,
        evt.title,
        evt.actor || 'System',
        detailsText
      ];
    });

    autoTable(doc, {
      head: logHeaders,
      body: logBody,
      startY: nextY + 15,
      margin: { left: 40, right: 40 },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255] } // gray-700
    });

    doc.save(`Lot_${lotId}_Workflow_Report.pdf`);
  };

  const timelineEvents = getTimelineEvents();
  const workflowSteps = getWorkflowSteps();
  const completedStepsCount = workflowSteps.filter(s => s.isComplete).length;
  const visibleSteps = workflowSteps.filter(step => {
    if (step.id === 'design' || step.id === 'approved') return true;
    return step.isComplete;
  });
  const gateScanDone = workflowSteps.find(s => s.id === 'gate_scan')?.isComplete;
  const materialScanDone = workflowSteps.find(s => s.id === 'material_scan')?.isComplete;
  const supplierScanDone = workflowSteps.find(s => s.id === 'supplier_scan')?.isComplete;
  const designApproved = workflowSteps.find(s => s.id === 'approved')?.isComplete;
  const allComplete = designApproved && (gateScanDone || materialScanDone || supplierScanDone);

  // Helper function to resolve dynamic design image preview URLs
  const getCleanImageUrl = (url) => {
    if (!url) return '';
    return url.replace('https://store-backend-1-ff8d.onrender.com', `${getBackendUrl()}`);
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '700' }}>Lot #{getLotVersionInfo(d.id).displayLot}</span>
                    {getLotVersionInfo(d.id).isRecreated && (
                      <span className="status-badge in-verification" style={{ fontSize: '9px', padding: '1px 4px', textTransform: 'none' }}>
                        {getLotVersionInfo(d.id).versionText}
                      </span>
                    )}
                  </div>
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
                  <span style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    #{getLotVersionInfo(selectedDesign.id).displayLot}
                    {getLotVersionInfo(selectedDesign.id).isRecreated && (
                      <span className="status-badge in-verification" style={{ fontSize: '10px', padding: '2px 6px', textTransform: 'none' }}>
                        {getLotVersionInfo(selectedDesign.id).versionText}
                      </span>
                    )}
                  </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} />
                <span>Timeline Workflow {selectedLotId ? `for Lot #${selectedLotId}` : ''}</span>
              </h3>
            </div>

            {selectedLotId && (
              <div style={{
                marginBottom: '20px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: allComplete
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))',
                border: '1.5px solid',
                borderColor: allComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: allComplete ? 'var(--success)' : 'var(--warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {allComplete ? <Check size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                      Lot Workflow Status: {allComplete ? 'Complete' : 'In Progress'}
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {allComplete 
                        ? 'All 9 stages in the lot operational process have been successfully executed.' 
                        : `${completedStepsCount} of 9 process stages completed. Awaiting remaining workflow steps.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedLotId && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '24px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <button
                    onClick={() => setViewMode('pipeline')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: viewMode === 'pipeline' ? 'var(--accent-color)' : 'transparent',
                      color: viewMode === 'pipeline' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Workflow Pipeline
                  </button>
                  <button
                    onClick={() => setViewMode('chronological')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: viewMode === 'chronological' ? 'var(--accent-color)' : 'transparent',
                      color: viewMode === 'chronological' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Chronological Log
                  </button>
                </div>

                <button
                  onClick={downloadWorkflowPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: allComplete ? 'var(--success)' : 'var(--accent-color)',
                    color: '#ffffff',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Download size={14} />
                  <span>Download PDF Report</span>
                </button>
              </div>
            )}

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
            ) : viewMode === 'pipeline' ? (
              /* Step-by-Step Pipeline View */
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Vertical Connector Line */}
                <div style={{
                  position: 'absolute', left: '9px', top: '12px', bottom: '12px',
                  width: '2px', backgroundColor: 'var(--border-color)', zIndex: 1
                }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {visibleSteps.map((step, idx) => (
                    <div key={step.id} style={{ position: 'relative', display: 'flex', gap: '16px', zIndex: 2 }}>
                      {/* Node circle */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: step.isComplete ? 'var(--success)' : 'var(--bg-primary)',
                        border: '3px solid',
                        borderColor: step.isComplete ? 'var(--success)' : 'var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        marginTop: '3px',
                        boxShadow: '0 0 0 4px var(--bg-secondary)'
                      }}>
                        {step.isComplete && <Check size={10} strokeWidth={3} />}
                      </div>

                      {/* Content panel */}
                      <div className="panel" style={{
                        flex: 1,
                        padding: '14px 18px',
                        margin: 0,
                        boxShadow: 'var(--shadow-sm)',
                        borderColor: step.isComplete ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)',
                        opacity: step.isComplete ? 1 : 0.75,
                        backgroundColor: step.isComplete ? 'var(--bg-secondary)' : 'rgba(0,0,0,0.01)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: step.isComplete ? 'var(--success)' : 'var(--text-light)', display: 'inline-flex' }}>{step.icon}</span>
                            <span>{step.name}</span>
                          </span>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: step.isComplete ? 'var(--success-light)' : 'rgba(148, 163, 184, 0.1)',
                            color: step.isComplete ? 'var(--success)' : 'var(--text-muted)'
                          }}>
                            {step.isComplete ? 'Complete' : 'Pending'}
                          </span>
                        </div>

                        {step.isComplete && step.date && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span>Completed: <strong>{formatDateTime(step.date)}</strong></span>
                            {step.actor && <span style={{ marginLeft: '12px' }}>by <strong>{step.actor}</strong></span>}
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '10px' }}>
                          {step.details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : timelineEvents.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>No timeline logs found</h4>
                <p style={{ fontSize: '13px', maxWidth: '360px' }}>We couldn't compile logs for this lot ID. Check if there are design status updates or scans linked to this lot.</p>
              </div>
            ) : (
              /* Original Timeline view (Chronological Log) */
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{
                  position: 'absolute', left: '7px', top: '10px', bottom: '10px',
                  width: '2px', backgroundColor: 'var(--border-color)', zIndex: 1
                }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'flex', gap: '16px', zIndex: 2 }}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: 'var(--bg-primary)', border: '3.5px solid',
                        borderColor: evt.color, flexShrink: 0, marginTop: '4px',
                        boxShadow: '0 0 0 3px var(--bg-primary)'
                      }}></div>

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

const getLotVersionInfo = (lotNo) => {
  const lotStr = String(lotNo || '').trim();
  if (lotStr.includes('-V')) {
    const parts = lotStr.split('-V');
    return {
      displayLot: parts[0],
      versionText: `Recreated (Run ${parts[1]})`,
      isRecreated: true
    };
  }
  return {
    displayLot: lotStr,
    versionText: 'Original (Run 1)',
    isRecreated: false
  };
};
