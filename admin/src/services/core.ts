// API Configuration for Production - Real Backend Connection
// هذا الملف يتصل بالـ Backend الحقيقي على Render

// 🔗 ضبط عنوان الـ API للإنتاج/التطوير بشكل مرن
// الأولوية: متغير بيئة مُحقن أثناء البناء -> Vite import.meta.env (إن وجد) -> localStorage(api_base) -> الافتراضي
const API_BASE_URL = (
    (typeof process !== 'undefined' && (process as any).env && (process as any).env.REACT_APP_API_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ||
    (typeof window !== 'undefined' ? (localStorage.getItem('api_base') || '') : '') ||
    'http://localhost:5000/api'
);

const API_ALT_BASE_URL = (() => {
    const base = API_BASE_URL || '';
    const hasApi = /\/api\/?$/.test(base);
    if (hasApi) return base.replace(/\/api\/?$/, '');
    return base.replace(/\/$/, '') + '/api';
})();

export const getApiBase = (): string => API_BASE_URL;
export const getApiAltBase = (): string => API_ALT_BASE_URL;

export const getAssetUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // Remove /api suffix from base to get root
    const root = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const authHeaders = () => {
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const base: Record<string, string> = {};
    if (schoolId) base['x-school-id'] = String(schoolId);
    return base;
};

export const getAuthToken = (): string => {
    try {
        return (typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || '') : '');
    } catch {
        return '';
    }
};

export const setAuthToken = (token?: string) => {
    try {
        if (typeof window === 'undefined') return;
        if (token) localStorage.setItem('auth_token', token);
        else localStorage.removeItem('auth_token');
    } catch { }
};

export const getRefreshToken = (): string => {
    try {
        return (typeof window !== 'undefined' ? (localStorage.getItem('refresh_token') || '') : '');
    } catch {
        return '';
    }
};

export const setRefreshToken = (token?: string) => {
    try {
        if (typeof window === 'undefined') return;
        if (token) localStorage.setItem('refresh_token', token);
        else localStorage.removeItem('refresh_token');
    } catch { }
};

