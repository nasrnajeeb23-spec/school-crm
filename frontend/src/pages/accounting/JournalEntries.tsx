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
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Alert,
    MenuItem,
    Grid,
    Divider,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Visibility as VisibilityIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Receipt as ReceiptIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface JournalEntryLine {
    accountId: number;
    debit: number;
    credit: number;
    description: string;
}

interface JournalEntry {
    id: number;
    entryNumber: string;
    date: string;
    description: string;
    status: 'DRAFT' | 'POSTED' | 'REVERSED';
    totalDebit: number;
    totalCredit: number;
    referenceType: string;
    JournalEntryLines?: any[];
}

interface Account {
    id: number;
    code: string;
    name: string;
    type: string;
}

const JournalEntries: React.FC = () => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        lines: [
            { accountId: 0, debit: 0, credit: 0, description: '' },
            { accountId: 0, debit: 0, credit: 0, description: '' }
        ] as JournalEntryLine[]
    });

    useEffect(() => {
        fetchEntries();
        fetchAccounts();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journal-entries`,
                {
                    headers: { 'x-auth-token': token },
                    params: { limit: 100, offset: 0 }
                }
            );

            setEntries(response.data.rows || []);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل القيود');
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/accounts`,
                { headers: { 'x-auth-token': token } }
            );
            setAccounts(response.data);
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    };

    const handleAddLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { accountId: 0, debit: 0, credit: 0, description: '' }]
        });
    };

    const handleRemoveLine = (index: number) => {
        if (formData.lines.length <= 2) {
            setError('يجب أن يحتوي القيد على سطرين على الأقل');
            return;
        }
        const newLines = formData.lines.filter((_, i) => i !== index);
        setFormData({ ...formData, lines: newLines });
    };

    const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
        const newLines = [...formData.lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setFormData({ ...formData, lines: newLines });
    };

    const calculateTotals = () => {
        const totalDebit = formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.debit)) || 0), 0);
        const totalCredit = formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.credit)) || 0), 0);
        return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
    };

    const handleSubmit = async () => {
        try {
            const { isBalanced } = calculateTotals();
            if (!isBalanced) {
                setError('القيد غير متوازن! يجب أن يكون مجموع المدين = مجموع الدائن');
                return;
            }

            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journal-entries`,
                formData,
                { headers: { 'x-auth-token': token } }
            );

            setOpenDialog(false);
            fetchEntries();
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                lines: [
                    { accountId: 0, debit: 0, credit: 0, description: '' },
                    { accountId: 0, debit: 0, credit: 0, description: '' }
                ]
            });
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في حفظ القيد');
        }
    };

    const handlePost = async (entryId: number) => {
        if (!window.confirm('هل أنت متأكد من ترحيل هذا القيد؟ لن يمكن تعديله بعد الترحيل.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journal-entries/${entryId}/post`,
                {},
                { headers: { 'x-auth-token': token } }
            );
            fetchEntries();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في ترحيل القيد');
        }
    };

    const handleDelete = async (entryId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا القيد؟')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journal-entries/${entryId}`,
                { headers: { 'x-auth-token': token } }
            );
            fetchEntries();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في حذف القيد');
        }
    };

    const handleViewEntry = async (entryId: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/journal-entries/${entryId}`,
                { headers: { 'x-auth-token': token } }
            );
            setSelectedEntry(response.data);
            setOpenViewDialog(true);
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل تفاصيل القيد');
        }
    };

    const statusColors = {
        DRAFT: 'warning',
        POSTED: 'success',
        REVERSED: 'error'
    } as const;

    const statusLabels = {
        DRAFT: 'مسودة',
        POSTED: 'مرحّل',
        REVERSED: 'معكوس'
    };

    const { totalDebit, totalCredit, isBalanced } = calculateTotals();

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: 3, direction: 'rtl' }}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                                <Typography variant="h4" fontWeight="bold">
                                    القيود اليومية
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ fontWeight: 'bold' }}
                            >
                                إضافة قيد يدوي
                            </Button>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                            رقم القيد
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                            التاريخ
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                            الوصف
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                            النوع
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                            المدين
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                            الدائن
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
                                    {entries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{entry.entryNumber}</TableCell>
                                            <TableCell>{new Date(entry.date).toLocaleDateString('ar-EG')}</TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell>
                                                <Chip label={entry.referenceType} size="small" />
                                            </TableCell>
                                            <TableCell align="right">
                                                {entry.totalDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell align="right">
                                                {entry.totalCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={statusLabels[entry.status]}
                                                    color={statusColors[entry.status]}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                    <Tooltip title="عرض">
                                                        <IconButton size="small" onClick={() => handleViewEntry(entry.id)}>
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {entry.status === 'DRAFT' && (
                                                        <>
                                                            <Tooltip title="ترحيل">
                                                                <IconButton size="small" color="success" onClick={() => handlePost(entry.id)}>
                                                                    <CheckCircleIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="حذف">
                                                                <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)}>
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                {/* Create Dialog */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ direction: 'rtl' }}>إضافة قيد يومي جديد</DialogTitle>
                    <DialogContent sx={{ direction: 'rtl' }}>
                        <Box sx={{ mt: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="التاريخ"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="الوصف"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        fullWidth
                                        multiline
                                        rows={2}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" sx={{ mb: 2 }}>أسطر القيد</Typography>

                            {formData.lines.map((line, index) => (
                                <Card key={index} sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                select
                                                label="الحساب"
                                                value={line.accountId}
                                                onChange={(e) => handleLineChange(index, 'accountId', parseInt(e.target.value))}
                                                fullWidth
                                                size="small"
                                            >
                                                {accounts.map((acc) => (
                                                    <MenuItem key={acc.id} value={acc.id}>
                                                        {acc.code} - {acc.name}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={6} md={2}>
                                            <TextField
                                                label="مدين"
                                                type="number"
                                                value={line.debit}
                                                onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                                                fullWidth
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={2}>
                                            <TextField
                                                label="دائن"
                                                type="number"
                                                value={line.credit}
                                                onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                                                fullWidth
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={10} md={3}>
                                            <TextField
                                                label="البيان"
                                                value={line.description}
                                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                                fullWidth
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={2} md={1}>
                                            <IconButton color="error" onClick={() => handleRemoveLine(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                </Card>
                            ))}

                            <Button variant="outlined" onClick={handleAddLine} sx={{ mb: 2 }}>
                                إضافة سطر
                            </Button>

                            <Box sx={{ mt: 2, p: 2, backgroundColor: isBalanced ? '#e8f5e9' : '#ffebee', borderRadius: 1 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                        <Typography variant="body2">إجمالي المدين: <strong>{totalDebit.toFixed(2)}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="body2">إجمالي الدائن: <strong>{totalCredit.toFixed(2)}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Chip
                                            label={isBalanced ? 'متوازن ✓' : 'غير متوازن ✗'}
                                            color={isBalanced ? 'success' : 'error'}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ direction: 'rtl', p: 2 }}>
                        <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
                        <Button variant="contained" onClick={handleSubmit} disabled={!isBalanced}>
                            حفظ القيد
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* View Dialog */}
                <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ direction: 'rtl' }}>تفاصيل القيد</DialogTitle>
                    <DialogContent sx={{ direction: 'rtl' }}>
                        {selectedEntry && (
                            <Box sx={{ mt: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography><strong>رقم القيد:</strong> {selectedEntry.entryNumber}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography><strong>التاريخ:</strong> {new Date(selectedEntry.date).toLocaleDateString('ar-EG')}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography><strong>الوصف:</strong> {selectedEntry.description}</Typography>
                                    </Grid>
                                </Grid>

                                <TableContainer component={Paper} sx={{ mt: 3 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>الحساب</TableCell>
                                                <TableCell align="right">مدين</TableCell>
                                                <TableCell align="right">دائن</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedEntry.JournalEntryLines?.map((line: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>{line.Account?.code} - {line.Account?.name}</TableCell>
                                                    <TableCell align="right">{parseFloat(line.debit).toFixed(2)}</TableCell>
                                                    <TableCell align="right">{parseFloat(line.credit).toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ direction: 'rtl' }}>
                        <Button onClick={() => setOpenViewDialog(false)}>إغلاق</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
};

export default JournalEntries;
