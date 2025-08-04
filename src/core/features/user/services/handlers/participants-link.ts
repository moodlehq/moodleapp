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

import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CORE_PARTICIPANTS_COURSE_OPTION_NAME } from '@features/user/constants';
import { makeSingleton } from '@singletons';

/**
 * Handler to treat links to course participants.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserParticipantsLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreUserParticipantsLinkHandler';
    pattern = /\/user\/index\.php.*([?&]id=)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const courseIdentifier = courseId || Number(params.id);

        return [{
            action: async (siteId): Promise<void> => {
                await CoreCourseHelper.getAndOpenCourse(
                    courseIdentifier,
                    { selectedTab: CORE_PARTICIPANTS_COURSE_OPTION_NAME },
                    siteId,
                );
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

export const CoreUserParticipantsLinkHandler = makeSingleton(CoreUserParticipantsLinkHandlerService);
