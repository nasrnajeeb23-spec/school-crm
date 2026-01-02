import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Target, 
  Brain,
  Shield,
  Globe,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Award,
  Settings,
  Download,
  RefreshCw,
  Filter,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyticsAPI } from '@/services/analyticsAPI';
import { enterpriseAPI } from '@/services/enterpriseAPI';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EnterpriseMetrics {
  totalStudents: number;
  totalTeachers: number;
  attendanceRate: number;
  averageGrade: number;
  financialHealth: number;
  operationalEfficiency: number;
  studentGrowth: number;
  academicImprovement: number;
  financialStability: number;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'warning' | 'opportunity' | 'info';
  category: string;
  recommendation?: string;
  confidence: number;
  timestamp: string;
}

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  acknowledged: boolean;
  timestamp: string;
}

export default function EnterpriseDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<EnterpriseMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [enterpriseStatus, setEnterpriseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const schoolId = user?.schoolId || '1';

  useEffect(() => {
    loadDashboardData();
  }, [schoolId, selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard overview
      const overviewResponse = await analyticsAPI.getDashboardOverview(schoolId);
      setMetrics(overviewResponse.data.overview);

      // Load AI insights
      const insightsResponse = await analyticsAPI.getAutomatedInsights(schoolId);
      setInsights(insightsResponse.data.insights);

      // Load system alerts
      const alertsResponse = await analyticsAPI.getSystemAlerts(schoolId);
      setAlerts(alertsResponse.data.alerts);

      // Load enterprise status
      const statusResponse = await enterpriseAPI.getEnterpriseStatus();
      setEnterpriseStatus(statusResponse.data);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success(t('dashboard.refreshed'));
  };

  const handleExportReport = async (type: string) => {
    try {
      const response = await analyticsAPI.generateReport(schoolId, type, 'pdf', {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });
      
      // Download the report
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
        toast.success(t('dashboard.reportGenerated'));
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(t('dashboard.reportError'));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      case 'opportunity': return 'success';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('enterprise.dashboard')}</h1>
          <p className="text-gray-600">{t('enterprise.welcomeMessage')}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport('operational')}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard.exportReport')}
          </Button>
        </div>
      </div>

      {/* Enterprise Features Status */}
      {enterpriseStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-500" />
              {t('enterprise.featuresStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Shield className={`h-8 w-8 mx-auto mb-2 ${enterpriseStatus.saml.configured ? 'text-green-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">{t('enterprise.samlAuth')}</p>
                <Badge variant={enterpriseStatus.saml.configured ? 'success' : 'secondary'}>
                  {enterpriseStatus.saml.configured ? t('common.enabled') : t('common.disabled')}
                </Badge>
              </div>
              <div className="text-center">
                <Settings className={`h-8 w-8 mx-auto mb-2 ${enterpriseStatus.mfa.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">{t('enterprise.mfa')}</p>
                <Badge variant={enterpriseStatus.mfa.enabled ? 'success' : 'secondary'}>
                  {enterpriseStatus.mfa.enabled ? t('common.enabled') : t('common.disabled')}
                </Badge>
              </div>
              <div className="text-center">
                <Globe className={`h-8 w-8 mx-auto mb-2 ${enterpriseStatus.oauth.google.connected || enterpriseStatus.oauth.microsoft.connected ? 'text-green-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">{t('enterprise.integrations')}</p>
                <Badge variant={(enterpriseStatus.oauth.google.connected || enterpriseStatus.oauth.microsoft.connected) ? 'success' : 'secondary'}>
                  {(enterpriseStatus.oauth.google.connected || enterpriseStatus.oauth.microsoft.connected) ? t('common.connected') : t('common.disconnected')}
                </Badge>
              </div>
              <div className="text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">{t('enterprise.aiAnalytics')}</p>
                <Badge variant="success">{t('common.active')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.totalStudents')}</p>
                <p className="text-2xl font-bold">{metrics?.totalStudents || 0}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{metrics?.studentGrowth || 0}%
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.attendanceRate')}</p>
                <p className="text-2xl font-bold">{metrics?.attendanceRate || 0}%</p>
                <Progress value={metrics?.attendanceRate || 0} className="mt-2" />
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.averageGrade')}</p>
                <p className="text-2xl font-bold">{metrics?.averageGrade || 0}/100</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{metrics?.academicImprovement || 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.financialHealth')}</p>
                <p className="text-2xl font-bold">{metrics?.financialHealth || 0}/100</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{metrics?.financialStability || 0}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">{t('dashboard.aiInsights')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('dashboard.systemAlerts')}</TabsTrigger>
          <TabsTrigger value="performance">{t('dashboard.performance')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboard.advancedAnalytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('dashboard.aiPoweredInsights')}</h3>
            <div className="flex space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">{t('common.all')}</option>
                <option value="academic">{t('common.academic')}</option>
                <option value="financial">{t('common.financial')}</option>
                <option value="operational">{t('common.operational')}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={getPriorityColor(insight.priority)}>
                          {t(`priority.${insight.priority}`)}
                        </Badge>
                        <span className="text-sm text-gray-500">{insight.category}</span>
                      </div>
                      <h4 className="font-semibold mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      {insight.recommendation && (
                        <Alert className="mt-2">
                          <AlertDescription>{insight.recommendation}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {new Date(insight.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {t('common.confidence')}: {Math.round(insight.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('dashboard.systemAlerts')}</h3>
            <Badge variant="outline">{alerts.length} {t('common.active')}</Badge>
          </div>

          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{alert.title}</h4>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {t(`severity.${alert.severity}`)}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.operationalPerformance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('dashboard.operationalEfficiency')}</span>
                    <span>{metrics?.operationalEfficiency || 0}%</span>
                  </div>
                  <Progress value={metrics?.operationalEfficiency || 0} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{metrics?.totalTeachers || 0}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.totalTeachers')}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{metrics?.studentGrowth || 0}%</p>
                    <p className="text-sm text-gray-600">{t('dashboard.studentGrowth')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  {t('dashboard.atRiskStudents')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {/* Navigate to detailed analytics */}}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t('dashboard.viewDetails')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-purple-500" />
                  {t('dashboard.enrollmentPredictions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {/* Navigate to enrollment predictions */}}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('dashboard.viewPredictions')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}