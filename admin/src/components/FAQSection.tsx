import React from 'react';
import Accordion from '../components/Accordion';

const FAQSection: React.FC = () => {
    const faqItems = [
        {
            id: 'add-school',
            title: 'كيف أضيف مدرسة جديدة؟',
            content: (
                <div className="space-y-2">
                    <p>لإضافة مدرسة جديدة:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "المدارس" من القائمة الجانبية</li>
                        <li>اضغط على زر "إضافة مدرسة" في أعلى الصفحة</li>
                        <li>املأ البيانات المطلوبة (الاسم، البريد الإلكتروني، رقم الهاتف، الخطة)</li>
                        <li>اضغط على "حفظ" لإنشاء المدرسة</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'manage-subscription',
            title: 'كيف أدير اشتراك مدرسة؟',
            content: (
                <div className="space-y-2">
                    <p>لإدارة اشتراك مدرسة:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "المدارس"</li>
                        <li>اضغط على "إدارة" بجانب المدرسة المطلوبة</li>
                        <li>في صفحة إدارة المدرسة، ستجد قسم "تفاصيل الاشتراك"</li>
                        <li>يمكنك تفعيل، إيقاف، أو تحديث الاشتراك من هناك</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'add-team-member',
            title: 'كيف أضيف عضو جديد للفريق؟',
            content: (
                <div className="space-y-2">
                    <p>لإضافة عضو جديد لفريق المدير العام:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "إدارة الفريق"</li>
                        <li>اضغط على "إضافة عضو جديد"</li>
                        <li>املأ بيانات العضو (الاسم، البريد، اسم المستخدم، كلمة المرور)</li>
                        <li>اختر الدور الوظيفي (مسؤول مالي، فني، أو مشرف عام)</li>
                        <li>حدد الصلاحيات المطلوبة</li>
                        <li>اضغط على "إنشاء"</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'view-reports',
            title: 'كيف أعرض التقارير المالية؟',
            content: (
                <div className="space-y-2">
                    <p>لعرض التقارير المالية:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "التحليلات" أو "مركز التقارير"</li>
                        <li>اختر نوع التقرير المطلوب (إيرادات، اشتراكات، فواتير)</li>
                        <li>حدد الفترة الزمنية</li>
                        <li>اضغط على "عرض التقرير" أو "تصدير"</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'backup-schedule',
            title: 'كيف أجدول النسخ الاحتياطي؟',
            content: (
                <div className="space-y-2">
                    <p>لجدولة النسخ الاحتياطي لمدرسة:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة إدارة المدرسة</li>
                        <li>ابحث عن قسم "النسخ الاحتياطي"</li>
                        <li>اختر التكرار (يومي أو شهري)</li>
                        <li>حدد الوقت واليوم المناسب</li>
                        <li>اضغط على "جدولة النسخ الاحتياطي"</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'bulk-operations',
            title: 'كيف أنفذ عمليات جماعية؟',
            content: (
                <div className="space-y-2">
                    <p>لتنفيذ عمليات جماعية على عدة مدارس:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "عمليات جماعية"</li>
                        <li>اختر نوع العملية (تحديث الوحدات، حدود الاستخدام، إلخ)</li>
                        <li>حدد المدارس المستهدفة</li>
                        <li>املأ البيانات المطلوبة</li>
                        <li>راجع التغييرات واضغط على "تنفيذ"</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'security-settings',
            title: 'كيف أدير إعدادات الأمان؟',
            content: (
                <div className="space-y-2">
                    <p>لإدارة إعدادات الأمان:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "الأمان"</li>
                        <li>يمكنك تحديث سياسات الأمان المركزية</li>
                        <li>إدارة إعدادات SSO (Single Sign-On)</li>
                        <li>إدارة مفاتيح API</li>
                        <li>عرض سجلات التدقيق</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'messages',
            title: 'كيف أدير رسائل "تواصل معنا"؟',
            content: (
                <div className="space-y-2">
                    <p>لإدارة رسائل المستخدمين:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "الرسائل"</li>
                        <li>ستجد جميع الرسائل مع حالتها (جديد، مقروء، مؤرشف)</li>
                        <li>يمكنك تحديد الرسالة كمقروءة أو أرشفتها</li>
                        <li>استخدم الفلاتر لعرض رسائل محددة</li>
                        <li>يمكنك حذف الرسائل غير المهمة</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'audit-logs',
            title: 'كيف أعرض سجلات التدقيق؟',
            content: (
                <div className="space-y-2">
                    <p>لعرض سجلات التدقيق:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "سجلات التدقيق"</li>
                        <li>يمكنك فلترة السجلات حسب التاريخ، الإجراء، أو المستخدم</li>
                        <li>عرض تفاصيل كل إجراء تم تنفيذه</li>
                        <li>تصدير السجلات للمراجعة</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'api-keys',
            title: 'كيف أدير مفاتيح API؟',
            content: (
                <div className="space-y-2">
                    <p>لإدارة مفاتيح API:</p>
                    <ol className="list-decimal list-inside space-y-1 mr-4">
                        <li>اذهب إلى صفحة "مفاتيح API"</li>
                        <li>اضغط على "إنشاء مفتاح جديد"</li>
                        <li>حدد الصلاحيات والقيود</li>
                        <li>احفظ المفتاح في مكان آمن (لن يظهر مرة أخرى)</li>
                        <li>يمكنك إلغاء أو حذف المفاتيح القديمة</li>
                    </ol>
                </div>
            )
        }
    ];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    الأسئلة الشائعة
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    إجابات على الأسئلة الأكثر شيوعاً حول استخدام لوحة تحكم المدير العام
                </p>
            </div>

            <Accordion items={faqItems} defaultOpen={['add-school']} />

            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    لم تجد إجابة لسؤالك؟
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    تواصل مع فريق الدعم الفني وسنكون سعداء بمساعدتك
                </p>
                <div className="flex gap-3">
                    <a
                        href="/superadmin/messages"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        إرسال رسالة
                    </a>
                    <a
                        href="mailto:support@example.com"
                        className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        البريد الإلكتروني
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FAQSection;
