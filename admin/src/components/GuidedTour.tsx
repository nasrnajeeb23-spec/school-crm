import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface GuidedTourProps {
    tourKey: string;
    steps: Step[];
    autoStart?: boolean;
}

const GuidedTour: React.FC<GuidedTourProps> = ({ tourKey, steps, autoStart = false }) => {
    const [run, setRun] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Check if user has completed this tour before
        const completedTours = JSON.parse(localStorage.getItem('completedTours') || '[]');

        if (!completedTours.includes(tourKey) && autoStart) {
            // Start tour after a short delay
            setTimeout(() => setRun(true), 1000);
        }
    }, [tourKey, autoStart]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            // Mark tour as completed
            const completedTours = JSON.parse(localStorage.getItem('completedTours') || '[]');
            if (!completedTours.includes(tourKey)) {
                completedTours.push(tourKey);
                localStorage.setItem('completedTours', JSON.stringify(completedTours));
            }
            setRun(false);
        }
    };

    const resetTour = () => {
        const completedTours = JSON.parse(localStorage.getItem('completedTours') || '[]');
        const filtered = completedTours.filter((key: string) => key !== tourKey);
        localStorage.setItem('completedTours', JSON.stringify(filtered));
        setRun(true);
    };

    return (
        <>
            <Joyride
                steps={steps}
                run={run}
                continuous
                showProgress
                showSkipButton
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#4F46E5', // Indigo
                        zIndex: 10000,
                    },
                    tooltip: {
                        fontSize: 14,
                        padding: 20,
                    },
                    buttonNext: {
                        backgroundColor: '#4F46E5',
                        fontSize: 14,
                        padding: '8px 16px',
                    },
                    buttonBack: {
                        marginLeft: 10,
                        fontSize: 14,
                        padding: '8px 16px',
                    },
                    buttonSkip: {
                        fontSize: 14,
                        padding: '8px 16px',
                    },
                }}
                locale={{
                    back: 'السابق',
                    close: 'إغلاق',
                    last: 'إنهاء',
                    next: 'التالي',
                    skip: 'تخطي',
                }}
            />

            {/* Reset button for development/testing */}
            {process.env.NODE_ENV === 'development' && (
                <button
                    onClick={resetTour}
                    className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors text-sm"
                >
                    إعادة تشغيل الجولة
                </button>
            )}
        </>
    );
};

// Predefined tours
export const tours = {
    dashboard: {
        key: 'dashboard-tour',
        steps: [
            {
                target: 'body',
                content: 'مرحباً بك في لوحة تحكم المدير العام! دعنا نأخذك في جولة سريعة.',
                placement: 'center' as const,
            },
            {
                target: '[data-tour="stats"]',
                content: 'هنا يمكنك رؤية الإحصائيات الرئيسية للنظام بالكامل.',
            },
            {
                target: '[data-tour="sidebar"]',
                content: 'استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة.',
            },
            {
                target: '[data-tour="help-widget"]',
                content: 'إذا احتجت مساعدة في أي وقت، اضغط هنا للوصول للمساعدة السريعة.',
            },
        ],
    },

    schools: {
        key: 'schools-tour',
        steps: [
            {
                target: '[data-tour="add-school"]',
                content: 'اضغط هنا لإضافة مدرسة جديدة للنظام.',
            },
            {
                target: '[data-tour="schools-table"]',
                content: 'هنا قائمة بجميع المدارس المسجلة مع معلوماتها الأساسية.',
            },
            {
                target: '[data-tour="manage-school"]',
                content: 'اضغط على "إدارة" للوصول لصفحة إدارة المدرسة الكاملة.',
            },
            {
                target: '[data-tour="pagination"]',
                content: 'استخدم أدوات التنقل هنا لتصفح المدارس.',
            },
        ],
    },

    team: {
        key: 'team-tour',
        steps: [
            {
                target: '[data-tour="add-member"]',
                content: 'اضغط هنا لإضافة عضو جديد لفريق المدير العام.',
            },
            {
                target: '[data-tour="team-table"]',
                content: 'هنا قائمة بجميع أعضاء الفريق مع أدوارهم وصلاحياتهم.',
            },
            {
                target: '[data-tour="member-actions"]',
                content: 'يمكنك تعديل أو حذف أعضاء الفريق من هنا.',
            },
        ],
    },
};

export default GuidedTour;
