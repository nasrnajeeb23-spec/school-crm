import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://school-crschool-crm-backendm.onrender.com/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/analytics`,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const analyticsAPI = {
  // Dashboard Overview
  getDashboardOverview: async (schoolId: string) => {
    const response = await api.get(`/dashboard/overview?schoolId=${schoolId}`);
    return response.data;
  },

  // AI-Powered Insights
  getAutomatedInsights: async (schoolId: string) => {
    const response = await api.get(`/insights/automated?schoolId=${schoolId}`);
    return response.data;
  },

  // At-Risk Students Prediction
  getAtRiskStudents: async (schoolId: string) => {
    const response = await api.get(`/insights/at-risk-students?schoolId=${schoolId}`);
    return response.data;
  },

  // Academic Performance Analysis
  getAcademicPerformance: async (schoolId: string, timeRange: string = 'month') => {
    const response = await api.get(`/insights/academic-performance?schoolId=${schoolId}&timeRange=${timeRange}`);
    return response.data;
  },

  // Financial Trends Analysis
  getFinancialTrends: async (schoolId: string, timeRange: string = 'year') => {
    const response = await api.get(`/insights/financial-trends?schoolId=${schoolId}&timeRange=${timeRange}`);
    return response.data;
  },

  // Teacher Performance Analysis
  getTeacherPerformance: async (schoolId: string, timeRange: string = 'quarter') => {
    const response = await api.get(`/insights/teacher-performance?schoolId=${schoolId}&timeRange=${timeRange}`);
    return response.data;
  },

  // Enrollment Predictions
  getEnrollmentPredictions: async (schoolId: string, months: number = 6) => {
    const response = await api.get(`/predictions/enrollment?schoolId=${schoolId}&months=${months}`);
    return response.data;
  },

  // System Alerts
  getSystemAlerts: async (schoolId: string, severity: string = 'all') => {
    const response = await api.get(`/alerts/system?schoolId=${schoolId}&severity=${severity}`);
    return response.data;
  },

  // Real-time Analytics
  getRealTimeAnalytics: async (schoolId: string) => {
    const response = await api.get(`/real-time?schoolId=${schoolId}`);
    return response.data;
  },

  // Report Generation
  generateReport: async (schoolId: string, reportType: string, format: string = 'pdf', dateRange?: any) => {
    const params = new URLSearchParams({
      schoolId,
      reportType,
      format,
      ...(dateRange && { dateRange: JSON.stringify(dateRange) })
    });
    
    const response = await api.get(`/reports/generate?${params.toString()}`);
    return response.data;
  },

  // Export data for external analysis
  exportData: async (schoolId: string, dataType: string, format: string = 'csv') => {
    const response = await api.post('/export', {
      schoolId,
      dataType,
      format
    });
    return response.data;
  },

  // Custom analytics queries
  runCustomQuery: async (schoolId: string, query: any) => {
    const response = await api.post('/custom-query', {
      schoolId,
      query
    });
    return response.data;
  },

  // Analytics configuration
  getAnalyticsConfig: async () => {
    const response = await api.get('/config');
    return response.data;
  },

  updateAnalyticsConfig: async (config: any) => {
    const response = await api.put('/config', config);
    return response.data;
  },

  // Data quality metrics
  getDataQuality: async (schoolId: string) => {
    const response = await api.get(`/data-quality?schoolId=${schoolId}`);
    return response.data;
  },

  // Predictive model performance
  getModelPerformance: async () => {
    const response = await api.get('/model-performance');
    return response.data;
  },

  // Historical trends
  getHistoricalTrends: async (schoolId: string, metric: string, period: string = '1year') => {
    const response = await api.get(`/historical-trends?schoolId=${schoolId}&metric=${metric}&period=${period}`);
    return response.data;
  },

  // Benchmark comparison
  getBenchmarkComparison: async (schoolId: string, benchmarkType: string = 'industry') => {
    const response = await api.get(`/benchmarks?schoolId=${schoolId}&benchmarkType=${benchmarkType}`);
    return response.data;
  },

  // Anomaly detection
  getAnomalies: async (schoolId: string, detectionType: string = 'all') => {
    const response = await api.get(`/anomalies?schoolId=${schoolId}&detectionType=${detectionType}`);
    return response.data;
  }
};

export default analyticsAPI;