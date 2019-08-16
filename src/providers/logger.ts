// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable } from '@angular/core';
import * as moment from 'moment';

/**
 * Helper service to display messages in the console.
 *
 * @description
 * This service is meant to improve log messages, adding a timestamp and a name to all log messages.
 *
 * In your class constructor, call getInstance to configure your class name:
 * this.logger = logger.getInstance('InitPage');
 *
 * Then you can call the log function you want to use in this logger instance.
 */
@Injectable()
export class CoreLoggerProvider {
    /** Whether the logging is enabled. */
    enabled = true;

    constructor() {
        // Nothing to do.
    }

    /**
     * Get a logger instance for a certain class, service or component.
     *
     * @param {string} className Name to use in the messages.
     * @return {ant} Instance.
     */
    getInstance(className: string): any {
        className = className || '';
        /* tslint:disable no-console */

        return {
            log: this.prepareLogFn(console.log.bind(console), className),
            info: this.prepareLogFn(console.info.bind(console), className),
            warn: this.prepareLogFn(console.warn.bind(console), className),
            debug: this.prepareLogFn(console.debug.bind(console), className),
            error: this.prepareLogFn(console.error.bind(console), className)
        };
    }

    /**
     * Prepare a logging function, concatenating the timestamp and class name to all messages.
     *
     * @param {Function} logFn Log function to use.
     * @param {string} className Name to use in the messages.
     * @return {Function} Prepared function.
     */
    private prepareLogFn(logFn: Function, className: string): Function {
        // Return our own function that will call the logging function with the treated message.
        return (...args): void => {
            if (this.enabled) {
                const now = moment().format('l LTS');
                args[0] = now + ' ' + className + ': ' + args[0]; // Prepend timestamp and className to the original message.
                logFn.apply(null, args);
            }
        };
    }
}
