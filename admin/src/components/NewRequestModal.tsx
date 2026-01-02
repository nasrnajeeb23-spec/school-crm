import React, { useState } from 'react';
import { NewParentRequestData, RequestType } from '../types';

interface NewRequestModalProps {
  onClose: () => void;
  onSave: (data: NewParentRequestData) => Promise<void>;
}

const NewRequestModal: React.FC<NewRequestModalProps> = ({ onClose, onSave }) => {
    const [requestData, setRequestData] = useState<NewParentRequestData>({
        type: RequestType.Leave,
        details: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setRequestData(prev => ({ ...prev, [name]: value as RequestType }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(requestData);
        // Parent component will close the modal on success
        setIsSaving(false);
    };
    
    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700";

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">تقديم طلب جديد</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع الطلب</label>
                        <select name="type" id="type" value={requestData.type} onChange={handleChange} className={inputStyle}>
                            {Object.values(RequestType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التفاصيل</label>
                        <textarea name="details" id="details" value={requestData.details} onChange={handleChange} required rows={5} className={`${inputStyle} resize-none`} placeholder="يرجى كتابة تفاصيل الطلب هنا..."></textarea>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !requestData.details.trim()}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:bg-rose-400"
                        >
                            {isSaving ? 'جاري الإرسال...' : 'إرسال الطلب'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewRequestModal;