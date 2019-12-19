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
import { CoreFilterHandler } from './delegate';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from './filter';
import { CoreSite } from '@classes/site';

/**
 * Default handler used when the module doesn't have a specific implementation.
 */
@Injectable()
export class CoreFilterDefaultHandler implements CoreFilterHandler {
    name = 'CoreFilterDefaultHandler';
    filterName = 'default';

    constructor() {
        // Nothing to do.
    }

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(text: string, filter: CoreFilterFilter, options: CoreFilterFormatTextOptions, siteId?: string)
            : string | Promise<string> {
        return text;
    }

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
    handleHtml(container: HTMLElement, filter: CoreFilterFilter, options: CoreFilterFormatTextOptions,
            viewContainerRef: ViewContainerRef, component?: string, componentId?: string | number, siteId?: string)
            : void | Promise<void> {
        // To be overridden.
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @return Whether filter should be applied.
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        return true;
    }
}
