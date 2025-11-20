import React from 'react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">سياسة الخصوصية</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-bold">&times;</button>
        </div>
        <div className="overflow-y-auto pr-4 space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p>آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
            <p>في SchoolSaaS، نحن ملتزمون بحماية خصوصية بياناتك. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا للمعلومات الشخصية لمستخدمي منصتنا من مدارس وطلاب وأولياء أمور ومعلمين.</p>
            
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">1. المعلومات التي نجمعها</h3>
            <ul className="list-disc list-inside space-y-1">
                <li><strong>بيانات المدرسة:</strong> اسم المدرسة، العنوان، معلومات الاتصال.</li>
                <li><strong>بيانات المستخدمين:</strong> أسماء، بريد إلكتروني، أرقام هواتف، وأدوار (مدير، معلم، ولي أمر) للمستخدمين المصرح لهم.</li>
                <li><strong>بيانات الطلاب:</strong> الأسماء، الصفوف، تواريخ الميلاد، بيانات الحضور والغياب، الدرجات، والملاحظات الأكاديمية.</li>
                <li><strong>بيانات الاستخدام:</strong> معلومات حول كيفية تفاعلك مع منصتنا، مثل الصفحات التي تزورها والميزات التي تستخدمها.</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">2. كيف نستخدم المعلومات</h3>
            <p>نستخدم المعلومات التي نجمعها للأغراض التالية:</p>
            <ul className="list-disc list-inside space-y-1">
                <li>لتوفير وصيانة وتحسين خدماتنا.</li>
                <li>لإدارة الحسابات، وإصدار الفواتير، ومعالجة المدفوعات.</li>
                <li>للتواصل معكم بخصوص التحديثات، والإعلانات، وتقديم الدعم الفني.</li>
                <li>لضمان أمان منصتنا وحمايتها من الاحتيال.</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">3. أمان البيانات</h3>
            <p>نتخذ إجراءات أمنية قياسية لحماية بياناتك، بما في ذلك التشفير، وضوابط الوصول الصارمة، والمراجعات الأمنية الدورية. الوصول إلى البيانات الشخصية مقصور على الموظفين المصرح لهم فقط والذين يحتاجون إلى معرفة تلك المعلومات لأداء وظائفهم.</p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">4. مشاركة البيانات</h3>
            <p>نحن لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك المعلومات مع مزودي الخدمات الذين يساعدوننا في تشغيل منصتنا (مثل خدمات الاستضافة السحابية)، وذلك بموجب اتفاقيات سرية صارمة.</p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white pt-2">5. حقوقك</h3>
            <p>لك الحق في الوصول إلى معلوماتك الشخصية وتصحيحها أو طلب حذفها. يمكنك ممارسة هذه الحقوق عن طريق التواصل مع إدارة مدرستك أو التواصل معنا مباشرة.</p>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إغلاق</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
