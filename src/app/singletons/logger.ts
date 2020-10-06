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

import * as moment from 'moment';
import { environment } from '@/environments/environment';

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

    /**
     * Get a logger instance for a certain class, service or component.
     *
     * @param className Name to use in the messages.
     * @return Instance.
     */
    static getInstance(className: string): CoreLogger {
        // Disable log on production.
        if (environment.production) {
            /* tslint:next-line no-console */
            console.warn('Log is disabled in production app');

            return {
                log: () => {},
                info: () => {},
                warn: () => {},
                debug: () => {},
                error: () => {},
            };
        }

        className = className || '';

        /* tslint:disable no-console */

        return {
            log: CoreLogger.prepareLogFn(console.log.bind(console), className),
            info: CoreLogger.prepareLogFn(console.info.bind(console), className),
            warn: CoreLogger.prepareLogFn(console.warn.bind(console), className),
            debug: CoreLogger.prepareLogFn(console.debug.bind(console), className),
            error: CoreLogger.prepareLogFn(console.error.bind(console), className),
        };
    }

    /**
     * Prepare a logging function, concatenating the timestamp and class name to all messages.
     *
     * @param logFn Log function to use.
     * @param className Name to use in the messages.
     * @return Prepared function.
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

/**
 * Log function type.
 */
type LogFunction = (...data: any[]) => void;
