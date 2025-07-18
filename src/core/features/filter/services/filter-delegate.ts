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

import { Injectable, ViewContainerRef, inject } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreFilter, CoreFilterFilter, CoreFilterFormatTextOptions, CoreFilterStateValue } from './filter';
import { CoreFilterDefaultHandler } from './handlers/default-filter';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { ContextLevel } from '@/core/constants';

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
     * @returns Filtered text (or promise resolved with the filtered text).
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
     * @returns If async, promise resolved when done.
     */
    handleHtml?(
        container: HTMLElement,
        filter: CoreFilterFilter,
        options: CoreFilterFormatTextOptions,
        viewContainerRef: ViewContainerRef,
        component?: string,
        componentId?: string | number,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @returns Whether filter should be applied.
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean;
}

/**
 * Delegate to register filters.
 */
@Injectable({ providedIn: 'root' })
export class CoreFilterDelegateService extends CoreDelegate<CoreFilterHandler> {

    protected defaultHandler = inject(CoreFilterDefaultHandler);
    protected featurePrefix = 'CoreFilterDelegate_';
    protected handlerNameProperty = 'filterName';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CoreFilter.canGetFiltersInSite();
    }

    /**
     * Apply a list of filters to some content.
     *
     * @param text The text to filter.
     * @param filters Filters to apply.
     * @param options Options passed to the filters.
     * @param skipFilters Names of filters that shouldn't be applied.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the filtered text.
     */
    async filterText(
        text: string,
        filters: CoreFilterFilter[] = [],
        options: CoreFilterFormatTextOptions = {},
        skipFilters?: string[],
        siteId?: string,
    ): Promise<string> {
        if (!filters.length) {
            return this.removeNolinkTags(text);
        }

        // Wait for filters to be initialized.
        await this.waitForReady();
        const enabled = this.hasHandlers(true);
        if (!enabled) {
            // No enabled filters, return the text.
            return this.removeNolinkTags(text);
        }

        const site = await CoreSites.getSite(siteId);

        for (let i = 0; i < filters.length; i++) {

            const filter = filters[i];
            if (!this.isEnabledAndShouldApply(filter, options, site, skipFilters)) {
                continue;
            }

            try {
                const newText = await this.executeFunctionOnEnabled<string>(
                    filter.filter,
                    'filter',
                    [text, filter, options, siteId],
                );

                text = newText || text;
            } catch (error) {
                this.logger.error(`Error applying filter${filter.filter}`, error);
            }
        }

        return this.removeNolinkTags(text);
    }

    /**
     * Remove <nolink> tags for XHTML compatibility.
     *
     * @param text The text to process.
     * @returns The text with <nolink> tags removed.
     */
    protected removeNolinkTags(text: string): string {
        return text.replace(/<\/?nolink>/gi, '');
    }

    /**
     * Get filters that have an enabled handler.
     *
     * @param contextLevel Context level of the filters.
     * @param instanceId Instance ID.
     * @returns Filters.
     */
    getEnabledFilters(contextLevel: ContextLevel, instanceId: number): CoreFilterFilter[] {
        const filters: CoreFilterFilter[] = [];

        for (const name in this.enabledHandlers) {
            const handler = <CoreFilterHandler> this.enabledHandlers[name];

            filters.push({
                contextid: -1,
                contextlevel: contextLevel,
                filter: handler.filterName,
                inheritedstate: 1,
                instanceid: instanceId,
                localstate: CoreFilterStateValue.ON,
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
     * @returns Promise resolved when done.
     */
    async handleHtml(
        container: HTMLElement,
        filters: CoreFilterFilter[],
        viewContainerRef?: ViewContainerRef,
        options?: CoreFilterFormatTextOptions,
        skipFilters?: string[],
        component?: string,
        componentId?: string | number,
        siteId?: string,
    ): Promise<void> {

        // Wait for filters to be initialized.
        await this.waitForReady();
        const enabled = this.hasHandlers(true);
        if (!enabled) {
            return;
        }

        const site = await CoreSites.getSite(siteId);

        filters = filters || [];
        options = options || {};

        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i];
            if (!this.isEnabledAndShouldApply(filter, options, site, skipFilters)) {
                continue;
            }

            try {
                await this.executeFunctionOnEnabled<void>(
                    filter.filter,
                    'handleHtml',
                    [container, filter, options, viewContainerRef, component, componentId, siteId],
                );
            } catch (error) {
                this.logger.error(`Error handling HTML${filter.filter}`, error);
            }
        }
    }

    /**
     * Check if a filter is enabled and should be applied.
     *
     * @param filter Filter to apply.
     * @param options Options passed to the filters.
     * @param site Site.
     * @param skipFilters Names of filters that shouldn't be applied.
     * @returns Whether the filter is enabled and should be applied.
     */
    isEnabledAndShouldApply(
        filter: CoreFilterFilter,
        options: CoreFilterFormatTextOptions,
        site: CoreSite,
        skipFilters?: string[],
    ): boolean {

        if (
            filter.localstate === CoreFilterStateValue.OFF ||
            (filter.localstate === CoreFilterStateValue.INHERIT && filter.inheritedstate === CoreFilterStateValue.OFF)
        ) {
            // Filter is disabled, ignore it.
            return false;
        }

        if (!this.shouldFilterBeApplied(filter, options, site)) {
            // Filter shouldn't be applied.
            return false;
        }

        if (skipFilters && skipFilters.indexOf(filter.filter) !== -1) {
            // Skip this filter.
            return false;
        }

        return true;
    }

    /**
     * Check if at least 1 filter should be applied in a certain site and with certain options.
     *
     * @param filters Filters to check.
     * @param options Options passed to the filters.
     * @param site Site. If not defined, current site.
     * @returns Promise resolved with true: whether the filter should be applied.
     */
    async shouldBeApplied(filters: CoreFilterFilter[], options: CoreFilterFormatTextOptions, site?: CoreSite): Promise<boolean> {
        // Wait for filters to be initialized.
        await this.waitForReady();
        const enabled = this.hasHandlers(true);
        if (!enabled) {
            return false;
        }

        return filters.some((filter) => this.shouldFilterBeApplied(filter, options, site));
    }

    /**
     * Check whether a filter should be applied in a certain site and with certain options.
     *
     * @param filter Filter to check.
     * @param options Options passed to the filters.
     * @param site Site. If not defined, current site.
     * @returns Whether the filter should be applied.
     */
    protected shouldFilterBeApplied(filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        if (!this.hasHandler(filter.filter, true)) {
            return false;
        }

        return !!(this.executeFunctionOnEnabled<boolean>(filter.filter, 'shouldBeApplied', [options, site]));
    }

}

export const CoreFilterDelegate = makeSingleton(CoreFilterDelegateService);
