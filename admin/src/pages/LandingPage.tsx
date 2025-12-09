import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlansList from './PlansList';
import { LogoIcon, StudentsIcon, FinanceIcon, GradesIcon, MessagingIcon, ReportsIcon, PermissionsIcon, ServerIcon } from '../components/icons';
import AdCarousel from '../components/AdCarousel';
import * as api from '../api';
import { LandingPageContent, NewAdRequestData, NewTrialRequestData, NewBusOperatorApplication, SelfHostedQuoteRequest } from '../types';
import AdSubmissionModal from '../components/AdSubmissionModal';
import TrialRequestModal from '../components/TrialRequestModal';
import BusOperatorApplicationModal from '../components/BusOperatorApplicationModal';
import SelfHostedQuoteModal from '../components/SelfHostedQuoteModal';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';
import AboutUsModal from '../components/AboutUsModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import TermsOfServiceModal from '../components/TermsOfServiceModal';


const FeatureCard: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
    <div className="flex flex-col items-center text-center p-6 transition-transform transform hover:-translate-y-2">
      <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
        <Icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{children}</p>
    </div>
);

const featureIconMap: { [key: string]: React.ElementType } = {
    'f1': StudentsIcon, 'f2': FinanceIcon, 'f3': GradesIcon,
    'f4': MessagingIcon, 'f5': ReportsIcon, 'f6': PermissionsIcon,
};


