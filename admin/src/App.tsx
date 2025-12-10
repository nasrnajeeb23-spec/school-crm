import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from './contexts/AppContext';
import { User, UserRole } from './types';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages and layouts for better performance
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AppsPage = React.lazy(() => import('./pages/AppsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SuperAdminLayout = React.lazy(() => import('./layouts/SuperAdminLayout'));
const SchoolAdminLayout = React.lazy(() => import('./layouts/SchoolAdminLayout'));
const TeacherLayout = React.lazy(() => import('./layouts/TeacherLayout'));
const ParentLayout = React.lazy(() => import('./layouts/ParentLayout'));

// Super Admin Pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const SchoolsList = React.lazy(() => import('./pages/SchoolsList'));
const SubscriptionsList = React.lazy(() => import('./pages/SubscriptionsList'));
const Billing = React.lazy(() => import('./pages/Billing'));
const FeatureManagement = React.lazy(() => import('./pages/FeatureManagement'));
const ContentManagement = React.lazy(() => import('./pages/ContentManagement'));
const UsageLimits = React.lazy(() => import('./pages/UsageLimits'));
const RolesList = React.lazy(() => import('./pages/RolesList'));
const LicenseManagement = React.lazy(() => import('./pages/LicenseManagement'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const SchoolAdminsList = React.lazy(() => import('./pages/SchoolAdminsList'));
const SuperAdminTeamManagement = React.lazy(() => import('./pages/SuperAdminTeamManagement'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const SecuritySettings = React.lazy(() => import('./pages/SecuritySettings'));
const BulkOps = React.lazy(() => import('./pages/BulkOps'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const ApiKeys = React.lazy(() => import('./pages/ApiKeys'));
const SsoSettings = React.lazy(() => import('./pages/SsoSettings'));
const TaskCenter = React.lazy(() => import('./pages/TaskCenter'));
const MfaSettings = React.lazy(() => import('./pages/MfaSettings'));
const ReportsCenter = React.lazy(() => import('./pages/ReportsCenter'));
const TrialSignupPublic = React.lazy(() => import('./pages/TrialSignupPublic'));
const OnboardingRequests = React.lazy(() => import('./pages/OnboardingRequests'));
const SuperAdminSchoolManage = React.lazy(() => import('./pages/SuperAdminSchoolManage'));
const SetPassword = React.lazy(() => import('./pages/SetPassword'));

// School Admin Pages
const SchoolDashboard = React.lazy(() => import('./pages/SchoolDashboard'));
const StudentsList = React.lazy(() => import('./pages/StudentsList'));
const StudentProfile = React.lazy(() => import('./pages/StudentProfile'));
const TeachersList = React.lazy(() => import('./pages/TeachersList'));
const TeacherProfile = React.lazy(() => import('./pages/TeacherProfile'));
const ParentsList = React.lazy(() => import('./pages/ParentsList'));
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'));
const ClassesList = React.lazy(() => import('./pages/ClassesList'));
const Transportation = React.lazy(() => import('./pages/Transportation'));
const Attendance = React.lazy(() => import('./pages/Attendance'));
const Schedule = React.lazy(() => import('./pages/Schedule'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const Grades = React.lazy(() => import('./pages/Grades'));
const Messaging = React.lazy(() => import('./pages/Messaging'));
const Finance = React.lazy(() => import('./pages/Finance'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ModulesPage = React.lazy(() => import('./pages/ModulesPage'));
const SubscriptionLocked = React.lazy(() => import('./pages/SubscriptionLocked'));

// Teacher Pages
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const TeacherMyClasses = React.lazy(() => import('./pages/TeacherMyClasses'));
const TeacherSchedule = React.lazy(() => import('./pages/TeacherSchedule'));
const TeacherAssignments = React.lazy(() => import('./pages/TeacherAssignments'));
const TeacherAttendance = React.lazy(() => import('./pages/TeacherAttendance'));
const TeacherGrades = React.lazy(() => import('./pages/TeacherGrades'));
const TeacherFinance = React.lazy(() => import('./pages/TeacherFinance'));

// Parent Pages
const ParentDashboard = React.lazy(() => import('./pages/ParentDashboard'));
const ParentGrades = React.lazy(() => import('./pages/ParentGrades'));
const ParentAttendance = React.lazy(() => import('./pages/ParentAttendance'));
const ParentFinance = React.lazy(() => import('./pages/ParentFinance'));
const ParentSchedule = React.lazy(() => import('./pages/ParentSchedule'));
const ParentRequests = React.lazy(() => import('./pages/ParentRequests'));
const ParentTransportation = React.lazy(() => import('./pages/ParentTransportation'));


// Helper to determine the home route based on user role
const getHomeRouteForUser = (role: UserRole) => {
  switch (role) {
    case UserRole.SuperAdmin:
    case UserRole.SuperAdminFinancial:
    case UserRole.SuperAdminTechnical:
    case UserRole.SuperAdminSupervisor:
      return '/superadmin';
    case UserRole.SchoolAdmin: return '/school';
    case UserRole.Staff: return '/staff';
    case UserRole.Teacher: return '/teacher';
    case UserRole.Parent: return '/parent';
    default: return '/';
  }
};

const ProtectedRoute: React.FC<{ allowedRoles: UserRole[] }> = ({ allowedRoles }) => {
    const { currentUser, hydrating } = useAppContext();
    
    if (hydrating) {
        return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">جاري تحميل الجلسة...</div>;
    }
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (currentUser.passwordMustChange) {
        const profileRoute = `${getHomeRouteForUser(currentUser.role)}/profile`;
        if (window.location.pathname !== profileRoute) {
            return <Navigate to={profileRoute} replace />;
        }
    }

    // Check if user has access to superadmin area (all superadmin roles)
    const superAdminRoles = [UserRole.SuperAdmin, UserRole.SuperAdminFinancial, UserRole.SuperAdminTechnical, UserRole.SuperAdminSupervisor];
    const userHasSuperAdminAccess = superAdminRoles.includes(currentUser.role);
    const routeRequiresSuperAdmin = allowedRoles.some(role => superAdminRoles.includes(role));
    
    if (routeRequiresSuperAdmin && userHasSuperAdminAccess) {
        return <Outlet />;
    }

    if (!allowedRoles.includes(currentUser.role)) {
        return <Navigate to={getHomeRouteForUser(currentUser.role)} replace />;
    }

    return <Outlet />;
};


const App: React.FC = () => {
  const { currentUser, hydrating } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname || '';
    const protectedPath = /^\/(school|teacher|parent|superadmin)/.test(path);
    if (currentUser && protectedPath) {
      try { localStorage.setItem('last_route', path); } catch {}
    }
  }, [currentUser, location.pathname]);

  useEffect(() => {
    if (!hydrating && currentUser) {
      const path = location.pathname || '';
      const onPublic = path === '/' || path === '/login' || path === '/superadmin/login';
      if (onPublic) {
        try {
          const last = localStorage.getItem('last_route') || '';
          if (last && last !== path) navigate(last, { replace: true });
        } catch {}
      }
    }
  }, [hydrating, currentUser]);

  return (
    <>
      <ToastContainer />
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">جاري تحميل الصفحة...</div>}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/join" element={<TrialSignupPublic />} />
          <Route path="/login" element={<LoginPage mode="default" />} />
          <Route path="/superadmin/login" element={<LoginPage mode="superadmin" />} />
          <Route path="/set-password" element={<SetPassword />} />

          {/* Super Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.SuperAdminFinancial, UserRole.SuperAdminTechnical, UserRole.SuperAdminSupervisor]} />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="schools" element={<SchoolsList />} />
              <Route path="schools/:schoolId/manage" element={<SuperAdminSchoolManage />} />
              <Route path="school-admins" element={<SchoolAdminsList />} />
              <Route path="team" element={<SuperAdminTeamManagement />} />
              <Route path="subscriptions" element={<SubscriptionsList />} />
              <Route path="billing" element={<Billing />} />
              <Route path="modules" element={<FeatureManagement />} />
              <Route path="plans" element={<FeatureManagement />} />
              <Route path="content" element={<ContentManagement />} />
              <Route path="onboarding" element={<OnboardingRequests />} />
              <Route path="usage_limits" element={<UsageLimits />} />
              <Route path="permissions" element={<RolesList />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="bulk-ops" element={<BulkOps />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="sso" element={<SsoSettings />} />
              <Route path="tasks" element={<TaskCenter />} />
              <Route path="mfa" element={<MfaSettings />} />
              <Route path="reports_center" element={<ReportsCenter />} />
              <Route path="license" element={<LicenseManagement />} />
              <Route path="profile" element={<UserProfile />} />
            </Route>
            <Route path="/manage/school/:schoolId/*" element={<SchoolAdminLayout isSuperAdminView />} />
          </Route>

          {/* School Admin & Staff Routes */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.SchoolAdmin, UserRole.Staff]} />}> 
            <Route path="/school/subscription-locked" element={<SubscriptionLocked />} />
            <Route path="/school/*" element={<SchoolAdminLayout />} />
            <Route path="/staff/*" element={<SchoolAdminLayout />} />
          </Route>
          
          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.Teacher]} />}>
            <Route path="/teacher" element={<TeacherLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="my_classes" element={<TeacherMyClasses />} />
                <Route path="schedule" element={<TeacherSchedule />} />
                <Route path="assignments" element={<TeacherAssignments />} />
                <Route path="attendance" element={<TeacherAttendance />} />
                <Route path="grades" element={<TeacherGrades />} />
                <Route path="finance" element={<TeacherFinance />} />
                <Route path="messaging" element={<Messaging />} />
                <Route path="profile" element={<UserProfile />} />
            </Route>
          </Route>

          {/* Parent Routes */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.Parent]} />}>
             <Route path="/parent" element={<ParentLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ParentDashboard />} />
                <Route path="grades" element={<ParentGrades />} />
                <Route path="attendance" element={<ParentAttendance />} />
                <Route path="finance" element={<ParentFinance />} />
                <Route path="schedule" element={<ParentSchedule />} />
                <Route path="requests" element={<ParentRequests />} />
                <Route path="messaging" element={<Messaging />} />
                <Route path="transportation" element={<ParentTransportation />} />
                <Route path="profile" element={<UserProfile />} />
             </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

export default App;
