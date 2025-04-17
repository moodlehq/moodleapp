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

import moment from 'moment-timezone';

import { CoreConstants } from '@/core/constants';

import { CoreTime } from './time';
import { CoreBrowser } from '@singletons/browser';

/**
 * Method to warn that logs are disabled, called only once.
 */
const warnLogsDisabled = CoreTime.once(() => {
    // eslint-disable-next-line no-console
    console.warn('Log is disabled in production app');
});

/**
 * Log function type.
 */
type LogFunction = (...data: unknown[]) => void;

/**
 * Helper service to display messages in the console.
 *
 * @description
 * This service is meant to improve log messages, adding a timestamp and a name to all log messages.
 *
 * In your class constructor, call getInstance to configure your class name:
 * CoreLogger.getInstance('InitPage');
 *
 * Then you can call the log function you want to use in this logger instance.
 */
export class CoreLogger {

    log: LogFunction;
    info: LogFunction;
    warn: LogFunction;
    debug: LogFunction;
    error: LogFunction;

    // Avoid creating instances.
    private constructor(log: LogFunction, info: LogFunction, warn: LogFunction, debug: LogFunction, error: LogFunction) {
        this.log = log;
        this.info = info;
        this.warn = warn;
        this.debug = debug;
        this.error = error;
    }

    /**
     * Get a logger instance for a certain class, service or component.
     *
     * @param className Name to use in the messages.
     * @returns Instance.
     */
    static getInstance(className: string): CoreLogger {
        // Disable log on production and testing.
        if (
            !CoreBrowser.hasDevelopmentSetting('LoggingEnabled') &&
            (CoreConstants.BUILD.isProduction || CoreConstants.BUILD.isTesting)
        ) {
            if (CoreConstants.BUILD.isProduction) {
                warnLogsDisabled();
            }

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const muted = () => {};

            return new CoreLogger(muted, muted, muted, muted, muted);
        }

        className = className || '';

        return new CoreLogger(
            // eslint-disable-next-line no-console
            CoreLogger.prepareLogFn((...data) => console.log(...data), className),
            // eslint-disable-next-line no-console
            CoreLogger.prepareLogFn((...data) => console.info(...data), className),
            // eslint-disable-next-line no-console
            CoreLogger.prepareLogFn((...data) => console.warn(...data), className),
            // eslint-disable-next-line no-console
            CoreLogger.prepareLogFn((...data) => console.debug(...data), className),
            // eslint-disable-next-line no-console
            CoreLogger.prepareLogFn((...data) => console.error(...data), className),
        );
    }

    /**
     * Prepare a logging function, concatenating the timestamp and class name to all messages.
     *
     * @param logFn Log function to use.
     * @param className Name to use in the messages.
     * @returns Prepared function.
     */
    private static prepareLogFn(logFn: LogFunction, className: string): LogFunction {
        // Return our own function that will call the logging function with the treated message.
        return (...args): void => {
            const now = moment().format('l LTS');
            args[0] = now + ' ' + className + ': ' + args[0]; // Prepend timestamp and className to the original message.
            logFn.apply(null, args);
        };
    }

}
