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

import { Injectable, Injector } from '@angular/core';
import { CoreTagAreaHandler } from '@core/tag/providers/area-delegate';
import { CoreTagHelperProvider } from '@core/tag/providers/helper';
import { CoreTagFeedComponent } from '@core/tag/components/feed/feed';
import { AddonModDataProvider } from './data';

/**
 * Handler to support tags.
 */
@Injectable()
export class AddonModDataTagAreaHandler implements CoreTagAreaHandler {
    name = 'AddonModDataTagAreaHandler';
    type = 'mod_data/data_records';

    constructor(private tagHelper: CoreTagHelperProvider, private dataProvider: AddonModDataProvider) {}

    /**
     * Whether or not the handler is enabled on a site level.
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.dataProvider.isPluginEnabled();
    }

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param content Rendered content.
     * @return Area items (or promise resolved with the items).
     */
    parseContent(content: string): any[] | Promise<any[]> {
        return this.tagHelper.parseFeedContent(content);
    }

    /**
     * Get the component to use to display items.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any> {
        return CoreTagFeedComponent;
    }
}
