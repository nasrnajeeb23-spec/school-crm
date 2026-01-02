// Analytics tracking utilities
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        dataLayer?: any[];
    }
}

// Initialize Google Analytics
export const initAnalytics = (measurementId: string) => {
    if (!measurementId || process.env.NODE_ENV !== 'production') {
        console.log('[Analytics] Disabled in development mode');
        return;
    }

    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
        send_page_view: false // We'll send manually
    });

    console.log('[Analytics] Initialized');
};

// Track page view
export const trackPageView = (path: string, title?: string) => {
    if (window.gtag) {
        window.gtag('event', 'page_view', {
            page_path: path,
            page_title: title || document.title
        });
        console.log(`[Analytics] Page view: ${path}`);
    }
};

// Track event
export const trackEvent = (
    category: string,
    action: string,
    label?: string,
    value?: number
) => {
    if (window.gtag) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value
        });
        console.log(`[Analytics] Event: ${category} - ${action}`);
    }
};

// Track user action
export const trackUserAction = (action: string, details?: Record<string, any>) => {
    trackEvent('User Action', action, JSON.stringify(details));
};

// Track button click
export const trackButtonClick = (buttonName: string, location?: string) => {
    trackEvent('Button Click', buttonName, location);
};

// Track form submission
export const trackFormSubmission = (formName: string, success: boolean) => {
    trackEvent('Form', success ? 'Submit Success' : 'Submit Error', formName);
};

// Track search
export const trackSearch = (searchTerm: string, resultCount?: number) => {
    trackEvent('Search', 'Query', searchTerm, resultCount);
};

// Track error
export const trackError = (errorType: string, errorMessage: string) => {
    trackEvent('Error', errorType, errorMessage);
};

// Track timing
export const trackTiming = (
    category: string,
    variable: string,
    value: number,
    label?: string
) => {
    if (window.gtag) {
        window.gtag('event', 'timing_complete', {
            name: variable,
            value: Math.round(value),
            event_category: category,
            event_label: label
        });
    }
};

// Track custom dimension
export const setUserProperties = (properties: Record<string, any>) => {
    if (window.gtag) {
        window.gtag('set', 'user_properties', properties);
    }
};

// Track user ID
export const setUserId = (userId: string) => {
    if (window.gtag) {
        window.gtag('config', process.env.REACT_APP_GA_MEASUREMENT_ID, {
            user_id: userId
        });
    }
};

// Track exception
export const trackException = (description: string, fatal: boolean = false) => {
    if (window.gtag) {
        window.gtag('event', 'exception', {
            description,
            fatal
        });
    }
};

// E-commerce tracking
export const trackPurchase = (transaction: {
    transactionId: string;
    value: number;
    currency?: string;
    items?: any[];
}) => {
    if (window.gtag) {
        window.gtag('event', 'purchase', {
            transaction_id: transaction.transactionId,
            value: transaction.value,
            currency: transaction.currency || 'USD',
            items: transaction.items || []
        });
    }
};

// Track social interaction
export const trackSocial = (network: string, action: string, target?: string) => {
    trackEvent('Social', action, `${network}${target ? ` - ${target}` : ''}`);
};

// Track outbound link
export const trackOutboundLink = (url: string) => {
    trackEvent('Outbound Link', 'Click', url);
};

// Track file download
export const trackDownload = (fileName: string, fileType?: string) => {
    trackEvent('Download', fileType || 'File', fileName);
};

// Track video interaction
export const trackVideo = (action: 'play' | 'pause' | 'complete', videoName: string) => {
    trackEvent('Video', action, videoName);
};

// Custom event tracking for SuperAdmin actions
export const trackSuperAdminAction = {
    schoolCreated: (schoolName: string) => {
        trackEvent('SuperAdmin', 'School Created', schoolName);
    },

    schoolDeleted: (schoolName: string) => {
        trackEvent('SuperAdmin', 'School Deleted', schoolName);
    },

    subscriptionUpdated: (schoolName: string, newStatus: string) => {
        trackEvent('SuperAdmin', 'Subscription Updated', `${schoolName} - ${newStatus}`);
    },

    teamMemberAdded: (role: string) => {
        trackEvent('SuperAdmin', 'Team Member Added', role);
    },

    messageRead: () => {
        trackEvent('SuperAdmin', 'Message Read');
    },

    reportGenerated: (reportType: string) => {
        trackEvent('SuperAdmin', 'Report Generated', reportType);
    },

    bulkOperation: (operationType: string, affectedCount: number) => {
        trackEvent('SuperAdmin', 'Bulk Operation', operationType, affectedCount);
    }
};

export default {
    initAnalytics,
    trackPageView,
    trackEvent,
    trackUserAction,
    trackButtonClick,
    trackFormSubmission,
    trackSearch,
    trackError,
    trackTiming,
    setUserProperties,
    setUserId,
    trackException,
    trackPurchase,
    trackSocial,
    trackOutboundLink,
    trackDownload,
    trackVideo,
    trackSuperAdminAction
};