const LandingPage: React.FC = () => {
  const { trialSignup } = useAppContext();
  const navigate = useNavigate();
  const goTo = (route: string) => navigate(route);
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');
  const [isBusOperatorModalOpen, setIsBusOperatorModalOpen] = useState(false);
  const [isSelfHostedModalOpen, setIsSelfHostedModalOpen] = useState(false);
  const [isAboutUsModalOpen, setIsAboutUsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    api.getLandingPageContent().then(setContent).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, targetId: string) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const handleAdSubmit = async (data: NewAdRequestData) => {
    try {
        await api.submitAdRequest(data);
        setIsAdModalOpen(false);
        addToast('تم إرسال طلبك بنجاح! سيقوم فريقنا بمراجعته والتواصل معك قريباً.', 'success');
    } catch (error) {
        addToast("حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة مرة أخرى.", 'error');
    }
  };

  const handleBusOperatorSubmit = async (data: NewBusOperatorApplication) => {
    try {
        await api.submitBusOperatorApplication(data);
        setIsBusOperatorModalOpen(false);
        addToast('تم إرسال طلب الانضمام بنجاح! سيقوم مدير المدرسة بمراجعته.', 'success');
    } catch (error) {
        addToast("فشل إرسال الطلب. الرجاء المحاولة مرة أخرى.", 'error');
    }
  };
  
  const handleTrialSubmit = async (data: NewTrialRequestData): Promise<boolean> => {
    const success = await trialSignup(data);
    if (success) {
      setIsTrialModalOpen(false);
      // Redirect to school dashboard after successful trial signup
      navigate('/school');
    }
    return success;
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlanId(String(plan?.id || ''));
    setSelectedPlanName(String(plan?.name || ''));
    setIsTrialModalOpen(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>جاري تحميل المنصة...</p></div>;
  if (!content) return <div className="min-h-screen flex items-center justify-center"><p>حدث خطأ أثناء تحميل محتوى الصفحة.</p></div>;

  return (
    <>
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
                    <div className="flex items-center"><LogoIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" /><span className="ml-3 rtl:mr-3 rtl:ml-0 text-2xl font-bold">SchoolSaaS</span></div>
                    <nav className="flex items-center gap-x-4 sm:gap-x-8 text-sm sm:text-base">
              <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">الميزات</a>
              <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">الأسعار</a>
              <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">تواصل معنا</a>
              <button onClick={() => goTo('/apps')} className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:hover:bg-indigo-800">تحميل التطبيقات</button>
            </nav>
            <div className="flex items-center gap-4">
                <button onClick={() => goTo('/superadmin/login')} className="inline-flex px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all">بوابة المدير العام</button>
                <button onClick={() => goTo('/login')} className="px-5 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-all">تسجيل الدخول</button>
                <button onClick={() => setIsTrialModalOpen(true)} className="inline-flex px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">ابدأ تجربتك المجانية</button>
                <button onClick={() => setIsMobileMenuOpen(v => !v)} className="md:hidden p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700 z-50">
                  <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            <a href="#features" onClick={(e) => { handleNavClick(e, 'features'); setIsMobileMenuOpen(false); }} className="py-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400">الميزات</a>
            <a href="#pricing" onClick={(e) => { handleNavClick(e, 'pricing'); setIsMobileMenuOpen(false); }} className="py-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400">الأسعار</a>
            <a href="#contact" onClick={(e) => { handleNavClick(e, 'contact'); setIsMobileMenuOpen(false); }} className="py-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400">تواصل معنا</a>
            <button onClick={() => { goTo('/apps'); setIsMobileMenuOpen(false); }} className="py-2 px-4 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200">تحميل التطبيقات</button>
            <button onClick={() => { goTo('/superadmin/login'); setIsMobileMenuOpen(false); }} className="py-2 px-4 text-sm font-medium text-white bg紫-600 rounded-lg hover:bg-purple-700">بوابة المدير العام</button>
            <button onClick={() => { setIsTrialModalOpen(true); setIsMobileMenuOpen(false); }} className="py-2 px-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">ابدأ تجربتك المجانية</button>
          </div>
        </div>
      )}

      <main>
        <section className="text-center py-20 sm:py-24 lg:py-32 px-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">{content.hero.title}</h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">{content.hero.subtitle}</p>
        </section>
        
        <section className="py-12"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-12"><h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{content.ads.title}</h2></div><AdCarousel slides={content.ads.slides} /></div></section>

        <section id="features" className="py-20 sm:py-24 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center"><h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{content.features.title}</h2><p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">{content.features.subtitle}</p></div>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {content.features.items.map(item => (<FeatureCard key={item.id} icon={featureIconMap[item.id] || StudentsIcon} title={item.title}>{item.description}</FeatureCard>))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 sm:py-24"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-12"><h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">خطط أسعار مرنة تناسب الجميع</h2><p className="mt-4 text-lg text-gray-500 dark:text-gray-400">اختر الخطة التي تناسب حجم واحتياجات مدرستك.</p></div><PlansList mode="public" onSelectPlan={handleSelectPlan} /></div></section>
        
        <section id="self-hosted" className="py-20 sm:py-24 bg-gray-100 dark:bg-gray-800/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center"><div className="inline-block p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mb-4"><ServerIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" /></div><h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">النسخة الخاصة بالمؤسسات (Self-Hosted)</h2><p className="mt-4 max-w-3xl mx-auto text-lg text-gray-500 dark:text-gray-400">هل تحتاج إلى تشغيل النظام على خوادمك الخاصة؟ نقدم نسخة خاصة يمكنك تخصيصها وشرائها لمرة واحدة، مع تحكم كامل في بياناتك وبيئتك التقنية.</p><div className="mt-8"><button onClick={() => setIsSelfHostedModalOpen(true)} className="px-8 py-3 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">صمم نسختك الخاصة</button></div></div></div>
        </section>

        <section id="contact" className="py-20 sm:py-24 bg-white dark:bg-gray-800">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center"><h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">تواصل معنا</h2><p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">هل لديك استفسار أو تود طلب عرض تجريبي؟ فريقنا جاهز لمساعدتك.</p></div><div className="mt-16 max-w-lg mx-auto"><form action="#" method="POST" className="space-y-6" onSubmit={(e) => { e.preventDefault(); addToast('شكراً لتواصلك! سنتصل بك قريباً.', 'success'); (e.target as HTMLFormElement).reset(); }}><div><label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label><div className="mt-1"><input type="text" name="name" id="name" autoComplete="name" required className="py-3 px-4 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded-md" /></div></div><div><label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label><div className="mt-1"><input id="email" name="email" type="email" autoComplete="email" required className="py-3 px-4 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded-md" /></div></div><div><label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رسالتك</label><div className="mt-1"><textarea id="message" name="message" rows={4} required className="py-3 px-4 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded-md"></textarea></div></div><div className="text-center"><button type="submit" className="inline-flex justify-center py-3 px-12 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">إرسال الرسالة</button></div></form></div></div>
        </section>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-right">
                        <div className="col-span-2 md:col-span-1"><div className="flex items-center justify-center md:justify-start"><LogoIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" /><span className="ml-3 rtl:mr-3 rtl:ml-0 text-2xl font-bold">SchoolSaaS</span></div><p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">النظام المتكامل لإدارة المدارس الحديثة.</p></div>
                <div><h3 className="font-semibold text-gray-900 dark:text-white tracking-wider uppercase">المنصة</h3><ul className="mt-4 space-y-2"><li><a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">الميزات</a></li><li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">اكتشف خططنا</a></li></ul></div>
                <div><h3 className="font-semibold text-gray-900 dark:text-white tracking-wider uppercase">الشركة</h3><ul className="mt-4 space-y-2"><li><button onClick={() => setIsAboutUsModalOpen(true)} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">من نحن</button></li><li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">تواصل معنا</a></li><li><button onClick={() => setIsAdModalOpen(true)} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">اعلن معنا</button></li><li><button onClick={() => setIsBusOperatorModalOpen(true)} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">التسجيل كسائق</button></li></ul></div>
                <div><h3 className="font-semibold text-gray-900 dark:text-white tracking-wider uppercase">قانوني</h3><ul className="mt-4 space-y-2"><li><button onClick={() => setIsPrivacyModalOpen(true)} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">سياسة الخصوصية</button></li><li><button onClick={() => setIsTermsModalOpen(true)} className="text-base text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">شروط الخدمة</button></li></ul></div>
            </div>
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8 text-center text-sm text-gray-500 dark:text-gray-400"><p>&copy; {new Date().getFullYear()} SchoolSaaS. جميع الحقوق محفوظة.</p></div>
        </div>
      </footer>
    </div>
    {isAdModalOpen && <AdSubmissionModal onClose={() => setIsAdModalOpen(false)} onSave={handleAdSubmit} />}
    {isBusOperatorModalOpen && <BusOperatorApplicationModal onClose={() => setIsBusOperatorModalOpen(false)} onSave={handleBusOperatorSubmit} />}
    {isTrialModalOpen && <TrialRequestModal onClose={() => setIsTrialModalOpen(false)} onSave={handleTrialSubmit} selectedPlanId={selectedPlanId} selectedPlanName={selectedPlanName} />}
    {isSelfHostedModalOpen && <SelfHostedQuoteModal onClose={() => setIsSelfHostedModalOpen(false)} />}
    {isAboutUsModalOpen && <AboutUsModal onClose={() => setIsAboutUsModalOpen(false)} />}
    {isPrivacyModalOpen && <PrivacyPolicyModal onClose={() => setIsPrivacyModalOpen(false)} />}
    {isTermsModalOpen && <TermsOfServiceModal onClose={() => setIsTermsModalOpen(false)} />}
    </>
  );
};

export default LandingPage;
 
