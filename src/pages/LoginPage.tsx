import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  School, 
  User, 
  Lock, 
  Globe, 
  TrendingUp,
  Shield,
  Brain,
  Award
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, selectedRole);
      
      // التوجيه حسب الدور
      switch (selectedRole) {
        case 'superadmin':
          navigate('/superadmin');
          break;
        case 'admin':
          navigate('/admin');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'parent':
          navigate('/parent');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // بيانات تجريبية للاختبار
  const demoCredentials = {
    superadmin: { email: 'super@admin.com', password: 'password' },
    admin: { email: 'admin@school.com', password: 'password' },
    teacher: { email: 'teacher@school.com', password: 'password' },
    parent: { email: 'parent@email.com', password: 'password' }
  };

  const setDemoCredentials = (role: string) => {
    setSelectedRole(role);
    setEmail(demoCredentials[role as keyof typeof demoCredentials].email);
    setPassword(demoCredentials[role as keyof typeof demoCredentials].password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* الجزء الأيسر - معلومات النظام */}
          <div className="text-white space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <School className="h-12 w-12" />
                <h1 className="text-3xl font-bold">{t('school_crm')}</h1>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">
                {t('enterprise_school_management')}
              </h2>
              
              <p className="text-blue-100 mb-6 leading-relaxed">
                {t('modern_comprehensive_school_management_system')}
              </p>

              {/* ميزات النظام */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-blue-200" />
                  <span className="text-sm">{t('ai_analytics')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-200" />
                  <span className="text-sm">{t('enterprise_security')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-200" />
                  <span className="text-sm">{t('multi_language')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-blue-200" />
                  <span className="text-sm">{t('global_standards')}</span>
                </div>
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">10+</div>
                <div className="text-sm text-blue-100">{t('languages')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">100+</div>
                <div className="text-sm text-blue-100">{t('schools')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">50K+</div>
                <div className="text-sm text-blue-100">{t('users')}</div>
              </div>
            </div>
          </div>

          {/* الجزء الأيمن - نموذج تسجيل الدخول */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* تغيير اللغة */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{t('login')}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => changeLanguage('ar')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    i18n.language === 'ar' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    i18n.language === 'en' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* أزرار الاختبار السريع */}
            <div className="mb-6">
              <Label className="mb-2 block">{t('quick_demo')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(demoCredentials).map((role) => (
                  <Button
                    key={role}
                    variant={selectedRole === role ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDemoCredentials(role)}
                    className="text-xs"
                  >
                    {t(role)}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{t('email')}</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('enter_email')}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>{t('password')}</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('enter_password')}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{t('login_as')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { value: 'superadmin', label: t('super_admin') },
                    { value: 'admin', label: t('school_admin') },
                    { value: 'teacher', label: t('teacher') },
                    { value: 'parent', label: t('parent') }
                  ].map((role) => (
                    <Button
                      key={role.value}
                      type="button"
                      variant={selectedRole === role.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRole(role.value)}
                      className="text-xs"
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>{t('logging_in')}</span>
                  </div>
                ) : (
                  t('login')
                )}
              </Button>
            </form>

            {/* روابط إضافية */}
            <div className="mt-6 text-center space-y-2">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                {t('forgot_password')}
              </a>
              <div className="text-xs text-gray-500">
                {t('demo_credentials_info')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;