// دالة مساعدة للاتصال بالـ API
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const isFormData = typeof FormData !== 'undefined' && (options as any)?.body instanceof FormData;
    const storedToken = getAuthToken();
    const headers: Record<string, string> = { ...authHeaders() };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
    if (options.headers) {
        const h = options.headers as HeadersInit;
        if (Array.isArray(h)) {
            for (const [k, v] of h) headers[String(k)] = String(v);
        } else if (typeof Headers !== 'undefined' && h instanceof Headers) {
            h.forEach((v, k) => { headers[k] = v; });
        } else if (typeof h === 'object') {
            for (const [k, v] of Object.entries(h as Record<string, string>)) {
                if (v !== undefined) headers[k] = String(v);
            }
        }
    }
    const attemptFetch = async (base: string) => {
        return await fetch(`${base}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
            cache: 'no-store' as RequestCache,
        });
    };
    const derivedBase = (() => {
        try {
            if (typeof window === 'undefined') return '';
            const host = window.location.hostname || '';
            if (!host) return '';
            if (host.endsWith('.onrender.com')) {
                const sub = host.split('.onrender.com')[0];
                const back = sub.includes('admin') ? sub.replace('admin', 'backend') : `${sub}-backend`;
                return `https://${back}.onrender.com/api`;
            }
            return '';
        } catch {
            return '';
        }
    })();
    let lastError: any = null;
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await attemptFetch(API_BASE_URL);
            if (!response.ok) {
                let bodyText = '';
                let bodyJson: any = null;
                try {
                    bodyJson = await response.json();
                } catch {
                    try {
                        bodyText = await response.text();
                    } catch { }
                }
                const primaryMsg = bodyJson?.message || bodyJson?.msg || bodyText || '';
                const detailMsg = bodyJson?.error || bodyJson?.detail || '';
                const msg = (primaryMsg && detailMsg && /^(Server Error|خطأ في الخادم|Internal Server Error)$/i.test(String(primaryMsg).trim()))
                    ? `${primaryMsg}: ${detailMsg}`
                    : (primaryMsg || detailMsg || '');
                const statusText = response.statusText ? ` ${response.statusText}` : '';

                if (response.status === 429 && endpoint === '/auth/me' && derivedBase && derivedBase !== API_BASE_URL) {
                    const alt2 = await attemptFetch(derivedBase);
                    if (alt2.ok) return await alt2.json();
                }

                if (response.status === 401) {
                    if (endpoint === '/auth/me') {
                        try {
                            setAuthToken('');
                            setRefreshToken('');
                            localStorage.removeItem('current_school_id');
                        } catch { }
                    }
                    const isAuthFlow = /^\/auth\/superadmin\//.test(endpoint) || endpoint === '/auth/login';
                    const onProtectedRoute = typeof window !== 'undefined'
                        ? /^(\/school|\/teacher|\/parent|\/admin)/.test(window.location?.pathname || '')
                        : false;
                    const onLoginPage = typeof window !== 'undefined'
                        ? /^\/(login|superadmin\/login)\/?$/i.test(window.location?.pathname || '')
                        : false;
                    const onPublicPage = typeof window !== 'undefined'
                        ? (() => {
                            const p = window.location?.pathname || '';
                            return /^\/$/.test(p) || /^\/(landing|apps|help|pricing)\/?$/i.test(p);
                        })()
                        : false;
                    const onInviteFlow = (() => {
                        try {
                            if (typeof window === 'undefined') return false;
                            const p = window.location?.pathname || '';
                            if (!/^\/set-password\/?$/i.test(p)) return false;
                            const q = new URLSearchParams(window.location.search);
                            return q.has('token');
                        } catch {
                            return false;
                        }
                    })();
                    const shouldRedirect = !isAuthFlow && !onInviteFlow && !onLoginPage && !onPublicPage && onProtectedRoute;
                    if (shouldRedirect) {
                        try {
                            if (typeof window !== 'undefined') {
                                localStorage.removeItem('current_school_id');
                                const toast = (window as any).__addToast;
                                if (typeof toast === 'function' && !onLoginPage && !onPublicPage) {
                                    toast('انتهت الجلسة. الرجاء تسجيل الدخول مجددًا.', 'warning');
                                }
                                setTimeout(() => {
                                    window.location.href = '/login';
                                }, 0);
                            }
                        } catch { }
                    }
                    throw new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
                }

                if (response.status === 404 || /Not\s*Found/i.test(msg)) {
                    const alt = await attemptFetch(API_ALT_BASE_URL);
                    if (!alt.ok) {
                        let altText = '';
                        let altJson: any = null;
                        try {
                            altJson = await alt.json();
                        } catch {
                            try {
                                altText = await alt.text();
                            } catch { }
                        }
                        const altMsg = altJson?.msg || altJson?.error || altText || '';
                        const altStatusText = alt.statusText ? ` ${alt.statusText}` : '';
                        throw new Error(`HTTP ${alt.status}${altStatusText}${altMsg ? `: ${altMsg}` : ''}`);
                    }
                    return await alt.json();
                }

                throw new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            const isNetworkError = (error instanceof TypeError) || /Failed to fetch|NetworkError|net::ERR_/i.test(String((error as any)?.message || ''));
            if (endpoint === '/auth/me' && derivedBase && derivedBase !== API_BASE_URL) {
                try {
                    const resp = await attemptFetch(derivedBase);
                    if (resp.ok) return await resp.json();
                } catch { }
            }
            if (attempt < maxRetries && isNetworkError) {
                const delayMs = 500 * (attempt + 1);
                await new Promise(res => setTimeout(res, delayMs));
                continue;
            }
            const msg = String((error as any)?.message || '');
            const suppress = endpoint === '/auth/me' && (/HTTP\s*401|HTTP\s*403|Missing Authorization header|Invalid or expired token/i.test(msg));
            if (!suppress) console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }
    throw lastError;
};

export const unwrap = <T = any>(payload: any, key?: string, fallback: T = ([] as unknown as T)): T => {
    try {
        if (payload && typeof payload === 'object' && 'success' in payload) {
            const data = (payload as any).data;
            if (key) {
                const v = data ? data[key] : undefined;
                return (v !== undefined ? v : fallback) as T;
            }
            return (data !== undefined ? data : fallback) as T;
        }
        return (payload !== undefined ? payload : fallback) as T;
    } catch {
        return fallback;
    }
};
