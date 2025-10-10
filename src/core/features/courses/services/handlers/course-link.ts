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

import { Injectable } from '@angular/core';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { Params } from '@angular/router';
import { CoreCoursesLinksHandlerBase } from '@features/courses/services/handlers/base-link-handler';

/**
 * Handler to treat links to course view or enrol (except site home).
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesCourseLinkHandlerService extends CoreCoursesLinksHandlerBase {

    name = 'CoreCoursesCourseLinkHandler';
    pattern = /((\/enrol\/index\.php)|(\/course\/enrol\.php)|(\/course\/view\.php)).*([?&]id=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const courseId = parseInt(params.id, 10);
        const sectionId = params.sectionid ? parseInt(params.sectionid, 10) : undefined;
        let sectionNumber = params.section !== undefined ? parseInt(params.section, 10) : undefined;

        if (!sectionId && !sectionNumber) {
            // Check if the URL has a hash to navigate to the section.
            const matches = url.match(/#section-(\d+)/);
            if (matches && matches[1]) {
                sectionNumber = parseInt(matches[1], 10);
            }
        }

        const pageParams: Params = {};
        if (sectionId !== undefined && !isNaN(sectionId)) {
            pageParams.sectionId = sectionId;
        } else if (sectionNumber !== undefined && !isNaN(sectionNumber)) {
            pageParams.sectionNumber = sectionNumber;
        } else {
            const matches = url.match(/#inst(\d+)/);

            if (matches && matches[1]) {
                pageParams.blockInstanceId = parseInt(matches[1], 10);
            }
        }

        return this.getCourseActions(url, courseId, pageParams);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        const courseId = parseInt(params.id, 10);

        if (!courseId) {
            return false;
        }

        // Get the course id of Site Home.
        return CoreSites.getSiteHomeId(siteId).then((siteHomeId) => courseId != siteHomeId);
    }

}

export const CoreCoursesCourseLinkHandler = makeSingleton(CoreCoursesCourseLinkHandlerService);
