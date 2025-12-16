import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    Collapse,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';

interface Account {
    id: number;
    code: string;
    name: string;
    nameEn: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    balance: number;
    level: number;
    isActive: boolean;
    isSystem: boolean;
    parentId: number | null;
    children?: Account[];
}

const accountTypeColors: Record<string, string> = {
    ASSET: '#4caf50',
    LIABILITY: '#f44336',
    EQUITY: '#2196f3',
    REVENUE: '#ff9800',
    EXPENSE: '#9c27b0'
};

const accountTypeLabels: Record<string, string> = {
    ASSET: 'أصول',
    LIABILITY: 'خصوم',
    EQUITY: 'حقوق ملكية',
    REVENUE: 'إيرادات',
    EXPENSE: 'مصروفات'
};

const ChartOfAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        nameEn: '',
        type: 'EXPENSE' as Account['type'],
        parentId: null as number | null,
        description: ''
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const schoolId = localStorage.getItem('schoolId');

            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/accounts/tree`,
                {
                    headers: { 'x-auth-token': token },
                    params: { schoolId }
                }
            );

            setAccounts(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل الحسابات');
            console.error('Error fetching accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (account?: Account) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                code: account.code,
                name: account.name,
                nameEn: account.nameEn || '',
                type: account.type,
                parentId: account.parentId,
                description: ''
            });
        } else {
            setEditingAccount(null);
            setFormData({
                code: '',
                name: '',
                nameEn: '',
                type: 'EXPENSE',
                parentId: null,
                description: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingAccount(null);
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            const schoolId = localStorage.getItem('schoolId');

            if (editingAccount) {
                // Update
                await axios.put(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/accounts/${editingAccount.id}`,
                    formData,
                    { headers: { 'x-auth-token': token } }
                );
            } else {
                // Create
                await axios.post(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/accounts`,
                    { ...formData, schoolId },
                    { headers: { 'x-auth-token': token } }
                );
            }

            handleCloseDialog();
            fetchAccounts();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في حفظ الحساب');
        }
    };

    const handleDelete = async (accountId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/accounts/${accountId}`,
                { headers: { 'x-auth-token': token } }
            );
            fetchAccounts();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في حذف الحساب');
        }
    };

    const toggleExpand = (accountId: number) => {
        const newExpanded = new Set(expandedAccounts);
        if (newExpanded.has(accountId)) {
            newExpanded.delete(accountId);
        } else {
            newExpanded.add(accountId);
        }
        setExpandedAccounts(newExpanded);
    };

    const renderAccountRow = (account: Account, depth: number = 0) => {
        const hasChildren = account.children && account.children.length > 0;
        const isExpanded = expandedAccounts.has(account.id);

        return (
            <React.Fragment key={account.id}>
                <TableRow
                    sx={{
                        backgroundColor: depth === 0 ? '#f5f5f5' : depth === 1 ? '#fafafa' : 'white',
                        '&:hover': { backgroundColor: '#e3f2fd' }
                    }}
                >
                    <TableCell sx={{ paddingLeft: `${depth * 40 + 16}px` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {hasChildren && (
                                <IconButton size="small" onClick={() => toggleExpand(account.id)}>
                                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                            )}
                            {!hasChildren && <Box sx={{ width: 40 }} />}
                            <Typography variant="body2" fontWeight={depth === 0 ? 'bold' : 'normal'}>
                                {account.code}
                            </Typography>
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Typography variant="body2" fontWeight={depth === 0 ? 'bold' : 'normal'}>
                            {account.name}
                        </Typography>
                    </TableCell>
                    <TableCell>
                        <Chip
                            label={accountTypeLabels[account.type]}
                            size="small"
                            sx={{
                                backgroundColor: accountTypeColors[account.type],
                                color: 'white',
                                fontWeight: 'bold'
                            }}
                        />
                    </TableCell>
                    <TableCell align="right">
                        <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={account.balance >= 0 ? 'success.main' : 'error.main'}
                        >
                            {account.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                        </Typography>
                    </TableCell>
                    <TableCell>
                        <Chip
                            label={account.isActive ? 'نشط' : 'غير نشط'}
                            size="small"
                            color={account.isActive ? 'success' : 'default'}
                        />
                    </TableCell>
                    <TableCell align="center">
                        {!account.isSystem && (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Tooltip title="تعديل">
                                    <IconButton size="small" onClick={() => handleOpenDialog(account)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="حذف">
                                    <IconButton size="small" color="error" onClick={() => handleDelete(account.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </TableCell>
                </TableRow>

                {hasChildren && isExpanded && account.children!.map(child =>
                    renderAccountRow(child, depth + 1)
                )}
            </React.Fragment>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Typography>جاري التحميل...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            <Typography variant="h4" fontWeight="bold">
                                شجرة الحسابات
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ fontWeight: 'bold' }}
                        >
                            إضافة حساب جديد
                        </Button>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                        <Table stickyHeader>
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
                                        الرصيد
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        الحالة
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        الإجراءات
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accounts.map(account => renderAccountRow(account))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Dialog for Add/Edit */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ direction: 'rtl' }}>
                    {editingAccount ? 'تعديل حساب' : 'إضافة حساب جديد'}
                </DialogTitle>
                <DialogContent sx={{ direction: 'rtl' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="رمز الحساب"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            fullWidth
                            required
                            disabled={!!editingAccount}
                        />
                        <TextField
                            label="اسم الحساب (عربي)"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />
                        <TextField
                            label="اسم الحساب (إنجليزي)"
                            value={formData.nameEn}
                            onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            select
                            label="نوع الحساب"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                            fullWidth
                            required
                            disabled={!!editingAccount}
                        >
                            <MenuItem value="ASSET">أصول</MenuItem>
                            <MenuItem value="LIABILITY">خصوم</MenuItem>
                            <MenuItem value="EQUITY">حقوق ملكية</MenuItem>
                            <MenuItem value="REVENUE">إيرادات</MenuItem>
                            <MenuItem value="EXPENSE">مصروفات</MenuItem>
                        </TextField>
                        <TextField
                            label="وصف"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ direction: 'rtl', p: 2 }}>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editingAccount ? 'تحديث' : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ChartOfAccounts;
