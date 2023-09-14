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

import { Params } from '@angular/router';
import { CorePaginatedItemsManagerSource } from './paginated-items-manager-source';

/**
 * Routed items collection source data.
 */
export abstract class CoreRoutedItemsManagerSource<Item = unknown> extends CorePaginatedItemsManagerSource<Item> {

    /**
     * Get a string to identify instances constructed with the given arguments as being reusable.
     *
     * @param args Constructor arguments.
     * @returns Id.
     */
    static getSourceId(...args: unknown[]): string {
        return args.map(argument => String(argument)).join('-');
    }

    /**
     * Get the query parameters to use when navigating to an item page.
     *
     * @param item Item.
     * @returns Query parameters to use when navigating to the item page.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getItemQueryParams(item: Item): Params {
        return {};
    }

    /**
     * Get the path to use when navigating to an item page.
     *
     * @param item Item.
     * @returns Path to use when navigating to the item page.
     */
    abstract getItemPath(item: Item): string;

}
