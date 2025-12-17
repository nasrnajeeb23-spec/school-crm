import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { TeacherSalarySlip, SalaryComponent } from '../types';
import StatsCard from '../components/StatsCard';
import { FinanceIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { getCurrencySymbol, formatCurrency } from '../currency-config';

const symbolForCurrency = (cur: string) => getCurrencySymbol(cur);

const SalaryDetailRow: React.FC<{ item: SalaryComponent }> = ({ item }) => {
    const isBonus = item.type === 'bonus';
    const { currentUser } = useAppContext();
    const [currencyCode, setCurrencyCode] = useState<string>('SAR');
    useEffect(() => {
        const sid = currentUser?.schoolId;
        if (sid) {
            api.getSchoolSettings(sid).then(s => setCurrencyCode(String(s.defaultCurrency || 'SAR').toUpperCase())).catch(() => {});
        }
    }, [currentUser?.schoolId]);
    const fmt = (amount: number) => formatCurrency(amount, currencyCode);
    return (
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
            <p className={`font-semibold ${isBonus ? 'text-green-500' : 'text-red-500'}`}>
                {isBonus ? '+' : '-'} {fmt(item.amount)}
            </p>
        </div>
    );
};

const TeacherFinance: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [slips, setSlips] = useState<TeacherSalarySlip[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSlipId, setExpandedSlipId] = useState<string | null>(null);
    const [currencyCode, setCurrencyCode] = useState<string>('SAR');

    useEffect(() => {
        if (!user?.teacherId) {
            setLoading(false);
            return;
        }
        if (user?.schoolId) {
            api.getSchoolSettings(user.schoolId).then(s => setCurrencyCode(String(s.defaultCurrency || 'SAR').toUpperCase())).catch(() => {});
        }
        api.getTeacherSalarySlips(user.teacherId)
            .then(data => {
                setSlips(data);
                if (data.length > 0) {
                    setExpandedSlipId(data[0].id); // Expand the latest slip by default
                }
            })
            .catch(err => console.error("Failed to fetch salary slips:", err))
            .finally(() => setLoading(false));
    }, [user?.teacherId]);

    const latestSlip = slips.length > 0 ? slips[0] : null;

    if (loading) {
        return <div className="text-center p-8">جاري تحميل البيانات المالية...</div>;
    }

    if (slips.length === 0) {
        return <div className="text-center p-8">لا توجد بيانات مالية لعرضها.</div>;
    }

    return (
        <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard 
                    icon={FinanceIcon}
                    title="صافي الراتب (آخر شهر)"
                    value={latestSlip ? fmt(Number(latestSlip.netSalary || 0)) : 'N/A'}
                    description={`لشهر ${latestSlip?.month} ${latestSlip?.year}`}
                />
                <StatsCard 
                    icon={FinanceIcon}
                    title="الراتب الإجمالي"
                    value={latestSlip ? fmt(Number(latestSlip.grossSalary || 0)) : 'N/A'}
                    description="قبل الخصومات والعلاوات"
                />
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">سجل الرواتب</h3>
                <div className="space-y-3">
                    {slips.map(slip => {
                        const isExpanded = expandedSlipId === slip.id;
                        return (
                            <div key={slip.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                <button 
                                    onClick={() => setExpandedSlipId(isExpanded ? null : slip.id)}
                                    className="w-full flex justify-between items-center p-4 text-right"
                                >
                                    <span className="font-bold text-lg text-teal-600 dark:text-teal-400">{slip.month} {slip.year}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-gray-800 dark:text-white">{fmt(Number(slip.netSalary || 0))}</span>
                                        <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`}>
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                        </span>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="space-y-2 mt-4">
                                            <div className="flex justify-between py-2">
                                                <p className="text-gray-600 dark:text-gray-400">الراتب الإجمالي</p>
                                                <p className="font-semibold dark:text-white">{fmt(Number(slip.grossSalary || 0))}</p>
                                            </div>
                                            {slip.bonuses.map((bonus, i) => <SalaryDetailRow key={`b-${i}`} item={bonus}/>)}
                                            {slip.deductions.map((ded, i) => <SalaryDetailRow key={`d-${i}`} item={ded}/>)}
                                            <div className="flex justify-between pt-3 mt-2 border-t-2 border-gray-200 dark:border-gray-600">
                                                <p className="font-bold text-lg text-gray-800 dark:text-white">صافي الراتب</p>
                                                <p className="font-bold text-lg text-teal-600 dark:text-teal-400">{fmt(Number(slip.netSalary || 0))}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default TeacherFinance;
