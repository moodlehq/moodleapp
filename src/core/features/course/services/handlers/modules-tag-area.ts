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

import { CoreTagAreaHandler } from '@features/tag/services/tag-area-delegate';
import { CoreTagFeedElement, CoreTagHelper } from '@features/tag/services/tag-helper';
import { CoreTagFeedComponent } from '@features/tag/components/feed/feed';
import { makeSingleton } from '@singletons';

/**
 * Handler to support tags.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModulesTagAreaHandlerService implements CoreTagAreaHandler {

    name = 'CoreCourseModulesTagAreaHandler';
    type = 'core/course_modules';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param content Rendered content.
     * @return Area items (or promise resolved with the items).
     */
    parseContent(content: string): CoreTagFeedElement[] | Promise<CoreTagFeedElement[]> {
        return CoreTagHelper.parseFeedContent(content);
    }

    /**
     * Get the component to use to display items.
     *
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> | Promise<Type<unknown>> {
        return CoreTagFeedComponent;
    }

}

export const CoreCourseModulesTagAreaHandler = makeSingleton(CoreCourseModulesTagAreaHandlerService);
