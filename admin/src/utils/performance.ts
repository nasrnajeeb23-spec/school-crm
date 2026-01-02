// Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

// Performance thresholds
const THRESHOLDS = {
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FID: { good: 100, needsImprovement: 300 },
    FCP: { good: 1800, needsImprovement: 3000 },
    LCP: { good: 2500, needsImprovement: 4000 },
    TTFB: { good: 800, needsImprovement: 1800 }
};

// Get rating based on thresholds
const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
};

// Send metric to analytics
const sendToAnalytics = (metric: Metric) => {
    const { name, value, rating, delta, id } = metric;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}:`, {
            value: Math.round(value),
            rating: getRating(name, value),
            delta: Math.round(delta),
            id
        });
    }

    // Send to analytics service
    if (window.gtag) {
        window.gtag('event', name, {
            event_category: 'Web Vitals',
            event_label: id,
            value: Math.round(value),
            non_interaction: true,
        });
    }

    // Send to custom analytics endpoint
    if (process.env.REACT_APP_ANALYTICS_ENDPOINT) {
        fetch(process.env.REACT_APP_ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metric: name,
                value: Math.round(value),
                rating: getRating(name, value),
                timestamp: Date.now(),
                url: window.location.href
            })
        }).catch(console.error);
    }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
};

// Track page load time
export const trackPageLoad = () => {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        const renderTime = timing.domComplete - timing.domLoading;

        console.log('[Performance] Page Load Metrics:', {
            loadTime: `${loadTime}ms`,
            domReadyTime: `${domReadyTime}ms`,
            renderTime: `${renderTime}ms`
        });

        return {
            loadTime,
            domReadyTime,
            renderTime
        };
    }
    return null;
};

// Track component render time
export const trackComponentRender = (componentName: string, startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} render time: ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
};

// Track API call performance
export const trackAPICall = async <T>(
    apiName: string,
    apiCall: () => Promise<T>
): Promise<T> => {
    const startTime = performance.now();

    try {
        const result = await apiCall();
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Performance] API ${apiName}: ${duration.toFixed(2)}ms`);
        }

        // Track slow API calls
        if (duration > 3000) {
            console.warn(`[Performance] Slow API call detected: ${apiName} took ${duration.toFixed(2)}ms`);
        }

        return result;
    } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error(`[Performance] API ${apiName} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
    }
};

// Get current performance metrics
export const getPerformanceMetrics = () => {
    if (!window.performance) return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load: navigation.loadEventEnd - navigation.loadEventStart,
        fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        total: navigation.loadEventEnd - navigation.fetchStart
    };
};

// Monitor memory usage (if available)
export const getMemoryUsage = () => {
    if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
            usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
            totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
            jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
        };
    }
    return null;
};

export default {
    initPerformanceMonitoring,
    trackPageLoad,
    trackComponentRender,
    trackAPICall,
    getPerformanceMetrics,
    getMemoryUsage
};
