import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ResponsiveChartProps {
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    data: any;
    options?: any;
    height?: number;
    className?: string;
}

const ResponsiveChart: React.FC<ResponsiveChartProps> = ({
    type,
    data,
    options = {},
    height = 300,
    className = ''
}) => {
    // Default responsive options
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    padding: 15,
                    usePointStyle: true,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14
                },
                bodyFont: {
                    size: 13
                },
                cornerRadius: 8
            }
        },
        ...options
    };

    // Mobile-specific adjustments
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        defaultOptions.plugins.legend.labels.font.size = 10;
        defaultOptions.plugins.tooltip.titleFont.size = 12;
        defaultOptions.plugins.tooltip.bodyFont.size = 11;
    }

    const ChartComponent = {
        line: Line,
        bar: Bar,
        pie: Pie,
        doughnut: Doughnut
    }[type];

    return (
        <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
            <ChartComponent data={data} options={defaultOptions} />
        </div>
    );
};

// Predefined color schemes
export const colorSchemes = {
    primary: [
        'rgba(79, 70, 229, 0.8)',   // Indigo
        'rgba(59, 130, 246, 0.8)',  // Blue
        'rgba(16, 185, 129, 0.8)',  // Green
        'rgba(245, 158, 11, 0.8)',  // Amber
        'rgba(239, 68, 68, 0.8)',   // Red
        'rgba(168, 85, 247, 0.8)',  // Purple
    ],
    gradient: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(217, 70, 239, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(251, 113, 133, 0.8)',
    ],
    pastel: [
        'rgba(165, 180, 252, 0.8)',
        'rgba(196, 181, 253, 0.8)',
        'rgba(251, 207, 232, 0.8)',
        'rgba(254, 215, 170, 0.8)',
        'rgba(167, 243, 208, 0.8)',
    ]
};

// Helper to generate chart data
export const generateChartData = (
    labels: string[],
    datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
    }>,
    colorScheme: keyof typeof colorSchemes = 'primary'
) => {
    const colors = colorSchemes[colorScheme];

    return {
        labels,
        datasets: datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || colors[index % colors.length],
            borderColor: dataset.borderColor || colors[index % colors.length].replace('0.8', '1'),
            borderWidth: 2
        }))
    };
};

export default ResponsiveChart;
