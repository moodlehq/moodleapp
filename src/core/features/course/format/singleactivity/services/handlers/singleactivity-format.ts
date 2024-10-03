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

import { CoreCourseWSSection } from '@features/course/services/course';
import { CoreCourseFormatHandler } from '@features/course/services/format-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseFormatSingleActivityComponent } from '../../components/singleactivity';
import { makeSingleton } from '@singletons';

/**
 * Handler to support singleactivity course format.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatSingleActivityHandlerService implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatSingleActivity';
    format = 'singleactivity';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    canViewAllSections(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    displayBlocks(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    getCourseTitle(course: CoreCourseAnyCourseData, sections?: CoreCourseWSSection[]): string {
        if (sections?.[0]?.contents?.[0]) {
            return sections[0].contents[0].name;
        }

        return course.fullname || '';
    }

    /**
     * @inheritdoc
     */
    displayCourseIndex(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    displayRefresher(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean {
        if (sections?.[0]?.contents?.[0] && 'modname' in sections[0].contents[0]) {
            return CoreCourseModuleDelegate.displayRefresherInSingleActivity(sections[0].contents[0].modname);
        } else {
            return true;
        }
    }

    /**
     * @inheritdoc
     */
    async getCourseFormatComponent(): Promise<Type<unknown>> {
        return CoreCourseFormatSingleActivityComponent;
    }

    /**
     * @inheritdoc
     */
    async shouldRefreshWhenCompletionChanges(): Promise<boolean> {
        return false;
    }

}

export const CoreCourseFormatSingleActivityHandler = makeSingleton(CoreCourseFormatSingleActivityHandlerService);
