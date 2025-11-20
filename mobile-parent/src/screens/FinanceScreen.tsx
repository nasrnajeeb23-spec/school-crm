import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
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

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId)
            .then(data => setInvoices(data.invoices))
            .finally(() => setLoading(false));
    }, [user.parentId]);

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
});

export default FinanceScreen;
