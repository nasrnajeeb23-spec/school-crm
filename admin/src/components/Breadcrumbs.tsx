import React from 'react';
import { useLocation, Link } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
    const location = useLocation();

    // Auto-generate breadcrumbs from path if items not provided
    const breadcrumbItems = items || generateBreadcrumbs(location.pathname);

    if (breadcrumbItems.length <= 1) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className={`flex ${className}`}>
            <ol className="inline-flex items-center space-x-1 md:space-x-3 space-x-reverse">
                {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;

                    return (
                        <li key={index} className="inline-flex items-center">
                            {index > 0 && (
                                <svg
                                    className="w-3 h-3 text-gray-400 mx-1"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 6 10"
                                >
                                    <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 1 1 5l4 4"
                                    />
                                </svg>
                            )}
                            {isLast || !item.path ? (
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400" aria-current="page">
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    to={item.path}
                                    className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white"
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

// Helper function to generate breadcrumbs from path
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Map of path segments to Arabic labels
    const labelMap: { [key: string]: string } = {
        superadmin: 'المدير العام',
        dashboard: 'لوحة التحكم',
        schools: 'المدارس',
        team: 'الفريق',
        subscriptions: 'الاشتراكات',
        billing: 'الفوترة',
        plans: 'الخطط',
        'audit-logs': 'سجلات التدقيق',
        content: 'المحتوى',
        onboarding: 'طلبات التجربة',
        usage_limits: 'حدود الاستخدام',
        permissions: 'الصلاحيات',
        security: 'الأمان',
        'bulk-ops': 'عمليات جماعية',
        'api-keys': 'مفاتيح API',
        sso: 'SSO',
        tasks: 'المهام',
        messages: 'الرسائل',
        mfa: 'MFA',
        reports_center: 'مركز التقارير',
        analytics: 'التحليلات',
        license: 'التراخيص',
        profile: 'الملف الشخصي',
        manage: 'إدارة',
        'school-admins': 'مدراء المدارس'
    };

    let currentPath = '';
    paths.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const label = labelMap[segment] || segment;

        // Don't add link for the last item or for IDs (numeric segments)
        const isLast = index === paths.length - 1;
        const isId = /^\d+$/.test(segment);

        breadcrumbs.push({
            label: isId ? `#${segment}` : label,
            path: isLast || isId ? undefined : currentPath
        });
    });

    return breadcrumbs;
}

export default Breadcrumbs;
