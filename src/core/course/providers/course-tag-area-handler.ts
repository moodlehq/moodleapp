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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTagAreaHandler } from '@core/tag/providers/area-delegate';
import { CoreCourseTagAreaComponent } from '../components/tag-area/tag-area';

/**
 * Handler to support tags.
 */
@Injectable()
export class CoreCourseTagAreaHandler implements CoreTagAreaHandler {
    name = 'CoreCourseTagAreaHandler';
    type = 'core/course';

    constructor(private domUtils: CoreDomUtilsProvider) {}

    /**
     * Whether or not the handler is enabled on a site level.
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param content Rendered content.
     * @return Area items (or promise resolved with the items).
     */
    parseContent(content: string): any[] | Promise<any[]> {
        const items = [];
        const element = this.domUtils.convertToElement(content);

        Array.from(element.querySelectorAll('div.coursebox')).forEach((coursebox) => {
            const courseId = parseInt(coursebox.getAttribute('data-courseid'), 10);
            const courseLink = coursebox.querySelector('.coursename > a');
            const categoryLink = coursebox.querySelector('.coursecat > a');

            if (courseId > 0 && courseLink) {
                items.push({
                    courseId,
                    courseName: courseLink.innerHTML,
                    categoryName: categoryLink ? categoryLink.innerHTML : null
                });
            }
        });

        return items;
    }

    /**
     * Get the component to use to display items.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any> {
        return CoreCourseTagAreaComponent;
    }
}
