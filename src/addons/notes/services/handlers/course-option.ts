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
import { CoreCourseProvider } from '@features/course/services/course';
import {
    CoreCourseAccess,
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseData, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';
import { AddonNotes } from '../notes';

/**
 * Handler to inject an option into the course main menu.
 */
@Injectable( { providedIn: 'root' } )
export class AddonNotesCourseOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'AddonNotes';
    priority = 200;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonNotes.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        if (accessData && accessData.type === CoreCourseProvider.ACCESS_GUEST) {
            return false; // Not enabled for guest access.
        }

        if (navOptions && navOptions.notes !== undefined) {
            return navOptions.notes;
        }

        return AddonNotes.isPluginViewNotesEnabledForCourse(courseId);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData {
        return {
            title: 'addon.notes.notes',
            class: 'addon-notes-course-handler',
            page: 'notes',
        };
    }

    /**
     * @inheritdoc
     */
    async prefetch(course: CoreCourseAnyCourseData): Promise<void> {
        await AddonNotes.getNotes(course.id, undefined, true);
    }

}
export const AddonNotesCourseOptionHandler = makeSingleton(AddonNotesCourseOptionHandlerService);
