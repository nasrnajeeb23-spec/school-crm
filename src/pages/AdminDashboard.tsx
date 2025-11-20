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
  Eye,
  School,
  BookOpen,
  Bus,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLanguage, setSelectedLanguage] = useState('ar');

  // تحديث الوقت كل ثانية
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // بيانات وهمية للعرض
  const dashboardData = {
    students: {
      total: 1250,
      active: 1180,
      inactive: 70,
      newThisMonth: 45,
      growth: 3.8
    },
    teachers: {
      total: 85,
      active: 82,
      absent: 3,
      newThisMonth: 5,
      satisfaction: 4.7
    },
    finance: {
      totalRevenue: 245000,
      monthlyRevenue: 45000,
      expenses: 38000,
      profit: 7000,
      growth: 12.5
    },
    attendance: {
      studentRate: 94.5,
      teacherRate: 96.2,
      lateArrivals: 23,
      earlyDepartures: 8
    },
    academics: {
      averageGrade: 3.2,
      topStudents: 125,
      atRiskStudents: 45,
      completionRate: 87.3
    },
    transportation: {
      buses: 12,
      routes: 8,
      studentsTransported: 340,
      onTimePerformance: 92.5
    }
  };

  const recentActivities = [
    { id: 1, type: 'student', message: 'تم تسجيل 5 طلاب جدد', time: 'منذ 10 دقائق', icon: Users },
    { id: 2, type: 'finance', message: 'تم استلام دفعة شهرية بقيمة 45,000 ريال', time: 'منذ 30 دقيقة', icon: DollarSign },
    { id: 3, type: 'attendance', message: 'نسبة الحضور اليوم: 94.5%', time: 'منذ ساعة', icon: CheckCircle },
    { id: 4, type: 'alert', message: '3 طلاب متغيبون عن الحافلة رقم 5', time: 'منذ ساعتين', icon: AlertTriangle }
  ];

  const handleExport = (type: string) => {
    toast.success(`تم تصدير ${type} بنجاح`);
  };

  const handleRefresh = () => {
    toast.success('تم تحديث البيانات');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <School className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('school_management_system')}</h1>
                <p className="text-sm text-gray-500">{t('admin_dashboard')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {currentTime.toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-sm font-mono text-blue-600">
                {currentTime.toLocaleTimeString('ar-SA')}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{t('welcome')}</span>
                <span className="text-sm font-medium text-blue-600">{user?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_students')}</CardTitle>
              <Users className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.students.total.toLocaleString()}</div>
              <div className="flex items-center space-x-1 text-xs text-blue-100">
                <TrendingUp className="h-3 w-3" />
                <span>+{dashboardData.students.growth}% هذا الشهر</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_teachers')}</CardTitle>
              <BookOpen className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.teachers.total}</div>
              <div className="flex items-center space-x-1 text-xs text-green-100">
                <CheckCircle className="h-3 w-3" />
                <span>{dashboardData.teachers.active} نشط</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('monthly_revenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.finance.monthlyRevenue.toLocaleString()} ريال</div>
              <div className="flex items-center space-x-1 text-xs text-purple-100">
                <TrendingUp className="h-3 w-3" />
                <span>+{dashboardData.finance.growth}% نمو</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('attendance_rate')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.attendance.studentRate}%</div>
              <div className="w-full bg-orange-400 rounded-full h-2 mt-2">
                <div 
                  className="bg-white h-2 rounded-full" 
                  style={{ width: `${dashboardData.attendance.studentRate}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts and Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Academic Performance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>{t('academic_performance')}</span>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExport('الأداء الأكاديمي')}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.academics.averageGrade}</div>
                    <div className="text-sm text-gray-600">{t('average_grade')}</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.academics.topStudents}</div>
                    <div className="text-sm text-gray-600">{t('top_students')}</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{dashboardData.academics.atRiskStudents}</div>
                    <div className="text-sm text-gray-600">{t('at_risk_students')}</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{dashboardData.academics.completionRate}%</div>
                    <div className="text-sm text-gray-600">{t('completion_rate')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transportation Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Bus className="h-5 w-5 text-green-600" />
                    <span>{t('transportation')}</span>
                  </CardTitle>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {dashboardData.transportation.onTimePerformance}% {t('on_time')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{dashboardData.transportation.buses}</div>
                    <div className="text-sm text-gray-600">{t('buses')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{dashboardData.transportation.routes}</div>
                    <div className="text-sm text-gray-600">{t('routes')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{dashboardData.transportation.studentsTransported}</div>
                    <div className="text-sm text-gray-600">{t('students_transport')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{dashboardData.transportation.onTimePerformance}%</div>
                    <div className="text-sm text-gray-600">{t('performance')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>{t('recent_activities')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const IconComponent = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'student' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'finance' ? 'bg-green-100 text-green-600' :
                          activity.type === 'attendance' ? 'bg-purple-100 text-purple-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <span>{t('quick_actions')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Users className="h-4 w-4 ml-2" />
                    {t('add_student')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <BookOpen className="h-4 w-4 ml-2" />
                    {t('add_teacher')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <DollarSign className="h-4 w-4 ml-2" />
                    {t('add_payment')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <MessageSquare className="h-4 w-4 ml-2" />
                    {t('send_notification')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>{t('system_status')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('database')}</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      {t('online')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('api_services')}</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      {t('operational')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('security_system')}</span>
                    <Badge className="bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 ml-1" />
                      {t('protected')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;