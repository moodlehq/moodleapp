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
import { makeSingleton } from '@singletons';
import { CoreSite } from '@classes/sites/site';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreEnrolAction, CoreEnrolDelegate } from './enrol-delegate';

/**
 * Service that provides functions for enrolment plugins.
 */
@Injectable({ providedIn: 'root' })
export class CoreEnrolService {

    protected static readonly ROOT_CACHE_KEY = 'CoreEnrol:';

    /**
     * Get the enrolment methods from a course.
     * Please notice that this function will only return methods that implement get_enrol_info, it won't return all
     * enrolment methods in a course.
     *
     * @param courseId ID of the course.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the methods.
     */
    async getCourseEnrolmentMethods(courseId: number, siteId?: string): Promise<CoreEnrolEnrolmentMethod[]> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreEnrolGetCourseEnrolmentMethodsWSParams = {
            courseid: courseId,
        };
        const preSets = {
            cacheKey: this.getCourseEnrolmentMethodsCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        return site.read<CoreEnrolGetCourseEnrolmentMethodsWSResponse>('core_enrol_get_course_enrolment_methods', params, preSets);
    }

    /**
     * Get the enrolment methods from a course that are enabled and supported by the app.
     * Please notice that this function will only return methods that implement get_enrol_info, it won't return all
     * enrolment methods in a course.
     *
     * @param courseId ID of the course.
     * @param options Options.
     * @returns Promise resolved with the methods.
     */
    async getSupportedCourseEnrolmentMethods(
        courseId: number,
        options: CoreEnrolGetSupportedMethodsOptions = {},
    ): Promise<CoreEnrolEnrolmentMethod[]> {
        const methods = await CoreEnrol.getCourseEnrolmentMethods(courseId, options.siteId);

        return methods.filter((method) => {
            if (options.type && method.type !== options.type) {
                return false;
            }

            return CoreEnrolDelegate.isEnrolSupported(method.type) && CoreUtils.isTrueOrOne(method.status) &&
                (!options.action || CoreEnrolDelegate.getEnrolmentAction(method.type) === options.action);
        });
    }

    /**
     * Get cache key for get course enrolment methods WS call.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getCourseEnrolmentMethodsCacheKey(courseId: number): string {
        return CoreEnrolService.ROOT_CACHE_KEY + 'enrolmentmethods:' + courseId;
    }

    /**
     * Invalidates get course enrolment methods WS call.
     *
     * @param courseId Course ID.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCourseEnrolmentMethods(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await Promise.all([
            site.invalidateWsCacheForKey(this.getCourseEnrolmentMethodsCacheKey(courseId)),
            site.invalidateWsCacheForKey(`mmCourses:enrolmentmethods:${courseId}`), // @todo 4.4 Remove after 4.3 release.
        ]);
    }

}

export const CoreEnrol = makeSingleton(CoreEnrolService);

/**
 * Params of core_enrol_get_course_enrolment_methods WS.
 */
type CoreEnrolGetCourseEnrolmentMethodsWSParams = {
    courseid: number; // Course id.
};

/**
 * Data returned by core_enrol_get_course_enrolment_methods WS.
 */
type CoreEnrolGetCourseEnrolmentMethodsWSResponse = CoreEnrolEnrolmentMethod[];

/**
 * Course enrolment method.
 */
export type CoreEnrolEnrolmentMethod = CoreEnrolEnrolmentInfo & {
    wsfunction?: string; // Webservice function to get more information.
    status: string; // Status of enrolment plugin. True if successful, else error message or false.
};

/**
 * Course enrolment basic info.
 */
export type CoreEnrolEnrolmentInfo = {
    id: number; // Id of course enrolment instance.
    courseid: number; // Id of course.
    type: string; // Type of enrolment plugin.
    name: string; // Name of enrolment plugin.
};

export type CoreEnrolGetSupportedMethodsOptions = {
    type?: string; // If set, only get methods of a certain type.
    action?: CoreEnrolAction; // If set, only get methods that use a certain action.
    siteId?: string; // Site ID. If not defined, use current site.
};
