// (C) Copyright 2015 Martin Dougiamas
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
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSite } from '../../../classes/site';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider } from '../../../providers/utils/utils';

/**
 * Service to provide grade functionalities.
 */
@Injectable()
export class CoreGradesProvider {
    protected ROOT_CACHE_KEY = 'mmGrades:';

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('CoreGradesProvider');
    }

    /**
     * Get cache key for courses grade WS calls.
     *
     * @return {string}   Cache key.
     */
    protected getCoursesGradesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'coursesgrades';
    }

    /**
     * Get the grades for a certain course.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise to be resolved when the grades are retrieved.
     */
    getCoursesGrades(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            this.logger.debug('Get course grades');

            const preSets = {
                cacheKey: this.getCoursesGradesCacheKey()
            };

            return site.read('gradereport_overview_get_course_grades', undefined, preSets).then((data) => {
                if (data && data.grades) {
                    return data.grades;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates courses grade data WS calls.
     *
     * @param {string} [siteId]   Site id (empty for current site).
     * @return {Promise<any>}     Promise resolved when the data is invalidated.
     */
    invalidateCoursesGradesData(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCoursesGradesCacheKey());
        });
    }

    /**
     * Returns whether or not the plugin is enabled for a certain site.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>}  Resolve with true if plugin is enabled, false otherwise.
     * @since  Moodle 3.2
     */
    isCourseGradesEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.wsAvailable('gradereport_overview_get_course_grades')) {
                return false;
            }
            // Now check that the configurable mygradesurl is pointing to the gradereport_overview plugin.
            const url = site.getStoredConfig('mygradesurl') || '';

            return url.indexOf('/grade/report/overview/') !== -1;
        });
    }

    /**
     * Log Courses grades view in Moodle.
     *
     * @param  {number}  courseId Course ID.
     * @return {Promise<any>}     Promise resolved when done.
     */
    logCoursesGradesView(courseId?: number): Promise<any> {
        if (!courseId) {
            courseId = this.sitesProvider.getCurrentSiteHomeId();
        }

        return this.sitesProvider.getCurrentSite().write('gradereport_overview_view_grade_report', {
            courseid: courseId
        });
    }
}
