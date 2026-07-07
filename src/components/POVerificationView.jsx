import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/api';
import {
  CheckCircle2, AlertTriangle, Scale, Search, Filter,
  TrendingDown, TrendingUp, Clock, Printer, FileText,
  User, Calendar, Box, Tag, ArrowLeft, ArrowLeftRight, HelpCircle,
  X
} from 'lucide-react';

export default function POVerificationView({ currencySymbol = 'R', currentUser }) {
  const isAdmin = currentUser?.role === 'Admin';
  const [loading, setLoading] = useState(true);
  const [pos, setPOs] = useState([]);
  const [zipOrders, setZipOrders] = useState([]);
  const [dooriOrders, setDooriOrders] = useState([]);
  const [captures, setCaptures] = useState([]);
  const [scans, setScans] = useState([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedPO, setSelectedPO] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('report'); // 'report' | 'timeline'
  const [toast, setToast] = useState(null);

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      const backendUrl = getBackendUrl();
      
      const [posRes, zipRes, dooriRes, capturesRes, scansRes] = await Promise.all([
        fetch(`${backendUrl}/api/pos`),
        fetch(`${backendUrl}/api/zip-orders`),
        fetch(`${backendUrl}/api/doori-orders`),
        fetch(`${backendUrl}/api/weight-capture`),
        fetch(`${backendUrl}/api/scans`)
      ]);

      const posData = posRes.ok ? await posRes.json() : [];
      const zipData = zipRes.ok ? await zipRes.json() : [];
      const dooriData = dooriRes.ok ? await dooriRes.json() : [];
      const capturesData = capturesRes.ok ? await capturesRes.json() : [];
      const scansData = scansRes.ok ? await scansRes.json() : [];

      setPOs(Array.isArray(posData) ? posData : []);
      setZipOrders(Array.isArray(zipData) ? zipData : []);
      setDooriOrders(Array.isArray(dooriData) ? dooriData : []);
      setScans(Array.isArray(scansData) ? scansData : []);
      
      // Fix potential payload wrapping
      const rawCaptures = capturesData.data ? capturesData.data : capturesData;
      const cleanCaptures = Array.isArray(rawCaptures) ? rawCaptures : [];
      setCaptures(cleanCaptures);
    } catch (err) {
      console.error('Error fetching PO/Capture data:', err);
      showToast('Error', 'Failed to load PO verification data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Compile Unified PO Data List
  const unifiedPOs = React.useMemo(() => {
    const list = [];

    // 1. General POs
    pos.forEach(p => {
      let itemsList = [];
      try {
        itemsList = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
      } catch (_) {
        itemsList = [];
      }
      
      const totalOrdered = itemsList.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      
      list.push({
        poNumber: p.poNumber || p.id,
        vendor: p.vendorName || 'Unknown Vendor',
        date: p.date || 'N/A',
        type: 'General',
        items: itemsList.map(item => ({
          name: item.name,
          ordered: Number(item.qty) || 0,
          price: Number(item.price) || 50,
          total: (Number(item.qty) || 0) * (Number(item.price) || 50)
        })),
        totalOrdered,
        totalCost: p.total || 0,
        status: p.status || 'Active'
      });
    });



    // 4. RGP POs (Returnable Gate Pass documents from scans table)
    const rgpScans = scans.filter(s => s.scan_type === 'rgp_entry' && s.rgp_payload);
    rgpScans.forEach(s => {
      let rgpPayload = null;
      let itemsList = [];
      try {
        rgpPayload = typeof s.rgp_payload === 'string' ? JSON.parse(s.rgp_payload) : s.rgp_payload;
        if (rgpPayload && Array.isArray(rgpPayload.entries)) {
          itemsList = rgpPayload.entries.map(entry => ({
            name: entry.desc || 'Trim/Fabric Description',
            ordered: Number(entry.qty1) || Number(entry.tQty) || 0,
            lotNo: entry.lotNo || '',
            dept: entry.dept || 'Stitching',
            purpose: entry.purpose || 'Stitching',
            uom: entry.uom || 'Pcs',
            bags: entry.bags || '0'
          }));
        }
      } catch (_) {}

      if (itemsList.length === 0) {
        itemsList = [{ name: s.material_name || 'RGP Issued Items', ordered: s.quantity || 0 }];
      }

      list.push({
        poNumber: s.lot_number || `RGP-${s.id}`,
        vendor: s.supplier_name || 'Unknown Vendor',
        date: rgpPayload?.date || new Date(s.timestamp || s.createdAt || Date.now()).toLocaleDateString('en-GB'),
        type: 'RGP',
        items: itemsList,
        totalOrdered: s.quantity || itemsList.reduce((sum, item) => sum + item.ordered, 0),
        totalCost: 0,
        status: 'Issued',
        // RGP specific properties
        expectedReturnDate: rgpPayload?.expectedReturnDate || 'N/A',
        vehicleNo: rgpPayload?.vehicleNo || 'N/A',
        preparedBy: rgpPayload?.preparedBy || s.person_name || 'System',
        authorizedBy: rgpPayload?.authorizedBy || 'N/A',
        remarks: rgpPayload?.remarks || 'N/A'
      });
    });

    // Add matching weight captures
    return list.map(po => {
      // Clean and normalize PO Number
      const normPo = String(po.poNumber).trim().toLowerCase();
      
      // Filter weight captures that match this PO
      const matchingCaptures = captures.filter(cap => 
        cap.poNumber && String(cap.poNumber).trim().toLowerCase() === normPo
      );

      const totalReceived = matchingCaptures.reduce((sum, cap) => sum + (Number(cap.pieces) || 0), 0);
      
      // Calculate received items distribution if possible
      const itemizedReceived = {};
      matchingCaptures.forEach(cap => {
        const name = cap.materialName || 'Unspecified Trim';
        itemizedReceived[name] = (itemizedReceived[name] || 0) + (Number(cap.pieces) || 0);
      });

      // Verification Status
      let verificationStatus = 'Pending';
      if (totalReceived > 0) {
        if (totalReceived === po.totalOrdered) {
          verificationStatus = 'Matched';
        } else if (totalReceived < po.totalOrdered) {
          verificationStatus = 'Shortage';
        } else {
          verificationStatus = 'Excess';
        }
      }

      return {
        ...po,
        matchingCaptures,
        totalReceived,
        itemizedReceived,
        verificationStatus,
        lastCapturedAt: matchingCaptures.length > 0 ? matchingCaptures[0].capturedAt : null
      };
    });
  }, [pos, zipOrders, dooriOrders, captures, scans]);

  // Aggregate orphan weight captures (captures with a PO Number that does not exist in our PO tables)
  const orphanCaptures = React.useMemo(() => {
    const knownPoNumbers = new Set(unifiedPOs.map(po => String(po.poNumber).trim().toLowerCase()));
    
    // Group captures by PO Number
    const grouped = {};
    captures.forEach(cap => {
      if (!cap.poNumber) return;
      const poNum = String(cap.poNumber).trim();
      const norm = poNum.toLowerCase();
      if (!knownPoNumbers.has(norm)) {
        if (!grouped[norm]) {
          grouped[norm] = {
            poNumber: poNum,
            vendor: cap.supplier || 'N/A',
            date: cap.capturedAt ? new Date(cap.capturedAt).toLocaleDateString('en-GB') : 'N/A',
            type: 'Unregistered PO',
            items: [],
            totalOrdered: 0,
            totalCost: 0,
            totalReceived: 0,
            matchingCaptures: [],
            verificationStatus: 'Excess', // Since ordered was 0
            lastCapturedAt: null
          };
        }
        grouped[norm].totalReceived += Number(cap.pieces) || 0;
        grouped[norm].matchingCaptures.push(cap);
        if (!grouped[norm].lastCapturedAt || new Date(cap.capturedAt) > new Date(grouped[norm].lastCapturedAt)) {
          grouped[norm].lastCapturedAt = cap.capturedAt;
        }
      }
    });

    return Object.values(grouped);
  }, [unifiedPOs, captures]);

  // Combined List for view
  const displayPOs = React.useMemo(() => {
    const all = [...unifiedPOs, ...orphanCaptures];
    
    // Apply search query
    return all.filter(po => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        String(po.poNumber).toLowerCase().includes(q) ||
        String(po.vendor).toLowerCase().includes(q);
      
      const matchesStatus = statusFilter === 'all' || 
        po.verificationStatus.toLowerCase() === statusFilter.toLowerCase();
      
      const matchesType = typeFilter === 'all' || 
        po.type.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [unifiedPOs, orphanCaptures, searchQuery, statusFilter, typeFilter]);

  // Statistics calculations
  const stats = React.useMemo(() => {
    const all = [...unifiedPOs, ...orphanCaptures];
    const total = all.length;
    const matched = all.filter(p => p.verificationStatus === 'Matched').length;
    const shortages = all.filter(p => p.verificationStatus === 'Shortage').length;
    const excess = all.filter(p => p.verificationStatus === 'Excess').length;
    const pending = all.filter(p => p.verificationStatus === 'Pending').length;

    return { total, matched, shortages, excess, pending };
  }, [unifiedPOs, orphanCaptures]);

  const handlePrintVerificationReport = (po) => {
    const isAdmin = currentUser?.role === 'Admin';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Error', 'Popup blocker is preventing document export.', 'error');
      return;
    }

    const difference = po.totalReceived - po.totalOrdered;
    const percentage = po.totalOrdered > 0 
      ? ((po.totalReceived / po.totalOrdered) * 100).toFixed(1) 
      : '0.0';
    const percentageDiff = po.totalOrdered > 0
      ? (((po.totalReceived - po.totalOrdered) / po.totalOrdered) * 100).toFixed(1)
      : '0.0';

    const varianceVal = Math.abs(parseFloat(percentageDiff));
    const isApproved = varianceVal <= 5.0;
    
    // Status box HTML (Black and White)
    const approvalStatusHtml = isApproved
      ? `
        <div style="border: 1.5px solid #000000; background-color: #f3f4f6; color: #000000; padding: 8px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; text-align: center; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">
          ✔ STATUS: APPROVED (Variance is ${percentageDiff}%, within ±5.0% limit)
        </div>
      `
      : `
        <div style="border: 2px dashed #000000; background-color: #ffffff; color: #000000; padding: 8px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; text-align: center; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">
          ⚠ STATUS: REQUIRES AUTHORIZATION SIGNATURE (Variance is ${percentageDiff}%, exceeds ±5.0% limit)
        </div>
      `;

    // Signature lines HTML (Black and White)
    const signatureHtml = `
      <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; gap: 40px; font-family: 'Inter', sans-serif;">
        <div style="text-align: center; flex: 1;">
          <div style="height: 25px;"></div>
          <div style="border-top: 1.5px solid #000000; padding-top: 6px; font-weight: bold; color: #000;">Store In-Charge Signature</div>
        </div>
        <div style="text-align: center; flex: 1;">
          <div style="height: 25px;"></div>
          <div style="border-top: 1.5px solid #000000; padding-top: 6px; font-weight: bold; color: #000;">Audited & Verified By</div>
        </div>
        ${!isApproved ? `
          <div style="text-align: center; flex: 1; border: 1.2px dashed #000000; padding: 8px 10px; border-radius: 4px; background-color: #ffffff;">
            <div style="font-size: 9px; color: #000000; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">⚠ Authorization Required</div>
            <div style="border-top: 1.2px solid #000000; padding-top: 6px; font-weight: bold; color: #000000; font-size: 11px;">Authorized Signature</div>
          </div>
        ` : ''}
      </div>
    `;

    const rgpSignatureHtml = `
      <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; gap: 40px; font-family: 'Inter', sans-serif;">
        <div style="text-align: center; flex: 1;">
          <div style="height: 25px;"></div>
          <div style="border-top: 1.5px solid #000000; padding-top: 6px; font-weight: bold; color: #000;">Security Officer Signature</div>
        </div>
        <div style="text-align: center; flex: 1;">
          <div style="height: 25px;"></div>
          <div style="border-top: 1.5px solid #000000; padding-top: 6px; font-weight: bold; color: #000;">Store In-Charge Signature</div>
        </div>
        ${!isApproved ? `
          <div style="text-align: center; flex: 1; border: 1.2px dashed #000000; padding: 8px 10px; border-radius: 4px; background-color: #ffffff;">
            <div style="font-size: 9px; color: #000000; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">⚠ Authorization Required</div>
            <div style="border-top: 1.2px solid #000000; padding-top: 6px; font-weight: bold; color: #000000; font-size: 11px;">Authorized Signature</div>
          </div>
        ` : ''}
      </div>
    `;

    let printTemplate = '';

    if (po.type === 'General') {
      const rowsHtml = po.items.map((item, idx) => {
        const received = po.items.length === 1 ? po.totalReceived : (po.itemizedReceived[item.name] || 0);
        
        const rate = item.price || 50.00;
        const amount = (item.ordered * rate).toFixed(2);

        return `
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 5px; font-size: 11px; text-align: center;">${idx + 1}</td>
            <td style="padding: 5px; font-size: 11px;">Trims</td>
            <td style="padding: 5px; font-size: 11px; font-weight: bold; color: #000000;">${item.name}</td>
            <td style="padding: 5px; font-size: 11px;"></td>
            <td style="padding: 5px; font-size: 11px; text-align: center;">PCS</td>
            <td style="padding: 5px; font-size: 11px; text-align: center; font-weight: bold;">${item.ordered}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center; font-weight: bold;">${received}</td>
            ${isAdmin ? `
              <td style="padding: 5px; font-size: 11px; text-align: right;">${rate.toFixed(2)}</td>
              <td style="padding: 5px; font-size: 11px; text-align: right;">${amount}</td>
            ` : ''}
          </tr>
        `;
      }).join('');

      const subtotal = po.items.reduce((sum, item) => sum + (item.ordered * (item.price || 50.00)), 0);
      const gst = subtotal * 0.12;
      const grandTotal = subtotal + gst;

      printTemplate = `
        <html>
          <head>
            <title>Purchase Order Original - ${po.poNumber}</title>
            <style>
              body { font-family: 'Inter', sans-serif; color: #000000; margin: 0; padding: 15px; background-color: #ffffff; line-height: 1.2; }
              .header-title { text-align: center; font-size: 16px; font-weight: bold; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
              .border-box { border: 1px solid #000000; border-radius: 4px; padding: 8px; }
              .box-title { font-size: 10px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000000; padding-bottom: 2px; margin-bottom: 6px; }
              .box-row { font-size: 11px; margin-bottom: 2px; }
              .box-row strong { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #000000; }
              th, td { border: 1px solid #000000; padding: 5px 8px; font-size: 11px; }
              th { text-transform: uppercase; text-align: left; font-weight: 800; background-color: #eee; }
              @media print {
                @page { size: portrait; margin: 6mm; }
                body { padding: 0; margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header-title">PURCHASE ORDER (ORIGINAL)</div>
            
            <div class="details-grid">
              <div class="border-box">
                <div class="box-title">PO DETAILS</div>
                <div class="box-row"><strong>PO #:</strong> ${po.poNumber}</div>
                <div class="box-row"><strong>Order Date/Time:</strong> ${po.date}</div>
                <div class="box-row"><strong>Requisition Raised By:</strong> NITIN KHANNA</div>
                <div class="box-row"><strong>Prepared By:</strong> RASHMI</div>
                <div class="box-row"><strong>Approved By:</strong> MOHIT GOYAL</div>
              </div>
              
              <div class="border-box">
                <div class="box-title">SUPPLIER</div>
                <div class="box-row"><strong>Name:</strong> ${po.vendor}</div>
                <div class="box-row"><strong>Phone:</strong> 24568563</div>
                <div class="box-row"><strong>Email:</strong> sales@vendor.com</div>
              </div>
            </div>

            <div style="background-color: #ffffff; border: 1.5px solid #000000; padding: 6px 12px; border-radius: 4px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">PO Order Qty</div>
                <div style="font-size: 13px; font-weight: 800;">${po.totalOrdered} pcs</div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Total Received</div>
                <div style="font-size: 13px; font-weight: 800;">${po.totalReceived} pcs</div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Receipt Difference</div>
                <div style="font-size: 13px; font-weight: 800;">
                  ${difference === 0 ? '0' : (difference > 0 ? `+${difference}` : difference)} pcs
                </div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Compliance Ratio</div>
                <div style="font-size: 13px; font-weight: 800;">
                  ${percentage}%
                  <span style="font-size: 8px; font-weight: bold; display: block; margin-top: 1px; color: #000;">
                    (${difference === 0 ? 'Exact' : (difference > 0 ? `+${percentageDiff}%` : `${percentageDiff}%`)})
                  </span>
                </div>
              </div>
            </div>

            ${approvalStatusHtml}

            <h3 style="font-size: 12px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px;">1. ORDER VS CAPTURED QUANTITY SUMMARY</h3>
            <table>
              <thead>
                <tr style="background-color: #eee;">
                  <th style="text-align: center; width: 30px; padding: 4px;">#</th>
                  <th style="padding: 4px;">Department</th>
                  <th style="padding: 4px;">Description</th>
                  <th style="padding: 4px;">Shade</th>
                  <th style="text-align: center; padding: 4px;">UOM</th>
                  <th style="text-align: center; padding: 4px;">PO Target (pcs)</th>
                  <th style="text-align: center; padding: 4px;">Captured Recv (pcs)</th>
                  ${isAdmin ? `
                    <th style="text-align: right; padding: 4px;">Rate</th>
                    <th style="text-align: right; padding: 4px;">Amount</th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr style="font-weight: bold; background-color: #eee;">
                  <td colspan="5" style="padding: 4px 6px; font-size: 11px; font-weight: bold; text-align: right;">TOTAL QUANTITY:</td>
                  <td style="padding: 4px 6px; font-size: 11px; text-align: center; font-weight: bold;">${po.totalOrdered}</td>
                  <td style="padding: 4px 6px; font-size: 11px; text-align: center; font-weight: bold;">${po.totalReceived}</td>
                  ${isAdmin ? `
                    <td style="padding: 4px 6px; font-size: 11px; text-align: right;">—</td>
                    <td style="padding: 4px 6px; font-size: 11px; text-align: right; font-weight: bold;">${subtotal.toFixed(2)}</td>
                  ` : ''}
                </tr>
              </tbody>
            </table>

            ${isAdmin ? `
              <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
                <div style="width: 200px; border: 1px solid #000; padding: 6px; border-radius: 4px; font-size: 11px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span><strong>Subtotal:</strong></span><span>${subtotal.toFixed(2)}</span></div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span><strong>GST 12%:</strong></span><span>${gst.toFixed(2)}</span></div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; border-top: 1px solid #000; padding-top: 2px; margin-top: 2px;"><span><strong>Grand Total:</strong></span><span><strong>${grandTotal.toFixed(2)}</strong></span></div>
                </div>
              </div>
            ` : ''}

            <h3 style="font-size: 12px; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px;">2. WEIGHBRIDGE INDIVIDUAL RECEIPTS RECORD</h3>
            ${po.matchingCaptures.length > 0 ? `
              <table>
                <thead>
                  <tr style="background-color: #eee;">
                    <th style="padding: 4px; text-align: center;">S.No</th>
                    <th style="padding: 4px;">Date & Time</th>
                    <th style="padding: 4px;">Material</th>
                    <th style="padding: 4px;">Code</th>
                    <th style="padding: 4px; text-align: right;">Gross Wt</th>
                    <th style="padding: 4px; text-align: right;">Net Wt</th>
                    <th style="padding: 4px; text-align: right;">Pieces</th>
                    <th style="padding: 4px;">By</th>
                  </tr>
                </thead>
                <tbody>
                  ${po.matchingCaptures.map((cap, idx) => `
                    <tr style="border-bottom: 1px solid #000000;">
                      <td style="padding: 4px; font-size: 10px; text-align: center;">${idx + 1}</td>
                      <td style="padding: 4px; font-size: 10px;">${new Date(cap.capturedAt).toLocaleString('en-GB')}</td>
                      <td style="padding: 4px; font-size: 10px; font-weight: bold;">${cap.materialName}</td>
                      <td style="padding: 4px; font-size: 10px; font-family: monospace;">${cap.materialCode}</td>
                      <td style="padding: 4px; font-size: 10px; text-align: right;">${cap.grossWeightKg} kg</td>
                      <td style="padding: 4px; font-size: 10px; text-align: right;">${cap.netWeightKg} kg</td>
                      <td style="padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${cap.pieces}</td>
                      <td style="padding: 4px; font-size: 10px;">${cap.storeIncharge || 'System'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 12px; border: 1.5px dashed #000000; text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 12px;">
                No captured weighbridge receipts found.
              </div>
            `}

            ${signatureHtml}
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `;
    } 
    else if (po.type === 'Zip' || po.type === 'Doori') {
      const typeText = po.type.toUpperCase();
      const rowsHtml = po.items.map(item => {
        const received = po.items.length === 1 ? po.totalReceived : (po.itemizedReceived[item.name] || 0);

        const zipType = item.zipType || item.doriType || (po.type === 'Zip' ? 'BACK POCKET ZIP' : 'Dori Thread');
        const placement = item.placement || 'Main';
        const colour = item.colour || 'Black';
        const zipColour = item.zipColour || item.doriColour || 'Black';
        const price = item.price || 4.5;
        const totalCost = (item.ordered * price).toFixed(2);

        return `
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 5px; font-size: 11px; font-weight: bold; color: #000000;">${zipType}</td>
            <td style="padding: 5px; font-size: 11px;">${placement}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center;">${colour}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center;">${zipColour}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center; font-weight: bold;">${item.ordered}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center; font-weight: bold;">${received}</td>
            ${isAdmin ? `
              <td style="padding: 5px; font-size: 11px; text-align: right;">${Number(price).toFixed(2)}</td>
              <td style="padding: 5px; font-size: 11px; text-align: right; font-weight: bold;">${totalCost}</td>
            ` : ''}
          </tr>
        `;
      }).join('');

      printTemplate = `
        <html>
          <head>
            <title>${typeText} PO DETAILS - ${po.poNumber}</title>
            <style>
              body { font-family: 'Inter', sans-serif; color: #000000; margin: 0; padding: 15px; background-color: #ffffff; line-height: 1.2; }
              .header-title { text-align: center; font-size: 16px; font-weight: bold; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; }
              .meta-table { width: 100%; border: 1px solid #000; margin-bottom: 12px; border-collapse: collapse; }
              .meta-table td { border: 1px solid #000; padding: 5px 8px; font-size: 11px; }
              table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid #000000; }
              table.items-table th, table.items-table td { border: 1px solid #000000; padding: 5px 8px; }
              table.items-table th { font-size: 11px; text-transform: uppercase; text-align: left; font-weight: 800; background-color: #eee; }
              @media print {
                @page { size: portrait; margin: 6mm; }
                body { padding: 0; margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header-title">${typeText} PO DETAILS (ORIGINAL)</div>
            
            <table class="meta-table">
              <tr>
                <td><strong>DATE :</strong> ${po.date}</td>
                <td><strong>ITEM :</strong> ${po.garmentType || 'SWEATSHIRT'}</td>
              </tr>
              <tr>
                <td><strong>TOTAL PCS :</strong> ${po.totalOrdered}</td>
                <td><strong>PRIORITY :</strong> ${po.priority || 'High'}</td>
              </tr>
              <tr>
                <td><strong>BRAND :</strong> ${po.brand || 'N/A'}</td>
                <td><strong>SUPERVISOR :</strong> ${po.supervisor || 'N/A'}</td>
              </tr>
              <tr>
                <td colspan="2"><strong>SUPPLIER :</strong> ${po.vendor}</td>
              </tr>
            </table>

            <div style="background-color: #ffffff; border: 1.5px solid #000000; padding: 6px 12px; border-radius: 4px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">PO Order Qty</div>
                <div style="font-size: 13px; font-weight: 800;">${po.totalOrdered} pcs</div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Total Received</div>
                <div style="font-size: 13px; font-weight: 800;">${po.totalReceived} pcs</div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Receipt Difference</div>
                <div style="font-size: 13px; font-weight: 800;">
                  ${difference === 0 ? '0' : (difference > 0 ? `+${difference}` : difference)} pcs
                </div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Compliance Ratio</div>
                <div style="font-size: 13px; font-weight: 800;">
                  ${percentage}%
                  <span style="font-size: 8px; font-weight: bold; display: block; margin-top: 1px; color: #000;">
                    (${difference === 0 ? 'Exact' : (difference > 0 ? `+${percentageDiff}%` : `${percentageDiff}%`)})
                  </span>
                </div>
              </div>
            </div>

            ${approvalStatusHtml}

            <table class="items-table">
              <thead>
                <tr>
                  <th>${typeText} TYPE</th>
                  <th>PLACEMENT</th>
                  <th style="text-align: center;">COLOUR</th>
                  <th style="text-align: center;">${typeText} COLOUR</th>
                  <th style="text-align: center;">QUANTITY</th>
                  <th style="text-align: center;">RECV QTY</th>
                  ${isAdmin ? `
                    <th style="text-align: right;">PRICE</th>
                    <th style="text-align: right;">TOTAL</th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="border: 1px solid #000; padding: 6px 10px; margin-bottom: 12px; font-size: 11px;">
              <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px;">${typeText} TYPE SUMMARY</div>
              <div style="display: flex; justify-content: space-between;">
                <span>Total pieces for stitching lot:</span>
                <strong>${po.totalOrdered} pcs</strong>
              </div>
            </div>

            <h3 style="font-size: 12px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px;">2. WEIGHBRIDGE INDIVIDUAL RECEIPTS RECORD</h3>
            ${po.matchingCaptures.length > 0 ? `
              <table class="items-table">
                <thead>
                  <tr style="background-color: #eee;">
                    <th>S.No</th>
                    <th>Date & Time</th>
                    <th>Material Received</th>
                    <th>Material Code</th>
                    <th style="text-align: right;">Gross Wt</th>
                    <th style="text-align: right;">Net Wt</th>
                    <th style="text-align: right; font-weight: bold;">Calculated Pieces</th>
                    <th>Captured By</th>
                  </tr>
                </thead>
                <tbody>
                  ${po.matchingCaptures.map((cap, idx) => `
                    <tr>
                      <td style="text-align: center;">${idx + 1}</td>
                      <td>${new Date(cap.capturedAt).toLocaleString('en-GB')}</td>
                      <td style="font-weight: bold;">${cap.materialName}</td>
                      <td style="font-family: monospace;">${cap.materialCode}</td>
                      <td style="text-align: right;">${cap.grossWeightKg} kg</td>
                      <td style="text-align: right;">${cap.netWeightKg} kg</td>
                      <td style="text-align: right; font-weight: bold;">${cap.pieces}</td>
                      <td>${cap.storeIncharge || 'System'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 20px; border: 2px dashed #000000; text-align: center; font-size: 13px; font-weight: bold;">
                No captured weighbridge receipts found.
              </div>
            `}

            ${signatureHtml}
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `;
    }
    else if (po.type === 'RGP') {
      const totalIssued = po.items.reduce((sum, item) => sum + (Number(item.ordered) || 0), 0);
      const totalBags = po.items.reduce((sum, item) => sum + (Number(item.bags) || 0), 0);
      const totalsRowHtml = `
        <tr style="background-color: #f8fafc; font-weight: bold; border-top: 1.5px solid #000000;">
          <td colSpan="6" style="padding: 5px; font-size: 11px; text-align: right; border-bottom: 1.5px solid #000000;">TOTAL QUANTITY:</td>
          <td style="padding: 5px; font-size: 11px; text-align: center; border-bottom: 1.5px solid #000000;">${totalIssued}</td>
          <td style="padding: 5px; font-size: 11px; text-align: center; border-bottom: 1.5px solid #000000;">${po.totalReceived}</td>
          <td style="padding: 5px; font-size: 11px; text-align: center; border-bottom: 1.5px solid #000000;">${totalBags}</td>
        </tr>
      `;
      const itemizedRowsHtml = po.items.map((item, idx) => {
        const received = po.items.length === 1 ? po.totalReceived : (po.itemizedReceived[item.name] || 0);

        return `
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 5px; font-size: 11px; text-align: center;">${idx + 1}</td>
            <td style="padding: 5px; font-size: 11px; font-weight: bold;">${item.lotNo || po.poNumber}</td>
            <td style="padding: 5px; font-size: 11px;">${item.dept || 'Stitching'}</td>
            <td style="padding: 5px; font-size: 11px; font-weight: bold; color: #000000;">${item.name}</td>
            <td style="padding: 5px; font-size: 11px;">${item.purpose || 'Stitching'}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center;">${item.uom || 'PCS'}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center; font-weight: bold;">${item.ordered}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center; font-weight: bold;">${received}</td>
            <td style="padding: 5px; font-size: 11px; text-align: center;">${item.bags || '0'}</td>
          </tr>
        `;
      }).join('') + totalsRowHtml;

      printTemplate = `
        <html>
          <head>
            <title>Returnable Gate Pass Audit - ${po.poNumber}</title>
            <style>
              body { font-family: 'Inter', sans-serif; color: #000000; margin: 0; padding: 15px; background-color: #ffffff; line-height: 1.2; }
              .header-title { text-align: center; font-size: 16px; font-weight: bold; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
              .border-box { border: 1px solid #000000; border-radius: 4px; padding: 8px; }
              .box-title { font-size: 10px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000000; padding-bottom: 2px; margin-bottom: 6px; }
              .box-row { font-size: 11px; margin-bottom: 2px; }
              .box-row strong { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #000000; }
              th, td { border: 1px solid #000000; padding: 5px 8px; font-size: 11px; }
              th { text-transform: uppercase; text-align: left; font-weight: 800; background-color: #eee; }
              @media print {
                @page { size: portrait; margin: 6mm; }
                body { padding: 0; margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header-title">RETURNABLE GATE PASS (RGP) AUDIT REPORT</div>
            
            <div class="details-grid">
              <div class="border-box">
                <div class="box-title">GATE PASS DETAILS</div>
                <div class="box-row"><strong>RGP #:</strong> ${po.poNumber}</div>
                <div class="box-row"><strong>Issue Date:</strong> ${po.date}</div>
                <div class="box-row"><strong>Expected Return Date:</strong> ${po.expectedReturnDate}</div>
                <div class="box-row"><strong>Prepared By:</strong> ${po.preparedBy}</div>
                <div class="box-row"><strong>Authorized By:</strong> ${po.authorizedBy}</div>
              </div>
              
              <div class="border-box">
                <div class="box-title">SUPPLIER & TRANSPORT</div>
                <div class="box-row"><strong>Supplier Name:</strong> ${po.vendor}</div>
                <div class="box-row"><strong>Vehicle No:</strong> ${po.vehicleNo}</div>
                <div class="box-row"><strong>Remarks:</strong> ${po.remarks || 'N/A'}</div>
              </div>
            </div>

            <div style="background-color: #ffffff; border: 1.5px solid #000000; padding: 6px 12px; border-radius: 4px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">RGP Issued Qty</div>
                <div style="font-size: 13px; font-weight: 800;">${po.totalOrdered} pcs</div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Total Returned</div>
                <div style="font-size: 13px; font-weight: 800;">${po.totalReceived} pcs</div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Outstanding Balance</div>
                <div style="font-size: 13px; font-weight: 800;">
                  ${po.totalOrdered - po.totalReceived} pcs
                </div>
              </div>
              <div>
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; color: #000;">Return Ratio</div>
                <div style="font-size: 13px; font-weight: 800;">
                  ${percentage}%
                </div>
              </div>
            </div>

            ${approvalStatusHtml}

            <h3 style="font-size: 14px; margin-bottom: 12px; text-transform: uppercase; border-bottom: 2px solid #000;">1. MATERIAL ISSUE VS RETURN SUMMARY</h3>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center; width: 40px;">#</th>
                  <th>Lot No</th>
                  <th>Department</th>
                  <th>Description</th>
                  <th>Purpose</th>
                  <th style="text-align: center;">UOM</th>
                  <th style="text-align: center;">Issued Qty</th>
                  <th style="text-align: center;">Returned Qty</th>
                  <th style="text-align: center;">Bags</th>
                </tr>
              </thead>
              <tbody>
                ${itemizedRowsHtml}
              </tbody>
            </table>

            <h3 style="font-size: 14px; margin-top: 40px; margin-bottom: 12px; text-transform: uppercase; border-bottom: 2px solid #000;">2. WEIGHBRIDGE RE-ENTRY RECEIPTS RECORD</h3>
            ${po.matchingCaptures.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date & Time</th>
                    <th>Material Received</th>
                    <th>Material Code</th>
                    <th style="text-align: right;">Gross Wt</th>
                    <th style="text-align: right;">Net Wt</th>
                    <th style="text-align: right;">Calculated Pieces</th>
                    <th>Captured By</th>
                  </tr>
                </thead>
                <tbody>
                  ${po.matchingCaptures.map((cap, idx) => `
                    <tr style="border-bottom: 1px solid #000000;">
                      <td style="padding: 8px; font-size: 12px; text-align: center;">${idx + 1}</td>
                      <td style="padding: 8px; font-size: 12px;">${new Date(cap.capturedAt).toLocaleString('en-GB')}</td>
                      <td style="padding: 8px; font-size: 12px; font-weight: bold;">${cap.materialName}</td>
                      <td style="padding: 8px; font-size: 12px; font-family: monospace;">${cap.materialCode}</td>
                      <td style="padding: 8px; font-size: 12px; text-align: right;">${cap.grossWeightKg} kg</td>
                      <td style="padding: 8px; font-size: 12px; text-align: right;">${cap.netWeightKg} kg</td>
                      <td style="padding: 8px; font-size: 12px; text-align: right; font-weight: bold;">${cap.pieces}</td>
                      <td style="padding: 8px; font-size: 12px;">${cap.storeIncharge || 'System'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 20px; border: 2px dashed #000000; text-align: center; font-size: 13px; font-weight: bold;">
                No weighbridge re-entry receipts found.
              </div>
            `}

            ${rgpSignatureHtml}
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `;
    } 
    else {
      printTemplate = `
        <html>
          <head>
            <title>Verification Report - ${po.poNumber}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { border-bottom: 2px solid #000; text-align: left; padding: 8px; }
              td { border-bottom: 1px solid #ccc; padding: 8px; }
            </style>
          </head>
          <body>
            <h2>VERIFICATION AUDIT FOR CUSTOM PO: ${po.poNumber}</h2>
            <p><strong>Supplier:</strong> ${po.vendor}</p>
            <p><strong>Date:</strong> ${po.date}</p>
            <p><strong>Total Ordered:</strong> ${po.totalOrdered} pcs</p>
            <p><strong>Total Received:</strong> ${po.totalReceived} pcs</p>
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Order target</th>
                  <th>Received</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Trim shipment</td>
                  <td>${po.totalOrdered}</td>
                  <td>${po.totalReceived}</td>
                  <td>${difference} (${percentageDiff}%)</td>
                </tr>
              </tbody>
            </table>
            ${approvalStatusHtml}
            ${signatureHtml}
            <script>window.print();</script>
          </body>
        </html>
      `;
    }

    printWindow.document.write(printTemplate);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-primary, #ffffff)',
            border: `1.5px solid ${toast.type === 'success' ? '#10b981' : '#f43e5c'}`,
            borderRadius: 'var(--border-radius-md, 12px)',
            padding: '12px 20px',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={24} style={{ color: '#10b981', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={24} style={{ color: '#f43e5c', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: '700', color: toast.type === 'success' ? '#10b981' : '#f43e5c', fontSize: '14px' }}>{toast.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-main, #1e293b)' }}>{toast.message}</div>
          </div>
        </div>
      )}

      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-family-title)' }}>PO Receipts Verification System</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Match ordered items against weighbridge-captured receipt logs under the same PO Number
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Refresh Data
        </button>
      </div>

      {/* Dashboard cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        
        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracked POs</span>
            <FileText size={18} style={{ color: 'var(--accent-color)' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 2px 0', color: 'var(--text-main)' }}>{stats.total}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Registered PO documents</div>
        </div>

        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fully Verified</span>
            <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 2px 0', color: '#10b981' }}>{stats.matched}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Receipts match PO perfectly</div>
        </div>

        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #f43e5c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shortages</span>
            <TrendingDown size={18} style={{ color: '#f43e5c' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 2px 0', color: '#f43e5c' }}>{stats.shortages}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Under-received discrepancies</div>
        </div>

        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Excess / Overages</span>
            <TrendingUp size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 2px 0', color: '#8b5cf6' }}>{stats.excess}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Over-received PO shipments</div>
        </div>

        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #64748b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Receipts</span>
            <Clock size={18} style={{ color: '#64748b' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 2px 0', color: '#64748b' }}>{stats.pending}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 pieces received so far</div>
        </div>

      </div>

      {/* Main Panel Search + Listing Grid */}
      <div className="panel" style={{ padding: '20px' }}>
        
        {/* Search controls */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: '1 1 250px', marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                className="form-input"
                placeholder="Search PO Number, Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', height: '40px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ flex: '0 1 180px', marginBottom: 0 }}>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '40px', cursor: 'pointer' }}
            >
              <option value="all">🔍 All Statuses</option>
              <option value="matched">🟢 Matched</option>
              <option value="shortage">🔴 Shortages</option>
              <option value="excess">🟣 Excess</option>
              <option value="pending">⏳ Pending</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: '0 1 180px', marginBottom: 0 }}>
            <select
              className="form-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ height: '40px', cursor: 'pointer' }}
            >
              <option value="all">📦 All Types</option>
              <option value="general">📄 General PO</option>
              <option value="rgp">🚚 RGP (Gate Pass)</option>
              <option value="unregistered po">⚠️ Unregistered PO</option>
            </select>
          </div>

          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
            <button
              onClick={() => setActiveViewTab('report')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: activeViewTab === 'report' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: activeViewTab === 'report' ? '#fff' : 'var(--text-main)',
                fontSize: '12.5px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Report View
            </button>
            <button
              onClick={() => setActiveViewTab('timeline')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: activeViewTab === 'timeline' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: activeViewTab === 'timeline' ? '#fff' : 'var(--text-main)',
                fontSize: '12.5px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Live Receipt Feed
            </button>
          </div>
        </div>

        {/* View switching */}
        {activeViewTab === 'report' ? (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PO Number</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Supplier / Vendor</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Ordered</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Received</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Difference</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                      <span>Verifying PO database records...</span>
                    </td>
                  </tr>
                ) : displayPOs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      <HelpCircle size={32} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
                      <div>No matching purchase orders or receipt verification records found.</div>
                    </td>
                  </tr>
                ) : (
                  displayPOs.map((po) => {
                    const diff = po.totalReceived - po.totalOrdered;
                    let diffStyle = { color: 'var(--text-muted)', fontWeight: 'bold' };
                    let statusColor = '#64748b';
                    let statusBg = 'rgba(100, 116, 139, 0.1)';

                    if (po.verificationStatus === 'Matched') {
                      statusColor = '#10b981';
                      statusBg = 'rgba(16, 185, 129, 0.1)';
                    } else if (po.verificationStatus === 'Shortage') {
                      statusColor = '#f43e5c';
                      statusBg = 'rgba(244, 62, 92, 0.1)';
                      diffStyle = { color: '#f43e5c', fontWeight: '800' };
                    } else if (po.verificationStatus === 'Excess') {
                      statusColor = '#8b5cf6';
                      statusBg = 'rgba(139, 92, 246, 0.1)';
                      diffStyle = { color: '#8b5cf6', fontWeight: '800' };
                    }

                    return (
                      <tr
                        key={po.poNumber}
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                        className="hover-row"
                        onClick={() => setSelectedPO(po)}
                      >
                        <td style={{ padding: '14px 8px', fontWeight: '800', color: 'var(--accent-color)' }}>
                          {po.poNumber}
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 'bold',
                            backgroundColor: po.type === 'Zip' ? '#dbeafe' : (po.type === 'Doori' ? '#fef3c7' : (po.type === 'General' ? '#d1fae5' : '#fee2e2')),
                            color: po.type === 'Zip' ? '#1e40af' : (po.type === 'Doori' ? '#92400e' : (po.type === 'General' ? '#065f46' : '#991b1b'))
                          }}>
                            {po.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', fontWeight: '500', color: 'var(--text-main)' }}>
                          {po.vendor}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {po.totalOrdered}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--accent-color)' }}>
                          {po.totalReceived}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right', ...diffStyle }}>
                          {diff === 0 ? '—' : (diff > 0 ? `+${diff}` : `${diff}`)}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                            color: statusColor, backgroundColor: statusBg, textTransform: 'uppercase', letterSpacing: '0.03em'
                          }}>
                            {po.verificationStatus}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedPO(po)}
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            >
                              Details
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handlePrintVerificationReport(po)}
                              disabled={po.totalReceived === 0}
                              style={{ padding: '4px 8px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Printer size={13} />
                              <span>Audit PDF</span>
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
        ) : (
          /* Live timeline view */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                <span>Checking weighbridge captures...</span>
              </div>
            ) : captures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                No weighbridge captures exist in the database logs. Go to Material Add to log one.
              </div>
            ) : (
              captures.map((cap) => {
                const normPo = cap.poNumber ? String(cap.poNumber).trim().toLowerCase() : '';
                const matchedPo = normPo ? unifiedPOs.find(p => String(p.poNumber).trim().toLowerCase() === normPo) : null;

                return (
                  <div
                    key={cap.id}
                    className="hover-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: 'var(--border-radius-md)',
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContext: 'center', flexShrink: 0
                      }}>
                        <Scale size={20} style={{ margin: 'auto' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14.5px' }}>{cap.materialName}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                            {cap.materialCode}
                          </span>
                          {cap.poNumber ? (
                            <span style={{
                              padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              backgroundColor: matchedPo ? '#d1fae5' : '#fee2e2',
                              color: matchedPo ? '#065f46' : '#991b1b'
                            }}>
                              PO: {cap.poNumber} {matchedPo ? `(${matchedPo.type})` : '(Unregistered)'}
                            </span>
                          ) : (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#475569' }}>
                              No PO Ref
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} />
                            <span>Operator: {cap.storeIncharge || 'Punnet'}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>{cap.capturedAt ? new Date(cap.capturedAt).toLocaleString('en-GB') : 'N/A'}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Box size={12} />
                            <span>Location: {cap.storeLocation || 'Main Hall'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Weight</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{cap.netWeightKg} kg</div>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Recv Pieces</div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--accent-color)' }}>{cap.pieces} pcs</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* PO Detail slide-out panel (Modal overlay) */}
      {selectedPO && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPO(null)}
          style={{ zIndex: 1050 }}
        >
          <div
            className="modal-content animate-scale"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{
                  padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 'bold',
                  backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', textTransform: 'uppercase'
                }}>
                  {selectedPO.type} PO RECEIPT AUDIT
                </span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Verification Details for {selectedPO.poNumber}
                </h3>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPO(null)}
                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>

            {/* Meta statistics in drawer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor</div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px', wordBreak: 'break-word' }}>{selectedPO.vendor}</div>
              </div>
              <div style={{ padding: '12px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PO Issue Date</div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>{selectedPO.date}</div>
              </div>
              <div style={{ padding: '12px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ordered Qty</div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>{selectedPO.totalOrdered} pcs</div>
              </div>
              <div style={{ padding: '12px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Received Qty</div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--accent-color)', marginTop: '4px' }}>{selectedPO.totalReceived} pcs</div>
              </div>
              <div style={{ padding: '12px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Match Status</div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                    color: selectedPO.verificationStatus === 'Matched' ? '#10b981' : (selectedPO.verificationStatus === 'Shortage' ? '#f43e5c' : (selectedPO.verificationStatus === 'Excess' ? '#8b5cf6' : '#64748b')),
                    backgroundColor: selectedPO.verificationStatus === 'Matched' ? 'rgba(16,185,129,0.1)' : (selectedPO.verificationStatus === 'Shortage' ? 'rgba(244,62,92,0.1)' : (selectedPO.verificationStatus === 'Excess' ? 'rgba(139,92,246,0.1)' : 'rgba(100,116,139,0.1)')),
                    textTransform: 'uppercase'
                  }}>
                    {selectedPO.verificationStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit mismatch alert */}
            {selectedPO.totalReceived > 0 && selectedPO.totalReceived !== selectedPO.totalOrdered && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: selectedPO.verificationStatus === 'Shortage' ? 'rgba(244, 62, 92, 0.06)' : 'rgba(139, 92, 246, 0.06)',
                border: `1.5px solid ${selectedPO.verificationStatus === 'Shortage' ? 'rgba(244, 62, 92, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                marginBottom: '20px'
              }}>
                {selectedPO.verificationStatus === 'Shortage' ? (
                  <>
                    <AlertTriangle size={22} style={{ color: '#f43e5c', flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', color: '#f43e5c', fontWeight: '600' }}>
                      <strong>Discrepancy Warning (Shortage):</strong> Supplier has under-delivered. Received <strong>{selectedPO.totalReceived} pieces</strong>, which is <strong>{selectedPO.totalOrdered - selectedPO.totalReceived} pieces short</strong> of the ordered quantity.
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={22} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', color: '#8b5cf6', fontWeight: '600' }}>
                      <strong>Delivery Notice (Excess):</strong> Supplier has over-delivered. Received <strong>{selectedPO.totalReceived} pieces</strong>, which is <strong>{selectedPO.totalReceived - selectedPO.totalOrdered} pieces extra</strong>.
                    </span>
                  </>
                )}
              </div>
            )}

            {/* 1. Itemized comparison table */}
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              1. Detailed Item Matching
            </h4>
            <div className="table-responsive" style={{ marginBottom: '24px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {selectedPO.type === 'General' && (
                  <>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>#</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shade</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>UOM</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Target (pcs)</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Recv (pcs)</th>
                        {isAdmin && (
                          <>
                            <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Rate</th>
                            <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map((item, idx) => {
                        const received = selectedPO.items.length === 1 ? selectedPO.totalReceived : (selectedPO.itemizedReceived[item.name] || 0);
                        const rate = item.price || 50.00;
                        const amount = item.ordered * rate;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>Trims</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: '700' }}>{item.name}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>—</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>PCS</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold' }}>{item.ordered}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-color)' }}>{received}</td>
                            {isAdmin && (
                              <>
                                <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right' }}>{currencySymbol} {rate.toFixed(2)}</td>
                                <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right', fontWeight: 'bold' }}>{currencySymbol} {amount.toFixed(2)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      <tr style={{ background: 'var(--bg-secondary)', borderTop: '1.5px solid var(--border-color)', fontWeight: 'bold' }}>
                        <td colSpan={5} style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right' }}>TOTAL QUANTITY:</td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{selectedPO.totalOrdered}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', color: 'var(--accent-color)' }}>{selectedPO.totalReceived}</td>
                        {isAdmin && (
                          <>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right' }}>—</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right' }}>
                              {currencySymbol} {(selectedPO.totalCost ? Number(selectedPO.totalCost) : selectedPO.items.reduce((sum, item) => sum + (item.ordered * (item.price || 50.00)), 0)).toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </>
                )}

                {(selectedPO.type === 'Zip' || selectedPO.type === 'Doori') && (
                  <>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>{selectedPO.type.toUpperCase()} TYPE</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>PLACEMENT</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>COLOUR</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>ZIP COLOUR</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>QUANTITY</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>RECV QTY</th>
                        {isAdmin && (
                          <>
                            <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>PRICE</th>
                            <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>TOTAL</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map((item, idx) => {
                        const zipType = item.zipType || item.doriType || (selectedPO.type === 'Zip' ? 'BACK POCKET ZIP' : 'Dori Thread');
                        const placement = item.placement || 'Main';
                        const colour = item.colour || 'Black';
                        const zipColour = item.zipColour || item.doriColour || 'Black';
                        const price = item.price || 4.5;
                        const totalCost = item.ordered * price;

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: '700' }}>{zipType}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>{placement}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{colour}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{zipColour}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold' }}>{item.ordered}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-color)' }}>{selectedPO.items.length === 1 ? selectedPO.totalReceived : (selectedPO.itemizedReceived[item.name] || 0)}</td>
                            {isAdmin && (
                              <>
                                <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right' }}>{currencySymbol} {Number(price).toFixed(2)}</td>
                                <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right', fontWeight: 'bold' }}>{currencySymbol} {totalCost.toFixed(2)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {selectedPO.type === 'RGP' && (
                  <>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>#</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Lot No</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Department</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Description</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Purpose</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>UOM</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Issued Qty</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Returned Qty</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Bags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map((item, idx) => {
                        const received = selectedPO.items.length === 1 ? selectedPO.totalReceived : (selectedPO.itemizedReceived[item.name] || 0);
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: 'bold' }}>{item.lotNo || selectedPO.poNumber}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>{item.dept || 'Stitching'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: '700' }}>{item.name}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>{item.purpose || 'Stitching'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{item.uom || 'PCS'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold' }}>{item.ordered}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-color)' }}>{received}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>{item.bags || '0'}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: 'var(--bg-secondary)', borderTop: '1.5px solid var(--border-color)', fontWeight: 'bold' }}>
                        <td colSpan={6} style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right' }}>TOTAL QUANTITY:</td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>
                          {selectedPO.items.reduce((sum, item) => sum + (Number(item.ordered) || 0), 0)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center', color: 'var(--accent-color)' }}>
                          {selectedPO.totalReceived}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'center' }}>
                          {selectedPO.items.reduce((sum, item) => sum + (Number(item.bags) || 0), 0)}
                        </td>
                      </tr>
                    </tbody>
                  </>
                )}

                {selectedPO.type === 'Unregistered PO' && (
                  <>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>Material Description</th>
                        <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Ordered Qty (pcs)</th>
                        <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Received Qty (pcs)</th>
                        <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Difference Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '700' }}>Standard Trim shipment</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>{selectedPO.totalOrdered}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>{selectedPO.totalReceived}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: '800', color: '#8b5cf6' }}>
                          +{selectedPO.totalReceived} Excess (+100.0%)
                        </td>
                      </tr>
                    </tbody>
                  </>
                )}
              </table>
            </div>

            {/* 2. Weight captures details */}
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              2. Individual Material Add Receipts
            </h4>
            <div className="table-responsive" style={{ border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>Date & Time</th>
                    <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>Material Recv</th>
                    <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Net Wt</th>
                    <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Pieces</th>
                    <th style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.matchingCaptures.length > 0 ? (
                    selectedPO.matchingCaptures.map((cap) => (
                      <tr key={cap.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {cap.capturedAt ? new Date(cap.capturedAt).toLocaleString('en-GB') : 'N/A'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>{cap.materialName}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right', fontWeight: '500' }}>{cap.netWeightKg} kg</td>
                        <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right', fontWeight: '800', color: 'var(--accent-color)' }}>{cap.pieces}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{cap.storeIncharge || 'System'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                        No captured weighbridge receipts match this PO number.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions block in drawer */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedPO(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handlePrintVerificationReport(selectedPO)}
                disabled={selectedPO.totalReceived === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Printer size={16} />
                <span>Print Audit Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
