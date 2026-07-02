import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create PDF styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333333',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0b2240',
    paddingBottom: 15,
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0b2240',
  },
  subtitle: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  poDetails: {
    alignItems: 'flex-end',
  },
  poTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0b2240',
  },
  poText: {
    fontSize: 9,
    marginTop: 3,
  },
  addressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  addressBox: {
    width: '46%',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#0b2240',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 2,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0b2240',
    color: '#ffffff',
    fontWeight: 'bold',
    padding: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 6,
    alignItems: 'center',
  },
  colDesc: { width: '45%' },
  colQty: { width: '15%', textAlign: 'center' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableRowText: {
    fontSize: 8,
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsTable: {
    width: '40%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalsRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#0b2240',
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: 9,
    color: '#4b5563',
  },
  totalVal: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  termsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0b2240',
    marginBottom: 4,
  },
  termsText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'justify',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    alignItems: 'center',
    paddingTop: 5,
  },
  signatureText: {
    fontSize: 8,
    color: '#4b5563',
  }
});

// Create PDF Document Component
export const PDFDocument = ({ po, currencySymbol = 'R' }) => {
  if (!po) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.logo}>G-PDMS</Text>
            <Text style={styles.subtitle}>Garment Product Design & Management System</Text>
          </View>
          <View style={styles.poDetails}>
            <Text style={styles.poTitle}>PURCHASE ORDER</Text>
            <Text style={styles.poText}>PO Number: {po.poNumber}</Text>
            <Text style={styles.poText}>Date: {po.date}</Text>
            <Text style={styles.poText}>Status: {po.status}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.sectionTitle}>Vendor / Supplier</Text>
            <Text style={styles.addressText}>{po.vendorName}</Text>
            <Text style={styles.addressText}>{po.vendorEmail || 'N/A'}</Text>
            <Text style={styles.addressText}>{po.vendorAddress || 'Textile Hub Industrial Zone'}</Text>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text style={styles.addressText}>G-PDMS Manufacturing Unit</Text>
            <Text style={styles.addressText}>Warehouse 4, Apparel Park</Text>
            <Text style={styles.addressText}>Mumbai, India - 400012</Text>
            <Text style={styles.addressText}>Attn: Procurement Team</Text>
          </View>
        </View>

        {/* Design Context (If PO generated for a design) */}
        {po.designName && (
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 9, color: '#4b5563' }}>
              <Text style={{ fontWeight: 'bold', color: '#0b2240' }}>Associated Design: </Text>
              {po.designName} ({po.designCategory})
            </Text>
          </View>
        )}

        {/* Table of items */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>Material Description</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty Ordered</Text>
            <Text style={[styles.colUnit, styles.tableHeaderText]}>Unit</Text>
            <Text style={[styles.colPrice, styles.tableHeaderText]}>Unit Price</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total ({currencySymbol})</Text>
          </View>

          {/* Table Rows */}
          {po.items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <View style={styles.colDesc}>
                <Text style={styles.tableRowText}>{item.name}</Text>
                {item.description && (
                  <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.colQty, styles.tableRowText]}>{item.qty}</Text>
              <Text style={[styles.colUnit, styles.tableRowText]}>{item.unit || 'pcs'}</Text>
              <Text style={[styles.colPrice, styles.tableRowText]}>
                {currencySymbol} {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.colTotal, styles.tableRowText]}>
                {currencySymbol} {Number(item.qty * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalVal}>
                {currencySymbol} {Number(po.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Tax ({po.taxRate || 18}%)</Text>
              <Text style={styles.totalVal}>
                {currencySymbol} {Number(po.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.totalsRowBold}>
              <Text style={[styles.totalLabel, { fontWeight: 'bold', color: '#0b2240' }]}>Grand Total</Text>
              <Text style={styles.totalVal}>
                {currencySymbol} {Number(po.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            1. Please send two copies of the invoice upon shipping raw materials.
            2. All materials must conform to ISO quality standards. Damaged fabric rolls or trims will be returned at the supplier's expense.
            3. Delivery must be completed on or before {po.deliveryDate || 'the specified date'}.
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Prepared By</Text>
            <Text style={[styles.signatureText, { marginTop: 12, fontWeight: 'bold' }]}>Procurement Manager</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Authorized Approval</Text>
            <Text style={[styles.signatureText, { marginTop: 12, fontWeight: 'bold' }]}>Operations Director</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
