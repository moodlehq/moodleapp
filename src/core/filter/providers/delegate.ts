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
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilterFilter } from './filter';
import { CoreFilterDefaultHandler } from './default-filter';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';

/**
 * Interface that all filter handlers must implement.
 */
export interface CoreFilterHandler extends CoreDelegateHandler {
    /**
     * Name of the filter. It should match the "filter" field returned in core_filters_get_available_in_context.
     */
    filterName: string;

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(text: string, filter: CoreFilterFilter, options: any): string | Promise<string>;

    /**
     * Setup the filter to be used.
     *
     * Please notice this method iwill be called for each piece of text being filtered, so it is responsible
     * for controlling its own execution cardinality.
     *
     * @param filter The filter.
     * @return Promise resolved when done, or nothing if it's synchronous.
     */
    setup(filter: CoreFilterFilter): void | Promise<any>;
}

/**
 * Delegate to register filters.
 */
@Injectable()
export class CoreFilterDelegate extends CoreDelegate {
    protected featurePrefix = 'CoreFilterDelegate_';
    protected handlerNameProperty = 'filterName';

    constructor(loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected defaultHandler: CoreFilterDefaultHandler) {
        super('CoreFilterDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * Apply a list of filters to some content.
     *
     * @param text The text to filter.
     * @param filters Filters to apply.
     * @param options Options passed to the filters.
     * @param skipFilters Names of filters that shouldn't be applied.
     * @return Promise resolved with the filtered text.
     */
    filterText(text: string, filters: CoreFilterFilter[], options?: any, skipFilters?: string[]): Promise<string> {
        if (!text) {
            return Promise.resolve(text);
        }

        // Wait for filters to be initialized.
        return this.handlersInitPromise.then(() => {

            let promise: Promise<string> = Promise.resolve(text);

            filters = filters || [];
            options = options || {};

            filters.forEach((filter) => {
                if (skipFilters && skipFilters.indexOf(filter.filter) != -1) {
                    // Skip this filter.
                    return;
                }

                if (filter.localstate == -1 || (filter.localstate == 0 && filter.inheritedstate == -1)) {
                    // Filter is disabled, ignore it.
                    return;
                }

                promise = promise.then((text) => {
                    return this.executeFunctionOnEnabled(filter.filter, 'filter', [text, filter, options]);
                });
            });

            return promise.then((text) => {
                // Remove <nolink> tags for XHTML compatibility.
                text = text.replace(/<\/?nolink>/gi, '');

                return text;
            });
        });
    }

    /**
     * Get filters that have an enabled handler.
     *
     * @param contextLevel Context level of the filters.
     * @param instanceId Instance ID.
     * @return Filters.
     */
    getEnabledFilters(contextLevel: string, instanceId: number): CoreFilterFilter[] {
        const filters: CoreFilterFilter[] = [];

        for (const name in this.enabledHandlers) {
            const handler = <CoreFilterHandler> this.enabledHandlers[name];

            filters.push({
                contextid: -1,
                contextlevel: contextLevel,
                filter: handler.filterName,
                inheritedstate: 1,
                instanceid: instanceId,
                localstate: 1
            });
        }

        return filters;
    }

    /**
     * Setup filters to be applied to some content.
     *
     * @param filters Filters to apply.
     * @return Promise resolved when done.
     */
    setupFilters(filters: CoreFilterFilter[]): Promise<any> {
        const promises: Promise<any>[] = [];

        filters.forEach((filter) => {
            promises.push(this.executeFunctionOnEnabled(filter.filter, 'setup', [filter]));
        });

        return Promise.all(promises);
    }
}
