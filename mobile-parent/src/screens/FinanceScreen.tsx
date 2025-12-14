import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Share, Linking } from 'react-native';
import { User, Invoice, InvoiceStatus } from '../types';
import * as api from '../api';

interface FinanceScreenProps {
  user: User;
}

const statusColorMap: { [key in InvoiceStatus]: { bg: string, text: string } } = {
  [InvoiceStatus.Paid]: { bg: '#dcfce7', text: '#166534' },
  [InvoiceStatus.Unpaid]: { bg: '#fef3c7', text: '#92400e' },
  [InvoiceStatus.Overdue]: { bg: '#fee2e2', text: '#991b1b' },
};

const FinanceScreen: React.FC<FinanceScreenProps> = ({ user }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
    const [schoolSettings, setSchoolSettings] = useState<any | null>(null);

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId)
            .then(data => setInvoices(data.invoices))
            .finally(() => setLoading(false));
    }, [user.parentId]);

    useEffect(() => {
        if (!user.schoolId) return;
        api.getSchoolSettings(user.schoolId).then(setSchoolSettings).catch(() => {});
    }, [user.schoolId]);

    const summary = useMemo(() => {
        const total = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const paid = invoices.filter(inv => inv.status === InvoiceStatus.Paid).reduce((sum, inv) => sum + inv.totalAmount, 0);
        return { total, paid, due: total - paid };
    }, [invoices]);

    const renderItem = ({ item }: { item: Invoice }) => (
        <View style={styles.invoiceItem}>
            <View>
                <Text style={styles.invoiceId}>فاتورة #{item.id.split('_')[1]}</Text>
                <Text style={styles.dueDate}>تستحق في: {item.dueDate}</Text>
            </View>
            <View style={{alignItems: 'flex-start'}}>
                <Text style={styles.amount}>${item.totalAmount.toFixed(2)}</Text>
                 <View style={[styles.statusBadge, { backgroundColor: statusColorMap[item.status].bg }]}>
                    <Text style={[styles.statusText, { color: statusColorMap[item.status].text }]}>{item.status}</Text>
                </View>
                <TouchableOpacity onPress={() => setInvoiceToPrint(item)} style={styles.printButton}>
                    <Text style={styles.printButtonText}>طباعة/مشاركة</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>المبلغ المدفوع</Text><Text style={styles.summaryValue}>${summary.paid.toFixed(2)}</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>المبلغ المستحق</Text><Text style={[styles.summaryValue, { color: '#dc2626' }]}>${summary.due.toFixed(2)}</Text></View>
            </View>
            <FlatList
                data={invoices}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{padding: 16}}
                ListEmptyComponent={<View style={styles.center}><Text>لا توجد فواتير لعرضها.</Text></View>}
            />
            <Modal visible={!!invoiceToPrint} transparent animationType="fade" onRequestClose={() => setInvoiceToPrint(null)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setInvoiceToPrint(null)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>فاتورة رسوم</Text>
                            <Pressable onPress={() => setInvoiceToPrint(null)}><Text style={styles.closeText}>✕</Text></Pressable>
                        </View>
                        <View style={styles.brandRow}>
                            {schoolSettings?.schoolLogoUrl ? (
                                <Image source={{ uri: api.getAssetUrl(String(schoolSettings.schoolLogoUrl)) }} style={styles.logo} />
                            ) : null}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.schoolName}>{schoolSettings?.schoolName || 'المدرسة'}</Text>
                                {schoolSettings?.schoolAddress ? <Text style={styles.schoolMeta}>{schoolSettings.schoolAddress}</Text> : null}
                                {(schoolSettings?.contactPhone || schoolSettings?.contactEmail) ? <Text style={styles.schoolMeta}>{[schoolSettings?.contactPhone, schoolSettings?.contactEmail].filter(Boolean).join(' • ')}</Text> : null}
                            </View>
                        </View>
                        {invoiceToPrint && (
                            <View style={{ gap: 6 }}>
                                <Text style={styles.field}>الطالب: {invoiceToPrint.studentName}</Text>
                                <Text style={styles.field}>رقم الفاتورة: {String(invoiceToPrint.id).replace('inv_','')}</Text>
                                <Text style={styles.field}>الإصدار: {invoiceToPrint.issueDate} • الاستحقاق: {invoiceToPrint.dueDate}</Text>
                                <View style={styles.buttonsRow}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                                        const cur = String(schoolSettings?.defaultCurrency || 'SAR');
                                        const remaining = (invoiceToPrint.remainingAmount != null) ? invoiceToPrint.remainingAmount : (invoiceToPrint.totalAmount - (invoiceToPrint.paidAmount || 0));
                                        const logo = schoolSettings?.schoolLogoUrl ? api.getAssetUrl(String(schoolSettings?.schoolLogoUrl)) : '';
                                        const head = `
                                          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px">
                                            <div style="text-align:right">
                                              <div style="font-size:20px;font-weight:bold">${schoolSettings?.schoolName || 'المدرسة'}</div>
                                              <div style="color:#6b7280;font-size:12px">فاتورة رسوم دراسية</div>
                                            </div>
                                            ${logo ? `<img src="${logo}" alt="Logo" style="height:60px;width:60px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
                                            <div style="text-align:left;font-family:monospace">
                                              <div style="font-size:12px;color:#6b7280">Invoice</div>
                                              <div>${String(invoiceToPrint.id).replace('inv_','')}</div>
                                            </div>
                                          </div>`;
                                        const rows = (invoiceToPrint.items || []).map(i => `<tr><td>${i.description || ''}</td><td>${Number(i.amount || 0).toFixed(2)} ${cur}</td></tr>`).join('');
                                        const totals = `
                                          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
                                            <div style="border:2px solid #111;border-radius:8px;padding:8px;background:#f9fafb"><div style="font-size:12px;color:#6b7280">الإجمالي</div><div style="font-weight:bold">${invoiceToPrint.totalAmount.toFixed(2)} ${cur}</div></div>
                                            <div style="border:2px solid #2f855a;border-radius:8px;padding:8px;background:#f0fff4"><div style="font-size:12px;color:#2f855a">المدفوع</div><div style="font-weight:bold;color:#2f855a">${(invoiceToPrint.paidAmount || 0).toFixed(2)} ${cur}</div></div>
                                            <div style="border:2px solid #c53030;border-radius:8px;padding:8px;background:#fff5f5"><div style="font-size:12px;color:#c53030">المتبقي</div><div style="font-weight:bold;color:#c53030">${remaining.toFixed(2)} ${cur}</div></div>
                                          </div>`;
                                        const html = `<!doctype html><html><head><meta charset="utf-8"><title>فاتورة</title><style>body{font-family:Tajawal,Arial,sans-serif;padding:20px;direction:rtl}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f3f4f6}</style></head><body>${head}<div style="margin-bottom:8px"><div>الطالب: ${invoiceToPrint.studentName}</div><div>تاريخ الإصدار: ${invoiceToPrint.issueDate}</div><div>تاريخ الاستحقاق: ${invoiceToPrint.dueDate}</div></div><table><thead><tr><th>البند</th><th>المبلغ</th></tr></thead><tbody>${rows}</tbody></table>${totals}<div style="margin-top:12px;color:#9ca3af;font-size:10px;text-align:center">تم توليد الفاتورة إلكترونياً عبر SchoolSaaS CRM</div></body></html>`;
                                        const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
                                        Linking.openURL(url).catch(() => {});
                                    }}><Text style={styles.actionText}>فتح للطباعة</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                                        const cur = String(schoolSettings?.defaultCurrency || 'SAR');
                                        const remaining = (invoiceToPrint.remainingAmount != null) ? invoiceToPrint.remainingAmount : (invoiceToPrint.totalAmount - (invoiceToPrint.paidAmount || 0));
                                        const lines = [
                                          `المدرسة: ${schoolSettings?.schoolName || 'المدرسة'}`,
                                          `رقم الفاتورة: ${invoiceToPrint.id}`,
                                          `الطالب: ${invoiceToPrint.studentName}`,
                                          `تاريخ الإصدار: ${invoiceToPrint.issueDate}`,
                                          `تاريخ الاستحقاق: ${invoiceToPrint.dueDate}`,
                                          `الإجمالي: ${invoiceToPrint.totalAmount.toFixed(2)} ${cur}`,
                                          `المدفوع: ${(invoiceToPrint.paidAmount || 0).toFixed(2)} ${cur}`,
                                          `المتبقي: ${remaining.toFixed(2)} ${cur}`,
                                          `تم إنشاء هذه الفاتورة إلكترونياً عبر SchoolSaaS CRM`,
                                        ];
                                        Share.share({ message: lines.join('\n') });
                                    }}><Text style={styles.actionText}>مشاركة</Text></TouchableOpacity>
                                </View>
                                <Text style={styles.footerNote}>تم إصدار هذه الفاتورة إلكترونياً عبر نظام SchoolSaaS CRM</Text>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    summaryContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    summaryItem: { alignItems: 'center' },
    summaryLabel: { color: '#6b7280', fontSize: 14 },
    summaryValue: { color: '#10b981', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
    invoiceItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    invoiceId: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    dueDate: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    amount: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    statusBadge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, marginTop: 4 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    printButton: { marginTop: 8, backgroundColor: '#0d9488', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    printButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 480 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontWeight: 'bold', fontSize: 16 },
    closeText: { fontSize: 18, color: '#6b7280' },
    brandRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
    logo: { width: 40, height: 40, resizeMode: 'contain', marginLeft: 8 },
    schoolName: { fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
    schoolMeta: { color: '#6b7280', fontSize: 12, textAlign: 'right' },
    field: { fontSize: 14, textAlign: 'right' },
    buttonsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
    actionBtn: { backgroundColor: '#0d9488', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
    actionText: { color: '#fff', fontWeight: 'bold' },
    footerNote: { color: '#9ca3af', fontSize: 10, textAlign: 'center', marginTop: 8 },
});

export default FinanceScreen;
