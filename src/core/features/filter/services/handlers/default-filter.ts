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

import { CoreFilterHandler } from '../filter-delegate';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '../filter';
import { CoreSite } from '@classes/sites/site';

/**
 * Default handler used when the module doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class CoreFilterDefaultHandler implements CoreFilterHandler {

    name = 'CoreFilterDefaultHandler';
    filterName = 'default';

    /**
     * @inheritdoc
     */
    filter(
        text: string,
        filter: CoreFilterFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
        options: CoreFilterFormatTextOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): string | Promise<string> {
        return text;
    }

    /**
     * @inheritdoc
     */
    handleHtml(
        container: HTMLElement, // eslint-disable-line @typescript-eslint/no-unused-vars
        filter: CoreFilterFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
        options: CoreFilterFormatTextOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
        viewContainerRef: ViewContainerRef, // eslint-disable-line @typescript-eslint/no-unused-vars
        component?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId?: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {
        // To be overridden.
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        return true;
    }

}
