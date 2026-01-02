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
    Alert,
    IconButton,
    Tooltip,
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
    CalendarMonth as CalendarIcon
} from '@mui/icons-material';

interface FiscalPeriod {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: 'OPEN' | 'CLOSED';
    closedAt?: string;
    description?: string;
}

const FiscalPeriods: React.FC = () => {
    const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        description: ''
    });

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/fiscal-periods`,
                { headers: { 'x-auth-token': token } }
            );

            setPeriods(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في تحميل الفترات المالية');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/fiscal-periods`,
                formData,
                { headers: { 'x-auth-token': token } }
            );

            setOpenDialog(false);
            fetchPeriods();
            setFormData({ name: '', startDate: '', endDate: '', description: '' });
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في حفظ الفترة المالية');
        }
    };

    const handleClose = async (periodId: number) => {
        if (!window.confirm('هل أنت متأكد من إغلاق هذه الفترة المالية؟ لن يمكن التعديل عليها بعد الإغلاق.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/fiscal-periods/${periodId}/close`,
                {},
                { headers: { 'x-auth-token': token } }
            );
            fetchPeriods();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في إغلاق الفترة المالية');
        }
    };

    const handleReopen = async (periodId: number) => {
        if (!window.confirm('هل أنت متأكد من إعادة فتح هذه الفترة المالية؟ (متاح للمدير العام فقط)')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/accounting/fiscal-periods/${periodId}/reopen`,
                {},
                { headers: { 'x-auth-token': token } }
            );
            fetchPeriods();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'فشل في إعادة فتح الفترة المالية');
        }
    };

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CalendarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            <Typography variant="h4" fontWeight="bold">
                                الفترات المالية
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                            sx={{ fontWeight: 'bold' }}
                        >
                            إضافة فترة مالية
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
                                        اسم الفترة
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        تاريخ البداية
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        تاريخ النهاية
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        الحالة
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        تاريخ الإغلاق
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                                        الإجراءات
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {periods.map((period) => (
                                    <TableRow key={period.id}>
                                        <TableCell>
                                            <Typography fontWeight="bold">{period.name}</Typography>
                                            {period.description && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {period.description}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{new Date(period.startDate).toLocaleDateString('ar-EG')}</TableCell>
                                        <TableCell>{new Date(period.endDate).toLocaleDateString('ar-EG')}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={period.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                                                color={period.status === 'OPEN' ? 'success' : 'default'}
                                                icon={period.status === 'OPEN' ? <LockOpenIcon /> : <LockIcon />}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {period.closedAt ? new Date(period.closedAt).toLocaleDateString('ar-EG') : '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            {period.status === 'OPEN' ? (
                                                <Tooltip title="إغلاق الفترة">
                                                    <IconButton color="error" onClick={() => handleClose(period.id)}>
                                                        <LockIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="إعادة فتح (مدير عام فقط)">
                                                    <IconButton color="success" onClick={() => handleReopen(period.id)}>
                                                        <LockOpenIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ direction: 'rtl' }}>إضافة فترة مالية جديدة</DialogTitle>
                <DialogContent sx={{ direction: 'rtl' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="اسم الفترة"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                            placeholder="مثال: السنة المالية 2024"
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="تاريخ البداية"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="تاريخ النهاية"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
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
                    <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        إضافة
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default FiscalPeriods;
