import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { logSuperAdminAction } from '../api/superAdminAuth';
import { LandingPageContent, FeatureContent, AdSlideContent } from '../types';
import { EditIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

const ContentManagement: React.FC = () => {
    const [content, setContent] = useState<LandingPageContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        api.getLandingPageContent()
            .then(setContent)
            .catch(() => setError('فشل تحميل المحتوى.'))
            .finally(() => setLoading(false));
    }, []);

    const handleInputChange = (section: keyof LandingPageContent, field: string, value: string) => {
        setContent(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
        });
    };
    
    const handleNestedChange = (section: 'features' | 'ads', index: number, field: string, value: string) => {
        setContent(prev => {
            if (!prev) return null;
            const items = section === 'features' ? [...prev.features.items] : [...prev.ads.slides];
            (items[index] as any)[field] = value;

            if (section === 'features') {
                return {...prev, features: {...prev.features, items: items as FeatureContent[] }};
            }
            return {...prev, ads: {...prev.ads, slides: items as AdSlideContent[] }};
        });
    }

    const handleSave = async () => {
        if (!content) return;
        setIsSaving(true);
        try {
            await api.updateLandingPageContent(content);
            await logSuperAdminAction('platform.content.update', { sections: Object.keys(content || {}) });
            addToast('تم حفظ المحتوى بنجاح!', 'success');
        } catch (err) {
            console.error(err);
            const m = String((err as any)?.message || '');
            addToast(m ? `فشل حفظ المحتوى: ${m}` : 'فشل حفظ المحتوى.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="text-center p-8">جاري تحميل محتوى الصفحة...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!content) return null;

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";
    const textareaStyle = `${inputStyle} resize-y min-h-[80px]`;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <p className="text-gray-600 dark:text-gray-400">
                    قم بتعديل محتوى الصفحة الرئيسية للمنصة من هنا. التغييرات ستظهر للزوار فورًا بعد الحفظ.
                </p>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">قسم الواجهة الرئيسي (Hero)</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="hero_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان الرئيسي</label>
                        <input type="text" id="hero_title" value={content.hero.title} onChange={e => handleInputChange('hero', 'title', e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="hero_subtitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">النص الفرعي</label>
                        <textarea id="hero_subtitle" value={content.hero.subtitle} onChange={e => handleInputChange('hero', 'subtitle', e.target.value)} className={textareaStyle}></textarea>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">قسم الميزات</h3>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">عنوان القسم</label>
                            <input type="text" value={content.features.title} onChange={e => handleInputChange('features', 'title', e.target.value)} className={inputStyle} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">النص الفرعي للقسم</label>
                            <input type="text" value={content.features.subtitle} onChange={e => handleInputChange('features', 'subtitle', e.target.value)} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {content.features.items.map((item, index) => (
                            <div key={item.id} className="p-4 border dark:border-gray-700 rounded-lg space-y-2">
                                <label className="text-sm font-medium">ميزة {index + 1}</label>
                                <input type="text" placeholder="عنوان الميزة" value={item.title} onChange={e => handleNestedChange('features', index, 'title', e.target.value)} className={inputStyle} />
                                <textarea placeholder="وصف الميزة" value={item.description} onChange={e => handleNestedChange('features', index, 'description', e.target.value)} className={textareaStyle}></textarea>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ads Carousel Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">اللوحة الإعلانية</h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">عنوان القسم</label>
                        <input type="text" value={content.ads.title} onChange={e => handleInputChange('ads', 'title', e.target.value)} className={inputStyle} />
                    </div>
                    {content.ads.slides.map((slide, index) => (
                        <div key={slide.id} className="p-4 border dark:border-gray-700 rounded-lg space-y-3">
                            <h4 className="font-semibold">الإعلان {index + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="عنوان الإعلان" value={slide.title} onChange={e => handleNestedChange('ads', index, 'title', e.target.value)} className={inputStyle} />
                                <input type="text" placeholder="نص الزر" value={slide.ctaText} onChange={e => handleNestedChange('ads', index, 'ctaText', e.target.value)} className={inputStyle} />
                            </div>
                            <textarea placeholder="وصف الإعلان" value={slide.description} onChange={e => handleNestedChange('ads', index, 'description', e.target.value)} className={textareaStyle}></textarea>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="رابط الصورة (URL)" value={slide.imageUrl} onChange={e => handleNestedChange('ads', index, 'imageUrl', e.target.value)} className={inputStyle} />
                                <input type="text" placeholder="الرابط عند النقر (e.g., #pricing)" value={slide.link} onChange={e => handleNestedChange('ads', index, 'link', e.target.value)} className={inputStyle} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContentManagement;
