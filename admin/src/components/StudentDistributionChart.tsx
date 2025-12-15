import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { StudentsIcon } from './icons';

interface DistributionData {
  name: string;
  value: number;
}

interface StudentDistributionChartProps {
  data: DistributionData[];
}

const COLORS = ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // Don't render label for small slices

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


const StudentDistributionChart: React.FC<StudentDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full flex flex-col items-center justify-center">
             <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4">
                <StudentsIcon className="h-6 w-6 ml-2 text-teal-500" />
                توزيع الطلاب حسب الصف
            </h3>
            <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات لعرضها.</p>
        </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full">
        <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4">
            <StudentsIcon className="h-6 w-6 ml-2 text-teal-500" />
            توزيع الطلاب حسب الصف
        </h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                <Pie
                    data={data as any[]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default StudentDistributionChart;