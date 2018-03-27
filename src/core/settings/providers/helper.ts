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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Settings helper service.
 */
@Injectable()
export class CoreSettingsHelper {
    protected logger;

    constructor(loggerProvider: CoreLoggerProvider, private utils: CoreUtilsProvider) {
        this.logger = loggerProvider.getInstance('CoreSettingsHelper');
    }

    /**
     * Get a certain processor from a list of processors.
     *
     * @param {any[]} processors List of processors.
     * @param {string} name Name of the processor to get.
     * @param {boolean} [fallback=true] True to return first processor if not found, false to not return any. Defaults to true.
     * @return {any} Processor.
     */
    getProcessor(processors: any[], name: string, fallback: boolean = true): any {
        if (!processors || !processors.length) {
            return;
        }
        for (let i = 0; i < processors.length; i++) {
            if (processors[i].name == name) {
                return processors[i];
            }
        }

        // Processor not found, return first if requested.
        if (fallback) {
            return processors[0];
        }
    }

    /**
     * Return the components and notifications that have a certain processor.
     *
     * @param {string} processor Name of the processor to filter.
     * @param {any[]} components Array of components.
     * @return {any[]} Filtered components.
     */
    getProcessorComponents(processor: string, components: any[]): any[] {
        const result = [];

        components.forEach((component) => {
            // Create a copy of the component with an empty list of notifications.
            const componentCopy = this.utils.clone(component);
            componentCopy.notifications = [];

            component.notifications.forEach((notification) => {
                let hasProcessor = false;
                for (let i = 0; i < notification.processors.length; i++) {
                    const proc = notification.processors[i];
                    if (proc.name == processor) {
                        hasProcessor = true;
                        notification.currentProcessor = proc;
                        break;
                    }
                }

                if (hasProcessor) {
                    // Add the notification.
                    componentCopy.notifications.push(notification);
                }
            });

            if (componentCopy.notifications.length) {
                // At least 1 notification added, add the component to the result.
                result.push(componentCopy);
            }
        });

        return result;
    }
}
