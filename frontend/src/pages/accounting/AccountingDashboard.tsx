import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert
} from '@mui/material';
import {
    AccountBalance as AccountBalanceIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Receipt as ReceiptIcon,
    CalendarMonth as CalendarIcon
} from '@mui/icons-material';

interface DashboardStats {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    recentEntries: any[];
    openPeriods: number;
}

const AccountingDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Fetch balance sheet for assets, liabilities, equity
            const balanceSheetResponse = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/reports/balance-sheet`,
                { headers: { 'x-auth-token': token } }
            );

            // Fetch income statement for revenue and expenses
            const incomeStatementResponse = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/reports/income-statement`,
                { headers: { 'x-auth-token': token } }
            );

            // Fetch recent journal entries
            const entriesResponse = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journal-entries`,
                {
                    headers: { 'x-auth-token': token },
                    params: { limit: 5, offset: 0 }
                }
            );

            // Fetch fiscal periods
            const periodsResponse = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/fiscal-periods`,
                { headers: { 'x-auth-token': token } }
            );

            const openPeriods = periodsResponse.data.filter((p: any) => p.status === 'OPEN').length;

            setStats({
                totalAssets: balanceSheetResponse.data.totalAssets || 0,
                totalLiabilities: balanceSheetResponse.data.totalLiabilities || 0,
                totalEquity: balanceSheetResponse.data.totalEquity || 0,
                totalRevenue: incomeStatementResponse.data.totalRevenue || 0,
                totalExpenses: incomeStatementResponse.data.totalExpenses || 0,
                netIncome: incomeStatementResponse.data.netIncome || 0,
                recentEntries: entriesResponse.data.rows || [],
                openPeriods
            });

            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل بيانات Dashboard');
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', direction: 'rtl' }}>
                <Typography>جاري التحميل...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    لوحة تحكم المحاسبة
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    نظرة عامة على الوضع المالي
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {stats && (
                <>
                    {/* Financial Summary Cards */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ backgroundColor: '#e8f5e9', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                إجمالي الأصول
                                            </Typography>
                                            <Typography variant="h4" fontWeight="bold" color="success.main">
                                                {stats.totalAssets.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                        <TrendingUpIcon sx={{ fontSize: 50, color: 'success.main', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ backgroundColor: '#ffebee', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                إجمالي الخصوم
                                            </Typography>
                                            <Typography variant="h4" fontWeight="bold" color="error.main">
                                                {stats.totalLiabilities.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                        <TrendingDownIcon sx={{ fontSize: 50, color: 'error.main', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ backgroundColor: '#e3f2fd', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                حقوق الملكية
                                            </Typography>
                                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                                {stats.totalEquity.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                        <AccountBalanceIcon sx={{ fontSize: 50, color: 'primary.main', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Revenue & Expenses */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ backgroundColor: '#fff3e0', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        إجمالي الإيرادات
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                                        {stats.totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ backgroundColor: '#f3e5f5', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        إجمالي المصروفات
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="secondary.main">
                                        {stats.totalExpenses.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ backgroundColor: stats.netIncome >= 0 ? '#e8f5e9' : '#ffebee', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {stats.netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                                    </Typography>
                                    <Typography
                                        variant="h5"
                                        fontWeight="bold"
                                        color={stats.netIncome >= 0 ? 'success.main' : 'error.main'}
                                    >
                                        {Math.abs(stats.netIncome).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Quick Stats */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <CalendarIcon color="primary" />
                                        <Typography variant="h6" fontWeight="bold">
                                            الفترات المالية المفتوحة
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" fontWeight="bold" color="primary.main">
                                        {stats.openPeriods}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <ReceiptIcon color="primary" />
                                        <Typography variant="h6" fontWeight="bold">
                                            القيود الأخيرة
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" fontWeight="bold" color="primary.main">
                                        {stats.recentEntries.length}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Recent Entries Table */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                آخر القيود اليومية
                            </Typography>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                رقم القيد
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                التاريخ
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                الوصف
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                المبلغ
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                الحالة
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats.recentEntries.map((entry: any) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{entry.entryNumber}</TableCell>
                                                <TableCell>{new Date(entry.date).toLocaleDateString('ar-EG')}</TableCell>
                                                <TableCell>{entry.description}</TableCell>
                                                <TableCell align="right">
                                                    {entry.totalDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={entry.status === 'POSTED' ? 'مرحّل' : entry.status === 'DRAFT' ? 'مسودة' : 'معكوس'}
                                                        color={entry.status === 'POSTED' ? 'success' : entry.status === 'DRAFT' ? 'warning' : 'default'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </>
            )}
        </Box>
    );
};

export default AccountingDashboard;
