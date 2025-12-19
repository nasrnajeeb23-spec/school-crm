import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { useToast } from '../contexts/ToastContext';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  status: 'NEW' | 'READ' | 'ARCHIVED';
  createdAt: string;
}

const SuperAdminMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await api.getContactMessages();
      setMessages(data);
    } catch (error) {
      addToast('فشل تحميل الرسائل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: 'READ' | 'ARCHIVED') => {
    try {
      await api.apiCall(`/contact/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
      addToast('تم تحديث حالة الرسالة', 'success');
    } catch (error) {
      addToast('فشل تحديث الحالة', 'error');
    }
  };

  const deleteMessage = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    try {
      await api.apiCall(`/contact/${id}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== id));
      addToast('تم حذف الرسالة', 'success');
    } catch (error) {
      addToast('فشل حذف الرسالة', 'error');
    }
  };

  const parsePayload = (raw: string): any | null => {
    try { return JSON.parse(raw); } catch { return null; }
  };
  const isAdRequest = (payload: any): boolean => {
    try { return payload && String(payload.type) === 'AD_REQUEST'; } catch { return false; }
  };
  const renderMessagePreview = (msg: ContactMessage) => {
    const payload = parsePayload(msg.message);
    if (isAdRequest(payload)) {
      return String(payload.title || 'طلب إعلان');
    }
    return msg.message;
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">رسائل تواصل معنا</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد رسائل جديدة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الرسالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {messages.map((msg) => (
                  <>
                  <tr key={msg.id} className={msg.status === 'NEW' ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{msg.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{msg.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={renderMessagePreview(msg)}>
                      <div className="flex items-center gap-2">
                        <span>{renderMessagePreview(msg)}</span>
                        {(() => {
                          const payload = parsePayload(msg.message);
                          if (isAdRequest(payload)) {
                            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">طلب إعلان</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${msg.status === 'NEW' ? 'bg-green-100 text-green-800' : 
                          msg.status === 'READ' ? 'bg-gray-100 text-gray-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {msg.status === 'NEW' ? 'جديد' : msg.status === 'READ' ? 'مقرؤة' : 'مؤرشفة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      <div className="flex gap-3 items-center">
                        <button onClick={() => setExpandedId(prev => prev === msg.id ? null : msg.id)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                          {expandedId === msg.id ? 'إخفاء التفاصيل' : 'تفاصيل'}
                        </button>
                        {msg.status !== 'READ' && (
                          <button onClick={() => updateStatus(msg.id, 'READ')} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                            تحديد كمقروء
                          </button>
                        )}
                        {msg.status !== 'ARCHIVED' && (
                          <button onClick={() => updateStatus(msg.id, 'ARCHIVED')} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                            أرشفة
                          </button>
                        )}
                        <button onClick={() => deleteMessage(msg.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === msg.id && (
                    <tr>
                      <td className="px-6 py-4 bg-gray-50 dark:bg-gray-900" colSpan={6}>
                        {(() => {
                          const payload = parsePayload(msg.message);
                          if (isAdRequest(payload)) {
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div><span className="font-semibold text-gray-800 dark:text-gray-200">نوع الرسالة:</span> <span className="ml-2 rtl:mr-2 rtl:ml-0">طلب إعلان</span></div>
                                <div><span className="font-semibold text-gray-800 dark:text-gray-200">عنوان الإعلان:</span> <span className="ml-2 rtl:mr-2 rtl:ml-0">{payload.title || '-'}</span></div>
                                <div><span className="font-semibold text-gray-800 dark:text-gray-200">اسم المعلن:</span> <span className="ml-2 rtl:mr-2 rtl:ml-0">{payload.advertiserName || msg.name}</span></div>
                                <div><span className="font-semibold text-gray-800 dark:text-gray-200">بريد المعلن:</span> <span className="ml-2 rtl:mr-2 rtl:ml-0">{payload.advertiserEmail || msg.email}</span></div>
                                <div className="md:col-span-2"><span className="font-semibold text-gray-800 dark:text-gray-200">وصف الإعلان:</span> <span className="ml-2 rtl:mr-2 rtl:ml-0">{payload.description || '-'}</span></div>
                                {payload.link && (
                                  <div className="md:col-span-1"><span className="font-semibold text-gray-800 dark:text-gray-200">الرابط:</span> <a href={payload.link} target="_blank" rel="noopener noreferrer" className="ml-2 rtl:mr-2 rtl:ml-0 text-blue-600 dark:text-blue-400 hover:underline">{payload.link}</a></div>
                                )}
                                {payload.imageUrl && (
                                  <div className="md:col-span-1"><span className="font-semibold text-gray-800 dark:text-gray-200">الصورة:</span> <a href={payload.imageUrl} target="_blank" rel="noopener noreferrer" className="ml-2 rtl:mr-2 rtl:ml-0 text-blue-600 dark:text-blue-400 hover:underline">فتح الصورة</a></div>
                                )}
                                {payload.submittedAt && (
                                  <div className="md:col-span-2"><span className="font-semibold text-gray-800 dark:text-gray-200">تاريخ الإرسال:</span> <span className="ml-2 rtl:mr-2 rtl:ml-0">{new Date(payload.submittedAt).toLocaleString('ar-SA')}</span></div>
                                )}
                              </div>
                            );
                          }
                          return <div className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</div>;
                        })()}
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminMessages;
