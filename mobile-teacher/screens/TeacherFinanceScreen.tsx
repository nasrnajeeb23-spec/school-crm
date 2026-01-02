import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import * as api from '../api';
import { User, TeacherSalarySlip, SalaryComponent } from '../types';
import { FinanceIcon } from '../components/icons';

interface TeacherFinanceScreenProps {
    user: User;
}

const symbolFor = (code?: string) => {
    const c = String(code || '').trim().toUpperCase();
    if (c === 'USD') return '$';
    if (c === 'SAR') return 'ر.س';
    if (c === 'EGP') return 'ج.م';
    if (c === 'YER') return 'ر.ي';
    return c || '$';
};

const SalaryDetailRow: React.FC<{ item: SalaryComponent; formatCurrency: (amount: number) => string }> = ({ item, formatCurrency }) => {
    const isBonus = item.type === 'bonus';
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailText}>{item.description}</Text>
            <Text style={[styles.detailAmount, isBonus ? styles.bonusText : styles.deductionText]}>
                {isBonus ? '+' : '-'} {formatCurrency(item.amount)}
            </Text>
        </View>
    );
};


const TeacherFinanceScreen: React.FC<TeacherFinanceScreenProps> = ({ user }) => {
    const [slips, setSlips] = useState<TeacherSalarySlip[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSlipId, setExpandedSlipId] = useState<string | null>(null);
    const [currencyCode, setCurrencyCode] = useState<string>('SAR');
    const formatCurrency = (amount: number) => {
        const sym = symbolFor(currencyCode);
        const decimals = String(currencyCode).toUpperCase() === 'YER' ? 0 : 2;
        return `${sym} ${Number(amount || 0).toFixed(decimals)}`;
    };

    useEffect(() => {
        if (!user.teacherId) {
            setLoading(false);
            return;
        }
        if (user.schoolId) {
            api.getSchoolSettings(user.schoolId).then(s => {
                setCurrencyCode(String(s.defaultCurrency || 'SAR').toUpperCase());
            }).catch(() => {});
        }
        api.getTeacherSalarySlips(user.teacherId)
            .then(setSlips)
            .catch(err => console.error("Failed to fetch salary slips:", err))
            .finally(() => setLoading(false));
    }, [user.teacherId]);

    const latestSlip = slips.length > 0 ? slips[0] : null;

    const renderSlipItem = ({ item }: { item: TeacherSalarySlip }) => {
        const isExpanded = expandedSlipId === item.id;
        return (
            <TouchableOpacity 
                style={styles.slipCard}
                onPress={() => setExpandedSlipId(isExpanded ? null : item.id)}
            >
                <View style={styles.slipHeader}>
                    <Text style={styles.slipMonth}>{item.month} {item.year}</Text>
                    <View style={styles.slipStatus}>
                        <Text style={styles.slipNetSalary}>{formatCurrency(item.netSalary)}</Text>
                         <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{item.status === 'Paid' ? 'مدفوعة' : 'قيد الانتظار'}</Text>
                        </View>
                    </View>
                </View>
                {isExpanded && (
                    <View style={styles.slipDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailText}>الراتب الإجمالي</Text>
                            <Text style={styles.detailAmount}>{formatCurrency(item.grossSalary)}</Text>
                        </View>
                        {item.bonuses.map((bonus, index) => <SalaryDetailRow key={`bonus-${index}`} item={bonus} formatCurrency={formatCurrency} />)}
                        {item.deductions.map((ded, index) => <SalaryDetailRow key={`ded-${index}`} item={ded} formatCurrency={formatCurrency} />)}
                         <View style={[styles.detailRow, styles.netRow]}>
                            <Text style={styles.netText}>صافي الراتب</Text>
                            <Text style={styles.netAmount}>{formatCurrency(item.netSalary)}</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>صافي الراتب (آخر شهر)</Text>
                    <Text style={styles.summaryValue}>{latestSlip ? formatCurrency(latestSlip.netSalary) : 'N/A'}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>الراتب الإجمالي</Text>
                    <Text style={styles.summaryValue}>{latestSlip ? formatCurrency(latestSlip.grossSalary) : 'N/A'}</Text>
                </View>
            </View>
            
             <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>سجل الرواتب</Text>
            </View>

            {slips.length > 0 ? (
                <FlatList
                    data={slips}
                    renderItem={renderSlipItem}
                    keyExtractor={item => item.id}
                    scrollEnabled={false} // Parent ScrollView handles scrolling
                />
            ) : (
                <View style={styles.center}><Text>لا توجد بيانات مالية لعرضها.</Text></View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    summaryContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        padding: 16,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '48%',
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginTop: 8,
    },
    listHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    listHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'right',
    },
    slipCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    slipHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    slipMonth: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e3a8a',
    },
    slipStatus: {
        alignItems: 'flex-start',
    },
    slipNetSalary: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    statusBadge: {
        backgroundColor: '#dcfce7',
        borderRadius: 12,
        paddingVertical: 2,
        paddingHorizontal: 8,
        marginTop: 4,
    },
    statusText: {
        color: '#166534',
        fontSize: 12,
        fontWeight: 'bold',
    },
    slipDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        marginTop: 12,
        paddingTop: 12,
    },
    detailRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    detailText: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    bonusText: {
        color: '#16a34a', // Green
    },
    deductionText: {
        color: '#dc2626', // Red
    },
    netRow: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        marginTop: 8,
        paddingTop: 8,
    },
    netText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    netAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e3a8a',
    },
});

export default TeacherFinanceScreen;
