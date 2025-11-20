import React from 'react';

interface AboutUsModalProps {
  onClose: () => void;
}

const AboutUsModal: React.FC<AboutUsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">من نحن</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-bold">&times;</button>
        </div>
        <div className="overflow-y-auto pr-2 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
                <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">رؤيتنا</h3>
                <p>أن نكون الشريك التقني الرائد للمؤسسات التعليمية في المنطقة، من خلال توفير حلول مبتكرة تساهم في تطوير العملية التعليمية والإدارية.</p>
            </div>
            <div>
                <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">رسالتنا</h3>
                <p>تمكين المدارس من تحقيق التميز عبر منصة SchoolSaaS، وهي نظام CRM متكامل يجمع بين السهولة والكفاءة، لتعزيز التواصل بين جميع أطراف المنظومة التعليمية وتحقيق أفضل النتائج للطلاب.</p>
            </div>
             <div>
                <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">قيمنا</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>الابتكار:</strong> نسعى باستمرار لتطوير وتقديم أحدث التقنيات التي تخدم قطاع التعليم.</li>
                    <li><strong>الجودة:</strong> نلتزم بأعلى معايير الجودة في منتجاتنا وخدماتنا لضمان تجربة مستخدم استثنائية.</li>
                    <li><strong>الشراكة:</strong> نؤمن بأن نجاحنا يعتمد على نجاح شركائنا، ونعمل معهم جنبًا إلى جنب لتحقيق أهدافهم.</li>
                    <li><strong>الموثوقية:</strong> نضمن أمان واستمرارية الخدمة لبيانات عملائنا التي تمثل أولوية قصوى لنا.</li>
                </ul>
            </div>
        </div>
         <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">
              إغلاق
            </button>
        </div>
      </div>
    </div>
  );
};

export default AboutUsModal;
