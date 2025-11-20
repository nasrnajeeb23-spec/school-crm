import React from 'react';

interface TermsOfServiceModalProps {
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">شروط الخدمة</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-bold">&times;</button>
        </div>
        <div className="overflow-y-auto pr-4 space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p>مرحبًا بك في SchoolSaaS. باستخدامك لمنصتنا، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">1. استخدام الخدمة</h3>
            <p>تمنحك SchoolSaaS ترخيصًا غير حصري وغير قابل للتحويل لاستخدام المنصة وفقًا لخطة اشتراكك. أنت توافق على عدم استخدام الخدمة لأي أغراض غير قانونية أو محظورة.</p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">2. مسؤوليات المستخدم</h3>
            <ul className="list-disc list-inside space-y-1">
                <li>أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور.</li>
                <li>أنت مسؤول عن دقة وصحة جميع البيانات التي تدخلها في النظام.</li>
                <li>يجب عليك الامتثال لجميع القوانين واللوائح المعمول بها فيما يتعلق بخصوصية بيانات الطلاب.</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">3. الاشتراك والدفع</h3>
            <p>تستند رسوم الخدمة إلى خطة الاشتراك التي تختارها. يتم إصدار الفواتير بشكل دوري (شهريًا أو سنويًا). يحق لـ SchoolSaaS تعليق الخدمة أو إنهائها في حالة عدم سداد الرسوم المستحقة.</p>
            
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">4. إنهاء الخدمة</h3>
            <p>يمكنك إلغاء اشتراكك في أي وقت. تحتفظ SchoolSaaS بالحق في تعليق أو إنهاء وصولك إلى الخدمة في حالة انتهاك هذه الشروط.</p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">5. حدود المسؤولية</h3>
            <p>يتم توفير الخدمة "كما هي". لا تتحمل SchoolSaaS أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الخدمة.</p>
            
             <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">6. التغييرات على الشروط</h3>
            <p>قد نقوم بتحديث شروط الخدمة هذه من وقت لآخر. سنقوم بإخطارك بأي تغييرات جوهرية عن طريق نشر الشروط الجديدة على هذه الصفحة.</p>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إغلاق</button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceModal;
