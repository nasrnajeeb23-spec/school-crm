import React from 'react';
import StatsCard from '../../components/StatsCard';
import { RevenueIcon, ExpenseIcon, NetProfitIcon } from '../../components/icons';

interface FinanceOverviewProps {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    currency?: string;
}

const FinanceOverview: React.FC<FinanceOverviewProps> = ({
    totalRevenue,
    totalExpenses,
    netProfit,
    currency = 'USD'
}) => {
    const formatAmount = (amount: number) => {
        return `${currency} ${amount.toLocaleString()}`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
                icon={RevenueIcon}
                title="إجمالي الإيرادات"
                value={formatAmount(totalRevenue)}
                description="مجموع الفواتير المدفوعة"
            />
            <StatsCard
                icon={ExpenseIcon}
                title="إجمالي المصروفات"
                value={formatAmount(totalExpenses)}
                description="مجموع النفقات المسجلة"
            />
            <StatsCard
                icon={NetProfitIcon}
                title="صافي الربح"
                value={formatAmount(netProfit)}
                description="الإيرادات - المصروفات"
            />
        </div>
    );
};

export default FinanceOverview;
