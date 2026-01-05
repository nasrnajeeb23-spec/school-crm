import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { useToast } from '../contexts/ToastContext';
import Pagination from '../components/Pagination';
import ResponsiveTable from '../components/ResponsiveTable';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'READ' | 'ARCHIVED'>('ALL');

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

  // Filter messages
  const filteredMessages = filterStatus === 'ALL'
    ? messages
    : messages.filter(m => m.status === filterStatus);

  // Pagination logic
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleFilterChange = (status: 'ALL' | 'NEW' | 'READ' | 'ARCHIVED') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  // Render table row for desktop
  const renderRow = (msg: ContactMessage) => {
    const preview = renderMessagePreview(msg);
    const isAd = isAdRequest(parsePayload(msg.message));
    return (
      <>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{msg.name}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{msg.email}</td>
        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={preview}>
          <div className="flex items-center gap-2">
            <span>{preview}</span>
            {isAd && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">طلب إعلان</span>}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          {new Date(msg.createdAt).toLocaleDateString('ar-SA')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${msg.status === 'NEW' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
              msg.status === 'READ' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
            {msg.status === 'NEW' ? 'جديد' : msg.status === 'READ' ? 'مقرؤة' : 'مؤرشفة'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
          <div className="flex gap-2">
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
      </>
    );
  };

  // Render card for mobile
  const renderCard = (msg: ContactMessage) => {
    const preview = renderMessagePreview(msg);
    const isAd = isAdRequest(parsePayload(msg.message));
    return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{msg.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full 
              ${msg.status === 'NEW' ? 'bg-green-100 text-green-800' :
                msg.status === 'READ' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'}`}>
              {msg.status === 'NEW' ? 'جديد' : msg.status === 'READ' ? 'مقرؤة' : 'مؤرشفة'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{msg.email}</p>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">{preview}</p>
          {isAd && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">طلب إعلان</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{new Date(msg.createdAt).toLocaleDateString('ar-SA')}</span>
      </div>

      <div className="flex gap-2 pt-2">
        {msg.status !== 'READ' && (
          <button
            onClick={() => updateStatus(msg.id, 'READ')}
            className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            تحديد كمقروء
          </button>
        )}
        {msg.status !== 'ARCHIVED' && (
          <button
            onClick={() => updateStatus(msg.id, 'ARCHIVED')}
            className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            أرشفة
          </button>
        )}
        <button
          onClick={() => deleteMessage(msg.id)}
          className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          حذف
        </button>
      </div>
    </div>
  );
  };

  const parsePayload = (raw: string): any | null => { try { return JSON.parse(raw); } catch { return null; } };
  const isAdRequest = (payload: any): boolean => { try { return payload && String(payload.type) === 'AD_REQUEST'; } catch { return false; } };
  const renderMessagePreview = (msg: ContactMessage) => { const payload = parsePayload(msg.message); return isAdRequest(payload) ? String(payload.title || 'طلب إعلان') : msg.message; };
  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">رسائل تواصل معنا</h1>
        <p className="text-gray-600 dark:text-gray-400">إدارة رسائل المستخدمين والرد عليها</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'ALL'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          الكل ({messages.length})
        </button>
        <button
          onClick={() => handleFilterChange('NEW')}
          className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'NEW'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          جديد ({messages.filter(m => m.status === 'NEW').length})
        </button>
        <button
          onClick={() => handleFilterChange('READ')}
          className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'READ'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          مقروءة ({messages.filter(m => m.status === 'READ').length})
        </button>
        <button
          onClick={() => handleFilterChange('ARCHIVED')}
          className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'ARCHIVED'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          مؤرشفة ({messages.filter(m => m.status === 'ARCHIVED').length})
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>لا توجد رسائل {filterStatus !== 'ALL' && `بحالة "${filterStatus}"`}</p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <ResponsiveTable
                headers={['الاسم', 'البريد الإلكتروني', 'الرسالة', 'التاريخ', 'الحالة', 'إجراءات']}
                data={paginatedMessages}
                renderRow={renderRow}
                renderCard={renderCard}
                keyExtractor={(msg) => String(msg.id)}
                emptyMessage="لا توجد رسائل في هذه الصفحة"
              />
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredMessages.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdminMessages;
