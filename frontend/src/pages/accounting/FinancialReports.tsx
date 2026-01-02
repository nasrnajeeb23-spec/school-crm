import React, { useState } from 'react';
import axios from 'axios';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Grid,
    Alert,
    Divider
} from '@mui/material';
import {
    Assessment as AssessmentIcon,
    Download as DownloadIcon,
    Print as PrintIcon
} from '@mui/icons-material';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const FinancialReports: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [trialBalance, setTrialBalance] = useState<any>(null);
    const [incomeStatement, setIncomeStatement] = useState<any>(null);
    const [balanceSheet, setBalanceSheet] = useState<any>(null);

    const fetchTrialBalance = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/reports/trial-balance`,
                {
                    headers: { 'x-auth-token': token },
                    params: { startDate, endDate }
                }
            );
            setTrialBalance(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل ميزان المراجعة');
        } finally {
            setLoading(false);
        }
    };

    const fetchIncomeStatement = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/reports/income-statement`,
                {
                    headers: { 'x-auth-token': token },
                    params: { startDate, endDate }
                }
            );
            setIncomeStatement(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل قائمة الدخل');
        } finally {
            setLoading(false);
        }
    };

    const fetchBalanceSheet = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/reports/balance-sheet`,
                {
                    headers: { 'x-auth-token': token },
                    params: { asOfDate: endDate || new Date().toISOString().split('T')[0] }
                }
            );
            setBalanceSheet(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل الميزانية العمومية');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setError('');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            <Typography variant="h4" fontWeight="bold">
                                التقارير المالية
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={handlePrint}
                        >
                            طباعة
                        </Button>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="من تاريخ"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="إلى تاريخ"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={handleTabChange}>
                            <Tab label="ميزان المراجعة" />
                            <Tab label="قائمة الدخل" />
                            <Tab label="الميزانية العمومية" />
                        </Tabs>
                    </Box>

                    {/* Trial Balance */}
                    <TabPanel value={tabValue} index={0}>
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" onClick={fetchTrialBalance} disabled={loading}>
                                {loading ? 'جاري التحميل...' : 'إنشاء التقرير'}
                            </Button>
                        </Box>

                        {trialBalance && (
                            <>
                                <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 'bold' }}>
                                    ميزان المراجعة
                                </Typography>
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                                    رمز الحساب
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                                    اسم الحساب
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                                    النوع
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                                    مدين
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                                    دائن
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {trialBalance.accounts?.map((account: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>{account.code}</TableCell>
                                                    <TableCell>{account.name}</TableCell>
                                                    <TableCell>{account.type}</TableCell>
                                                    <TableCell align="right">
                                                        {account.debit > 0 ? account.debit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {account.credit > 0 ? account.credit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                <TableCell colSpan={3} sx={{ fontWeight: 'bold' }}>الإجمالي</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                    {trialBalance.totalDebit?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                    {trialBalance.totalCredit?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Box sx={{ mt: 2, p: 2, backgroundColor: trialBalance.isBalanced ? '#e8f5e9' : '#ffebee' }}>
                                    <Typography variant="h6" align="center">
                                        {trialBalance.isBalanced ? '✓ الميزان متوازن' : '✗ الميزان غير متوازن'}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </TabPanel>

                    {/* Income Statement */}
                    <TabPanel value={tabValue} index={1}>
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" onClick={fetchIncomeStatement} disabled={loading}>
                                {loading ? 'جاري التحميل...' : 'إنشاء التقرير'}
                            </Button>
                        </Box>

                        {incomeStatement && (
                            <>
                                <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 'bold' }}>
                                    قائمة الدخل
                                </Typography>

                                <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: '#ff9800' }}>
                                    الإيرادات
                                </Typography>
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableBody>
                                            {incomeStatement.revenues?.map((rev: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>{rev.code} - {rev.name}</TableCell>
                                                    <TableCell align="right">
                                                        {rev.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ backgroundColor: '#fff3e0' }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>إجمالي الإيرادات</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                    {incomeStatement.totalRevenue?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: '#9c27b0' }}>
                                    المصروفات
                                </Typography>
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableBody>
                                            {incomeStatement.expenses?.map((exp: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>{exp.code} - {exp.name}</TableCell>
                                                    <TableCell align="right">
                                                        {exp.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ backgroundColor: '#f3e5f5' }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>إجمالي المصروفات</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                    {incomeStatement.totalExpenses?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Divider sx={{ my: 3 }} />

                                <Box sx={{ p: 3, backgroundColor: incomeStatement.netIncome >= 0 ? '#e8f5e9' : '#ffebee' }}>
                                    <Typography variant="h5" align="center" sx={{ fontWeight: 'bold' }}>
                                        {incomeStatement.netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                                    </Typography>
                                    <Typography variant="h4" align="center" sx={{ mt: 1, fontWeight: 'bold' }}>
                                        {Math.abs(incomeStatement.netIncome).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </TabPanel>

                    {/* Balance Sheet */}
                    <TabPanel value={tabValue} index={2}>
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" onClick={fetchBalanceSheet} disabled={loading}>
                                {loading ? 'جاري التحميل...' : 'إنشاء التقرير'}
                            </Button>
                        </Box>

                        {balanceSheet && (
                            <>
                                <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 'bold' }}>
                                    الميزانية العمومية
                                </Typography>
                                <Typography variant="subtitle1" align="center" sx={{ mb: 3 }}>
                                    كما في: {new Date(balanceSheet.asOfDate).toLocaleDateString('ar-EG')}
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#4caf50' }}>
                                            الأصول
                                        </Typography>
                                        <TableContainer component={Paper}>
                                            <Table size="small">
                                                <TableBody>
                                                    {balanceSheet.assets?.map((asset: any, index: number) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{asset.code} - {asset.name}</TableCell>
                                                            <TableCell align="right">
                                                                {asset.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>إجمالي الأصول</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {balanceSheet.totalAssets?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#f44336' }}>
                                            الخصوم وحقوق الملكية
                                        </Typography>

                                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                                            الخصوم
                                        </Typography>
                                        <TableContainer component={Paper}>
                                            <Table size="small">
                                                <TableBody>
                                                    {balanceSheet.liabilities?.map((liability: any, index: number) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{liability.code} - {liability.name}</TableCell>
                                                            <TableCell align="right">
                                                                {liability.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow sx={{ backgroundColor: '#ffebee' }}>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>إجمالي الخصوم</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {balanceSheet.totalLiabilities?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                                            حقوق الملكية
                                        </Typography>
                                        <TableContainer component={Paper}>
                                            <Table size="small">
                                                <TableBody>
                                                    {balanceSheet.equity?.map((eq: any, index: number) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{eq.code} - {eq.name}</TableCell>
                                                            <TableCell align="right">
                                                                {eq.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>إجمالي حقوق الملكية</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {balanceSheet.totalEquity?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>إجمالي الخصوم وحقوق الملكية</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {balanceSheet.totalLiabilitiesAndEquity?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Grid>
                                </Grid>

                                <Box sx={{ mt: 3, p: 2, backgroundColor: balanceSheet.isBalanced ? '#e8f5e9' : '#ffebee' }}>
                                    <Typography variant="h6" align="center">
                                        {balanceSheet.isBalanced ? '✓ الميزانية متوازنة' : '✗ الميزانية غير متوازنة'}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </TabPanel>
                </CardContent>
            </Card>
        </Box>
    );
};

export default FinancialReports;
