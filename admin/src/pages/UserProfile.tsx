import React, { useState } from 'react';
import { UpdatableUserData } from '../types';
import { useToast } from '../contexts/ToastContext';
import { changeSuperAdminPassword } from '../api';
import { useAppContext } from '../contexts/AppContext';

const UserProfile: React.FC = () => {
    const { currentUser, updateProfile } = useAppContext();
    const { addToast } = useToast();
    
    // Should not render if there's no user, but as a safeguard:
    const [name, setName] = useState(currentUser?.name || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isInfoSaving, setIsInfoSaving] = useState(false);
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);
    
    if (!currentUser) {
        return <div className="p-8 text-center">لا يمكن تحميل بيانات المستخدم.</div>;
    }

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInfoSaving(true);
        await updateProfile({ name, phone });
        setIsInfoSaving(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) { addToast('يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.', 'warning'); return; }
        if (newPassword !== confirmPassword) {
            addToast('كلمتا المرور الجديدتان غير متطابقتين.', 'error');
            return;
        }
        setIsPasswordSaving(true);
        try {
            await changeSuperAdminPassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            addToast('تم تغيير كلمة المرور بنجاح.', 'success');
        } catch (err: any) {
            const msg = String(err?.message || '');
            addToast(msg.includes('401') ? 'كلمة المرور الحالية غير صحيحة.' : 'فشل تغيير كلمة المرور.', 'error');
        }
        setIsPasswordSaving(false);
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">المعلومات الشخصية</h3>
                <form onSubmit={handleInfoSubmit} className="space-y-4 max-w-xl">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
                        <input type="text" name="name" id="name" value={name} onChange={e => setName(e.target.value)} required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                        <input type="email" name="email" id="email" value={currentUser.email} disabled className={`${inputStyle} bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed`} />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف (اختياري)</label>
                        <input type="tel" name="phone" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputStyle} />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isInfoSaving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400">
                            {isInfoSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">تغيير كلمة المرور</h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور الحالية</label>
                        <input type="password" name="currentPassword" id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور الجديدة</label>
                        <input type="password" name="newPassword" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تأكيد كلمة المرور الجديدة</label>
                        <input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={inputStyle} />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isPasswordSaving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400">
                             {isPasswordSaving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;
