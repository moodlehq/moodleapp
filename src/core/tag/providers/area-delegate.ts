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

import { Injectable, Injector } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';

/**
 * Interface that all tag area handlers must implement.
 */
export interface CoreTagAreaHandler extends CoreDelegateHandler {
    /**
     * Component and item type separated by a slash. E.g. 'core/course_modules'.
     * @type {string}
     */
    type: string;

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param {string} content Rendered content.
     * @return {any[]|Promise<any[]>} Area items (or promise resolved with the items).
     */
    parseContent(content: string): any[] | Promise<any[]>;

    /**
     * Get the component to use to display items.
     *
     * @param {Injector} injector Injector.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any>;
}

/**
 * Delegate to register tag area handlers.
 */
@Injectable()
export class CoreTagAreaDelegate extends CoreDelegate {

    protected handlerNameProperty = 'type';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider) {
        super('CoreTagAreaDelegate', logger, sitesProvider, eventsProvider);
    }

    /**
     * Returns the display name string for this area.
     *
     * @param {string} component Component name.
     * @param {string} itemType Item type.
     * @return {string} String key.
     */
    getDisplayNameKey(component: string, itemType: string): string {
        return (component == 'core' ? 'core.tag' : 'addon.' + component) + '.tagarea_' + itemType;
    }

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param {string} component Component name.
     * @param {string} itemType Item type.
     * @param {string} content Rendered content.
     * @return {Promise<any[]>} Promise resolved with the area items, or undefined if not found.
     */
    parseContent(component: string, itemType: string, content: string): Promise<any[]> {
        const type = component + '/' + itemType;

        return Promise.resolve(this.executeFunctionOnEnabled(type, 'parseContent', [content]));
    }

    /**
     * Get the component to use to display an area item.
     *
     * @param {string} component Component name.
     * @param {string} itemType Item type.
     * @param {Injector} injector Injector.
     * @return {Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(component: string, itemType: string, injector: Injector): Promise<any> {
        const type = component + '/' + itemType;

        return Promise.resolve(this.executeFunctionOnEnabled(type, 'getComponent', [injector]));
    }
}
