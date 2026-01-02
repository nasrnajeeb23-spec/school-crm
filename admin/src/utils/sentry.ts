// Sentry configuration for error tracking
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry
export const initSentry = () => {
    if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.REACT_APP_SENTRY_DSN,
            integrations: [
                new BrowserTracing(),
                new Sentry.Replay({
                    maskAllText: true,
                    blockAllMedia: true,
                }),
            ],

            // Performance Monitoring
            tracesSampleRate: 0.1, // 10% of transactions

            // Session Replay
            replaysSessionSampleRate: 0.1, // 10% of sessions
            replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

            // Environment
            environment: process.env.NODE_ENV,

            // Release tracking
            release: process.env.REACT_APP_VERSION || 'unknown',

            // Before send hook to filter sensitive data
            beforeSend(event, hint) {
                // Remove sensitive data
                if (event.request) {
                    delete event.request.cookies;
                    delete event.request.headers;
                }

                // Filter out certain errors
                if (event.exception) {
                    const error = hint.originalException as any;
                    if (error && error.message && String(error.message).includes('Network')) {
                        return null;
                    }
                    if (error && error.message && String(error.message).includes('cancel')) {
                        return null;
                    }
                }

                return event;
            },

            // Ignore certain errors
            ignoreErrors: [
                // Browser extensions
                'top.GLOBALS',
                // Random plugins/extensions
                'originalCreateNotification',
                'canvas.contentDocument',
                'MyApp_RemoveAllHighlights',
                // Facebook errors
                'fb_xd_fragment',
                // Network errors
                'NetworkError',
                'Network request failed',
                // Cancelled requests
                'Request aborted',
                'The operation was aborted'
            ],

            // Deny URLs
            denyUrls: [
                // Browser extensions
                /extensions\//i,
                /^chrome:\/\//i,
                /^chrome-extension:\/\//i,
            ],
        });

        console.log('Sentry initialized');
    }
};

// Capture exception
export const captureException = (error: Error, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
            contexts: context ? { custom: context } : undefined
        });
    } else {
        console.error('Error:', error, context);
    }
};

// Capture message
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(message, level);
    } else {
        console.log(`[${level}]`, message);
    }
};

// Set user context
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
    Sentry.setUser(user);
};

// Set custom context
export const setContext = (name: string, context: Record<string, any>) => {
    Sentry.setContext(name, context);
};

// Add breadcrumb
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
    Sentry.addBreadcrumb(breadcrumb);
};

// Wrap component with error boundary
export const withErrorBoundary = Sentry.withErrorBoundary;

// Export Sentry for advanced usage
export { Sentry };

export default {
    initSentry,
    captureException,
    captureMessage,
    setUser,
    setContext,
    addBreadcrumb,
    withErrorBoundary,
    Sentry
};
