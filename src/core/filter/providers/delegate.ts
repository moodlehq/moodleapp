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

import { Injectable, ViewContainerRef } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from './filter';
import { CoreFilterDefaultHandler } from './default-filter';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreSite } from '@classes/site';

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
     * @param siteId Site ID. If not defined, current site.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(text: string, filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, siteId?: string): string | Promise<string>;

    /**
     * Handle HTML. This function is called after "filter", and it will receive an HTMLElement containing the text that was
     * filtered.
     *
     * @param container The HTML container to handle.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param viewContainerRef The ViewContainerRef where the container is.
     * @param component Component.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If async, promise resolved when done.
     */
    handleHtml?(container: HTMLElement, filter: CoreFilterFilter, options: CoreFilterFormatTextOptions,
            viewContainerRef: ViewContainerRef, component?: string, componentId?: string | number, siteId?: string)
            : void | Promise<void>;

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @return Whether filter should be applied.
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean;
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
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filtered text.
     */
    filterText(text: string, filters: CoreFilterFilter[], options?: any, skipFilters?: string[], siteId?: string): Promise<string> {

        // Wait for filters to be initialized.
        return this.handlersInitPromise.then(() => {

            return this.sitesProvider.getSite(siteId);
        }).then((site) => {

            let promise: Promise<string> = Promise.resolve(text);

            filters = filters || [];
            options = options || {};

            filters.forEach((filter) => {
                if (!this.isEnabledAndShouldApply(filter, options, site, skipFilters)) {
                    return;
                }

                promise = promise.then((text) => {
                    return Promise.resolve(this.executeFunctionOnEnabled(filter.filter, 'filter', [text, filter, options, siteId]))
                            .catch((error) => {
                        this.logger.error('Error applying filter' + filter.filter, error);

                        return text;
                    });
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
     * Let filters handle an HTML element.
     *
     * @param container The HTML container to handle.
     * @param filters Filters to apply.
     * @param viewContainerRef The ViewContainerRef where the container is.
     * @param options Options passed to the filters.
     * @param skipFilters Names of filters that shouldn't be applied.
     * @param component Component.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    handleHtml(container: HTMLElement, filters: CoreFilterFilter[], viewContainerRef?: ViewContainerRef, options?: any,
            skipFilters?: string[], component?: string, componentId?: string | number, siteId?: string): Promise<any> {

        // Wait for filters to be initialized.
        return this.handlersInitPromise.then(() => {

            return this.sitesProvider.getSite(siteId);
        }).then((site) => {

            let promise: Promise<any> = Promise.resolve();

            filters = filters || [];
            options = options || {};

            filters.forEach((filter) => {
                if (!this.isEnabledAndShouldApply(filter, options, site, skipFilters)) {
                    return;
                }

                promise = promise.then(() => {

                    return Promise.resolve(this.executeFunctionOnEnabled(filter.filter, 'handleHtml',
                            [container, filter, options, viewContainerRef, component, componentId, siteId])).catch((error) => {
                        this.logger.error('Error handling HTML' + filter.filter, error);
                    });
                });
            });

            return promise;
        });
    }

    /**
     * Check if a filter is enabled and should be applied.
     *
     * @param filters Filters to apply.
     * @param options Options passed to the filters.
     * @param site Site.
     * @param skipFilters Names of filters that shouldn't be applied.
     * @return Whether the filter is enabled and should be applied.
     */
    isEnabledAndShouldApply(filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, site: CoreSite,
            skipFilters?: string[]): boolean {

        if (filter.localstate == -1 || (filter.localstate == 0 && filter.inheritedstate == -1)) {
            // Filter is disabled, ignore it.
            return false;
        }

        if (!this.shouldFilterBeApplied(filter, options, site)) {
            // Filter shouldn't be applied.
            return false;
        }

        if (skipFilters && skipFilters.indexOf(filter.filter) != -1) {
            // Skip this filter.
            return false;
        }

        return true;
    }

    /**
     * Check if at least 1 filter should be applied in a certain site and with certain options.
     *
     * @param filter Filter to check.
     * @param options Options passed to the filters.
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true: whether the filter should be applied.
     */
    shouldBeApplied(filters: CoreFilterFilter[], options: CoreFilterFormatTextOptions, site?: CoreSite): Promise<boolean> {
        // Wait for filters to be initialized.
        return this.handlersInitPromise.then(() => {
            for (let i = 0; i < filters.length; i++) {
                if (this.shouldFilterBeApplied(filters[i], options, site)) {
                    return true;
                }
            }
        });
    }

    /**
     * Check whether a filter should be applied in a certain site and with certain options.
     *
     * @param filter Filter to check.
     * @param options Options passed to the filters.
     * @param site Site. If not defined, current site.
     * @return Whether the filter should be applied.
     */
    protected shouldFilterBeApplied(filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {

        if (!this.hasHandler(filter.filter, true)) {
            return false;
        }

        return this.executeFunctionOnEnabled(filter.filter, 'shouldBeApplied', [options, site]);
    }
}
