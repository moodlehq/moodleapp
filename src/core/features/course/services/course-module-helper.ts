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
import { CoreAnyError, CoreError } from '@classes/errors/error';
import { CoreErrorHelper } from '@services/error-helper';
import { makeSingleton, Translate } from '@singletons';

/**
 * Service that provides some features regarding modules in a course.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModuleHelperService {

    /**
     * Get an activity by course module ID. Will throw an error if not found.
     *
     * @param activities List of activities.
     * @param cmId Course module ID.
     * @returns Activity.
     */
    getActivityByCmId<T extends { coursemodule: number }>(activities: T[] = [], cmId: number): T {
        const activity = activities.find((activity) => activity.coursemodule === cmId);

        if (!activity) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        return activity;
    }

    /**
     * Get an activity by key. Will throw an error if not found.
     * The template type T should have the field J as a numeric key.
     *
     * @param activities List of activities.
     * @param fieldName Field name to search by.
     * @param value Activity value to match the key.
     * @returns Activity.
     */
    getActivityByField<T extends Record<FieldName, unknown>, FieldName extends keyof T>(
        activities: T[] = [],
        fieldName: FieldName,
        value: number | string | boolean,
    ): T {
        const activity = activities.find((activity) => activity[fieldName] === value);

        if (!activity) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        return activity;
    }

    /**
     * Check if an error is a "module not found" error.
     *
     * @param error Error.
     * @returns Whether the error is a "module not found" error.
     */
    isNotFoundError(error: CoreAnyError): boolean {
        return CoreErrorHelper.getErrorMessageFromError(error) === Translate.instant('core.course.modulenotfound');
    }

}
export const CoreCourseModuleHelper = makeSingleton(CoreCourseModuleHelperService);
