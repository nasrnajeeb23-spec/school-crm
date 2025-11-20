
import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface AiMessageComposerModalProps {
  onClose: () => void;
  onUseMessage: (message: string) => void;
  recipientName: string;
}

type Tone = 'رسمي' | 'ودي' | 'قلق';

const AiMessageComposerModal: React.FC<AiMessageComposerModalProps> = ({ onClose, onUseMessage, recipientName }) => {
  const [purpose, setPurpose] = useState('');
  const [tone, setTone] = useState<Tone>('ودي');
  const [points, setPoints] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!purpose.trim()) {
      setError('الرجاء إدخال الغرض من الرسالة.');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedMessage('');

    try {
      // Simulate AI generation with a simple template-based approach
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let message = '';
      
      if (tone === 'ودي') {
        message = `عزيزي/عزيزتي ${recipientName}،\n\n`;
      } else if (tone === 'رسمي') {
        message = `السيد/السيدة ${recipientName}،\n\n`;
      } else if (tone === 'قلق') {
        message = `السيد/السيدة ${recipientName}،\n\nنود التنويه بأمر مهم يتعلق بـ `;
      }
      
      message += `${purpose}\n\n`;
      
      if (points.trim()) {
        message += `التفاصيل المهمة:\n${points}\n\n`;
      }
      
      if (tone === 'ودي') {
        message += 'نرجو التواصل معنا في حال وجود أي استفسارات.\n\nمع أطيب التحيات،\nإدارة المدرسة';
      } else if (tone === 'رسمي') {
        message += 'نأمل في التقيد بالمواعيد المحددة.\n\nمع التحية،\nإدارة المدرسة';
      } else if (tone === 'قلق') {
        message += 'نرجو منكم التواصل الفوري لحل هذا الأمر.\n\nمع التحية،\nإدارة المدرسة';
      }
      
      setGeneratedMessage(message);

    } catch (e) {
      console.error("Message generation failed:", e);
      setError('حدث خطأ أثناء إنشاء الرسالة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";
  const textareaStyle = `${inputStyle} h-24 resize-none`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <SparklesIcon className="h-6 w-6 ml-2 text-teal-500" />
            إنشاء رسالة بالذكاء الاصطناعي
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الغرض من الرسالة (مثال: إبلاغ عن اجتماع أولياء الأمور)</label>
            <input type="text" name="purpose" id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required className={inputStyle} />
          </div>
          <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نبرة الرسالة</label>
              <select name="tone" id="tone" value={tone} onChange={e => setTone(e.target.value as Tone)} className={inputStyle}>
                <option value="ودي">ودي</option>
                <option value="رسمي">رسمي</option>
                <option value="قلق">قلق</option>
              </select>
          </div>
           <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نقاط رئيسية (اختياري)</label>
            <textarea name="points" id="points" value={points} onChange={e => setPoints(e.target.value)} className={textareaStyle} placeholder="مثال: التاريخ: 25 مايو، الوقت: 6 مساءً، المكان: قاعة المدرسة..."></textarea>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center">
          <button onClick={handleGenerate} disabled={isLoading || !purpose.trim()} className="flex items-center px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed">
            <SparklesIcon className="h-5 w-5 ml-2" />
            {isLoading ? 'جاري الإنشاء...' : 'إنشاء مسودة'}
          </button>
        </div>

        {(generatedMessage || error || isLoading) && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                {isLoading && <p className="text-center text-gray-500 dark:text-gray-400">...الذكاء الاصطناعي يكتب الآن</p>}
                {error && <p className="text-center text-red-500">{error}</p>}
                {generatedMessage && (
                    <div>
                        <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">الرسالة المقترحة:</h4>
                        <textarea readOnly value={generatedMessage} className="w-full h-32 p-2 bg-transparent border rounded-md border-gray-200 dark:border-gray-600 resize-none"></textarea>
                        <div className="mt-4 flex justify-end gap-3">
                           <button onClick={handleGenerate} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                                إعادة إنشاء
                            </button>
                            <button onClick={() => onUseMessage(generatedMessage)} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">
                                استخدام هذه الرسالة
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default AiMessageComposerModal;