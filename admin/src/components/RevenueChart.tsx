import React from 'react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, CartesianGrid } from 'recharts';
import { RevenueData } from '../types';

interface RevenueChartProps {
  data: RevenueData[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-96">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">نمو الإيرادات الشهرية</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 20, bottom: 30 }}>
            <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
            </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="month" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} tickLine={{ stroke: '#4b5563' }} />
          <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} tickLine={{ stroke: '#4b5563' }} />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                borderColor: '#4b5563',
                borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
