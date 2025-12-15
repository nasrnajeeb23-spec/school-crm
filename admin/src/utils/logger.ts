/**
 * Unified Logger for the Application
 * 
 * This logger provides a centralized logging system that:
 * - Automatically disables console logs in production
 * - Provides consistent log formatting
 * - Can be extended to send logs to monitoring services
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
    enableInProduction?: boolean;
    prefix?: string;
}

class Logger {
    private config: LoggerConfig;
    private isProduction: boolean;

    constructor(config: LoggerConfig = {}) {
        this.config = {
            enableInProduction: false,
            prefix: '',
            ...config
        };
        this.isProduction = import.meta.env.PROD || process.env.NODE_ENV === 'production';
    }

    private shouldLog(): boolean {
        if (this.isProduction && !this.config.enableInProduction) {
            return false;
        }
        return true;
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
        return `[${timestamp}] ${prefix}[${level.toUpperCase()}] ${message}`;
    }

    /**
     * Log informational messages
     */
    info(message: string, ...args: any[]): void {
        if (!this.shouldLog()) return;
        console.log(this.formatMessage('info', message), ...args);
    }

    /**
     * Log warning messages
     */
    warn(message: string, ...args: any[]): void {
        if (!this.shouldLog()) return;
        console.warn(this.formatMessage('warn', message), ...args);
    }

    /**
     * Log error messages
     * Note: Errors are always logged, even in production
     */
    error(message: string, ...args: any[]): void {
        console.error(this.formatMessage('error', message), ...args);

        // TODO: Send to monitoring service (e.g., Sentry, LogRocket)
        // this.sendToMonitoring('error', message, args);
    }

    /**
     * Log debug messages (only in development)
     */
    debug(message: string, ...args: any[]): void {
        if (this.isProduction) return;
        console.debug(this.formatMessage('debug', message), ...args);
    }

    /**
     * Create a child logger with a specific prefix
     */
    child(prefix: string): Logger {
        return new Logger({
            ...this.config,
            prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix
        });
    }

    // TODO: Implement monitoring service integration
    // private sendToMonitoring(level: LogLevel, message: string, args: any[]): void {
    //     // Send to Sentry, LogRocket, or custom monitoring service
    // }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers for different modules
export const apiLogger = logger.child('API');
export const authLogger = logger.child('Auth');
export const uiLogger = logger.child('UI');

export default logger;
