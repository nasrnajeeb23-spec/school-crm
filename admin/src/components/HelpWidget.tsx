import React, { useState } from 'react';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface HelpWidgetProps {
    className?: string;
}

const HelpWidget: React.FC<HelpWidgetProps> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);

    const helpTopics = [
        {
            title: 'كيفية إضافة مدرسة جديدة',
            description: 'اذهب إلى قائمة المدارس واضغط على زر "إضافة مدرسة"',
            link: '/superadmin/schools'
        },
        {
            title: 'إدارة الاشتراكات',
            description: 'يمكنك تفعيل أو إيقاف الاشتراكات من صفحة إدارة المدرسة',
            link: '/superadmin/subscriptions'
        },
        {
            title: 'إدارة الفريق',
            description: 'أضف أعضاء جدد للفريق وحدد صلاحياتهم',
            link: '/superadmin/team'
        },
        {
            title: 'التقارير والتحليلات',
            description: 'عرض التقارير المالية والإحصائيات',
            link: '/superadmin/analytics'
        }
    ];

    return (
        <>
            {/* Help Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 left-6 z-40 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 ${className}`}
                aria-label="المساعدة"
            >
                <QuestionMarkCircleIcon className="w-6 h-6" />
            </button>

            {/* Help Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto md:w-96 bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                كيف يمكننا مساعدتك؟
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-label="إغلاق"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-3">
                                {helpTopics.map((topic, index) => (
                                    <a
                                        key={index}
                                        href={topic.link}
                                        className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                            {topic.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {topic.description}
                                        </p>
                                    </a>
                                ))}
                            </div>

                            {/* Contact Support */}
                            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                    هل تحتاج لمزيد من المساعدة؟
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    تواصل مع فريق الدعم الفني
                                </p>
                                <a
                                    href="/superadmin/messages"
                                    className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    إرسال رسالة
                                </a>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default HelpWidget;
