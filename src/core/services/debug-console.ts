// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Debug console capture service.
 * Captures all console output since app launch for debugging purposes.
 */

export interface DebugLogEntry {
    timestamp: Date;
    level: 'log' | 'info' | 'warn' | 'error' | 'debug';
    message: string;
    args: string;
}

class CoreDebugConsoleService {

    private logs: DebugLogEntry[] = [];
    private maxLogs = 1000;
    private initialized = false;
    private originalConsole: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
        debug: typeof console.debug;
    };

    constructor() {
        // Store original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            debug: console.debug.bind(console),
        };
    }

    /**
     * Initialize console capture. Call this early in app startup.
     */
    init(): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        // Override console methods
        console.log = (...args: unknown[]) => {
            this.capture('log', args);
            this.originalConsole.log(...args);
        };

        console.info = (...args: unknown[]) => {
            this.capture('info', args);
            this.originalConsole.info(...args);
        };

        console.warn = (...args: unknown[]) => {
            this.capture('warn', args);
            this.originalConsole.warn(...args);
        };

        console.error = (...args: unknown[]) => {
            this.capture('error', args);
            this.originalConsole.error(...args);
        };

        console.debug = (...args: unknown[]) => {
            this.capture('debug', args);
            this.originalConsole.debug(...args);
        };

        // Also capture uncaught errors
        window.addEventListener('error', (event) => {
            this.capture('error', [`[Uncaught] ${event.message} at ${event.filename}:${event.lineno}`]);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.capture('error', [`[Unhandled Promise] ${event.reason}`]);
        });

        this.capture('info', ['[DebugConsole] Console capture initialized']);
    }

    /**
     * Capture a log entry.
     */
    private capture(level: DebugLogEntry['level'], args: unknown[]): void {
        const message = args.length > 0 ? this.stringify(args[0]) : '';
        const restArgs = args.length > 1 ? args.slice(1).map(a => this.stringify(a)).join(' ') : '';

        const entry: DebugLogEntry = {
            timestamp: new Date(),
            level,
            message,
            args: restArgs,
        };

        this.logs.push(entry);

        // Trim if exceeds max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    /**
     * Convert any value to string for logging.
     */
    private stringify(value: unknown): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (value instanceof Error) return `${value.name}: ${value.message}`;

        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }

    /**
     * Get all captured logs.
     */
    getLogs(): DebugLogEntry[] {
        return [...this.logs];
    }

    /**
     * Get logs filtered by level.
     */
    getLogsByLevel(level: DebugLogEntry['level']): DebugLogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Get logs as formatted text.
     */
    getLogsAsText(filter?: DebugLogEntry['level']): string {
        const logs = filter ? this.getLogsByLevel(filter) : this.logs;

        return logs.map(log => {
            const time = log.timestamp.toISOString().substring(11, 23);
            const level = log.level.toUpperCase().padEnd(5);
            const args = log.args ? ` ${log.args}` : '';
            return `[${time}] ${level} ${log.message}${args}`;
        }).join('\n');
    }

    /**
     * Clear all logs.
     */
    clear(): void {
        this.logs = [];
        this.capture('info', ['[DebugConsole] Logs cleared']);
    }

    /**
     * Get log count.
     */
    getCount(): number {
        return this.logs.length;
    }

    /**
     * Get error count.
     */
    getErrorCount(): number {
        return this.logs.filter(l => l.level === 'error').length;
    }

    /**
     * Get warning count.
     */
    getWarnCount(): number {
        return this.logs.filter(l => l.level === 'warn').length;
    }

}

export const CoreDebugConsole = new CoreDebugConsoleService();

// Initialize immediately when module loads
CoreDebugConsole.init();
