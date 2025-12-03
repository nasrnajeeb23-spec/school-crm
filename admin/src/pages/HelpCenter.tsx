import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Book, FileText, ChevronRight, X, HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocFile {
  id: string;
  title: string;
  content: string;
  category: string;
  fileName: string;
  language: 'ar' | 'en';
}

interface TooltipData {
  selector: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [rtlEnabled, setRtlEnabled] = useState(true);

  // Tooltips configuration for different UI elements
  const tooltips: TooltipData[] = [
    {
      selector: '[data-tooltip="search-box"]',
      title: 'البحث السريع',
      content: 'ابحث في جميع ملفات التوثيق باستخدام كلمات مفتاحية',
      position: 'bottom'
    },
    {
      selector: '[data-tooltip="category-filter"]',
      title: 'تصفية حسب الفئة',
      content: 'تصفح الملفات حسب فئاتها المختلفة',
      position: 'bottom'
    },
    {
      selector: '[data-tooltip="pdf-export"]',
      title: 'تصدير PDF',
      content: 'احفظ الملف الحالي بصيغة PDF للرجوع إليه لاحقًا',
      position: 'left'
    },
    {
      selector: '[data-tooltip="rtl-toggle"]',
      title: 'تبديل الاتجاه',
      content: 'قم بتبديل بين عرض RTL وLTR حسب تفضيلاتك',
      position: 'bottom'
    }
  ];

  // Load documentation files
  useEffect(() => {
    const loadDocFiles = async () => {
      try {
        setLoading(true);
        // Load the get-started.ar.md file as initial content
        const response = await fetch('/backend/docs/get-started.ar.md');
        if (response.ok) {
          const content = await response.text();
          const files: DocFile[] = [{
            id: '1',
            title: 'كيفية البدء - خطوات بلا أخطاء',
            content: content,
            category: 'البدء',
            fileName: 'get-started.ar.md',
            language: 'ar'
          }];
          setDocFiles(files);
        }
      } catch (error) {
        console.error('Error loading documentation:', error);
        // Fallback content if file loading fails
        setDocFiles([{
          id: '1',
          title: 'كيفية البدء - خطوات بلا أخطاء',
          content: `# كيفية البدء (Get Started) — خطوات بلا أخطاء

## 1) المدير العام (Super Admin)
1. أنشئ مدرسة جديدة وأكمل بياناتها (الاسم/البريد/الخطة).
2. فعّل الاشتراك (تجربة/نشط) واضبط مدة التجربة إن لزم.
3. أنشئ مدير المدرسة وحدّد صلاحياته.

## 2) مدير المدرسة (School Admin)
1. افتح إعدادات المدرسة واضبط: أيام/ساعات العمل، العام الدراسي، المراحل، طرق الحضور.
2. أضف المعلمين.
3. أنشئ الفصول وحدّد السعة ومعلم غرفة.
4. أضف الطلاب واربطهم بالفصول.
5. فعّل الرسوم: أضف مرحلة وحدّد الرسوم والخطط.
6. ولّد الفواتير للطلاب.
7. اختبر الحضور اليومي للفصل.
8. جرّب الرسائل مع معلم/ولي أمر.
9. راجع التحليلات واللوحات.

## 3) المعلم
1. راجع الجدول.
2. سجّل الحضور.
3. أدخل الدرجات.
4. استخدم الرسائل للتواصل.

## 4) ولي الأمر
1. فعّل حساب الدعوة.
2. راجع ملف الطالب والدرجات.
3. تواصل مع المعلم عند الحاجة.`,
          category: 'البدء',
          fileName: 'get-started.ar.md',
          language: 'ar'
        }]);
      } finally {
        setLoading(false);
      }
    };

    loadDocFiles();
  }, []);

  // Setup tooltips
  useEffect(() => {
    const handleTooltipTrigger = (e: MouseEvent) => {
      const target = e.target as Element;
      const tooltipElement = target.closest('[data-tooltip]');
      if (tooltipElement) {
        const tooltipId = tooltipElement.getAttribute('data-tooltip');
        setActiveTooltip(tooltipId);
      } else {
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mouseover', handleTooltipTrigger);
    document.addEventListener('mouseout', () => setActiveTooltip(null));

    return () => {
      document.removeEventListener('mouseover', handleTooltipTrigger);
      document.removeEventListener('mouseout', () => setActiveTooltip(null));
    };
  }, []);

  // Filter documents based on search term
  const filteredDocs = useMemo(() => {
    if (!searchTerm) return docFiles;
    
    const term = searchTerm.toLowerCase();
    return docFiles.filter(doc => 
      doc.title.toLowerCase().includes(term) ||
      doc.content.toLowerCase().includes(term) ||
      doc.category.toLowerCase().includes(term)
    );
  }, [docFiles, searchTerm]);

  // Categories for filtering
  const categories = useMemo(() => {
    const cats = Array.from(new Set(docFiles.map(doc => doc.category)));
    return cats.map(cat => ({
      name: cat,
      count: docFiles.filter(doc => doc.category === cat).length
    }));
  }, [docFiles]);

  // Export to PDF functionality
  const exportToPDF = async () => {
    if (!selectedDoc) return;

    try {
      // Using html2pdf library (we'll add it to dependencies)
      const html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        alert('مكتبة PDF غير متوفرة. يرجى تحميل الملف لاحقًا.');
        return;
      }

      const element = document.getElementById('doc-content');
      if (!element) return;

      const opt = {
        margin: 10,
        filename: `${selectedDoc.fileName.replace('.md', '')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('حدث خطأ أثناء تصدير PDF');
    }
  };

  // Render markdown content with basic formatting
  const renderMarkdown = (content: string) => {
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/^\d+\. (.*$)/gim, '<li class="mr-4 mb-1">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="mr-4 mb-1 list-disc">$1</li>')
      .replace(/\n/gim, '<br>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">جاري تحميل التوثيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-all duration-300 ${rtlEnabled ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-5 h-5 ml-2" />
                <span>العودة للرئيسية</span>
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">مركز المساعدة</h1>
            <div className="flex items-center space-x-4">
              <button
                data-tooltip="rtl-toggle"
                onClick={() => setRtlEnabled(!rtlEnabled)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={rtlEnabled ? 'تعطيل RTL' : 'تفعيل RTL'}
              >
                {rtlEnabled ? 'LTR' : 'RTL'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <div className="relative" data-tooltip="search-box">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث في التوثيق..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6" data-tooltip="category-filter">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الفئات</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{category.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedDoc ? (
              /* Document List */
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ملفات التوثيق</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {filteredDocs.length} مستند {filteredDocs.length !== 1 ? 'ات' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              الفئة: {doc.category} | اللغة: {doc.language === 'ar' ? 'العربية' : 'English'}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                              {doc.content.substring(0, 150)}...
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Document Viewer */
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setSelectedDoc(null)}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedDoc.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          الفئة: {selectedDoc.category} | اللغة: {selectedDoc.language === 'ar' ? 'العربية' : 'English'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        data-tooltip="pdf-export"
                        onClick={exportToPDF}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4 ml-2" />
                        تصدير PDF
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div
                    id="doc-content"
                    className="prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.content) }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip Overlay */}
      {activeTooltip && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm pointer-events-auto">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {tooltips.find(t => t.selector.includes(activeTooltip))?.title}
                </h4>
                <p className="text-sm">
                  {tooltips.find(t => t.selector.includes(activeTooltip))?.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;