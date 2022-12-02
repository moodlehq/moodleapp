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

import { Injectable, Type } from '@angular/core';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { makeSingleton } from '@singletons';

/**
 * Interface that all tag area handlers must implement.
 */
export interface CoreTagAreaHandler extends CoreDelegateHandler {
    /**
     * Component and item type separated by a slash. E.g. 'core/course_modules'.
     */
    type: string;

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param content Rendered content.
     * @returns Area items (or promise resolved with the items).
     */
    parseContent(content: string): unknown[] | Promise<unknown[]>;

    /**
     * Get the component to use to display items.
     *
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> | Promise<Type<unknown>>;
}

/**
 * Delegate to register tag area handlers.
 */
@Injectable({ providedIn: 'root' })
export class CoreTagAreaDelegateService extends CoreDelegate<CoreTagAreaHandler> {

    protected handlerNameProperty = 'type';

    constructor() {
        super('CoreTagAreaDelegate', true);
    }

    /**
     * Returns the display name string for this area.
     *
     * @param component Component name.
     * @param itemType Item type.
     * @returns String key.
     */
    getDisplayNameKey(component: string, itemType: string): string {
        return (component == 'core' ? 'core.tag' : 'addon.' + component) + '.tagarea_' + itemType;
    }

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param component Component name.
     * @param itemType Item type.
     * @param content Rendered content.
     * @returns Promise resolved with the area items, or undefined if not found.
     */
    async parseContent(component: string, itemType: string, content: string): Promise<unknown[] | undefined> {
        const type = component + '/' + itemType;

        return this.executeFunctionOnEnabled(type, 'parseContent', [content]);
    }

    /**
     * Get the component to use to display an area item.
     *
     * @param component Component name.
     * @param itemType Item type.
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    async getComponent(component: string, itemType: string): Promise<Type<unknown> | undefined> {
        const type = component + '/' + itemType;

        return this.executeFunctionOnEnabled(type, 'getComponent');
    }

}

export const CoreTagAreaDelegate = makeSingleton(CoreTagAreaDelegateService);
