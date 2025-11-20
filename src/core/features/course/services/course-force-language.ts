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
import { ActivatedRoute, NavigationEnd } from '@angular/router';

import { CoreSitesReadingStrategy } from '@services/sites';
import { makeSingleton, Router } from '@singletons';
import {
    CoreCourses,
    CoreCourseSearchedData,
} from '../../courses/services/courses';
import { CoreNavigator } from '@services/navigator';
import { filter } from 'rxjs/operators';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreLang } from '@services/lang';

/**
 * Service that provides some features regarding course and module forced languages.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseForceLanguageService {

    protected lastNavigationCheck: {
        courseId: number;
        courseLang: string | undefined;
        timestamp: number;
    } = {
        courseId: 0,
        courseLang: undefined,
        timestamp: 0,
    };

    /**
     * Initialize.
     */
    initialize(): void {
        Router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(async () => {
                this.lastNavigationCheck.timestamp = Date.now();
                const currentNavigationCheck = this.lastNavigationCheck.timestamp;

                let route: ActivatedRoute | null = CoreNavigator.getCurrentRoute();
                let routeData = CoreNavigator.getRouteData(route);
                while (!routeData.checkForcedLanguage && route) {
                    route = route.parent;
                    routeData = route ? CoreNavigator.getRouteData(route) : {};
                }

                let lang: string | undefined = undefined;
                if (route && routeData.checkForcedLanguage) {
                    lang = await this.getForcedLanguageFromRoute();
                }

                if (currentNavigationCheck === this.lastNavigationCheck.timestamp) {
                    await CoreLang.forceCourseLanguage(lang);
                }
            });
    }

    /**
     * Get forced language from route.
     *
     * @returns Language code if forced.
     */
    protected async getForcedLanguageFromRoute(): Promise<string | undefined> {
        let course = CoreNavigator.getRouteParam<CoreCourseSearchedData>('course');
        if (course?.lang !== undefined) {
            this.lastNavigationCheck.courseLang = course.lang;
            this.lastNavigationCheck.courseId = course.id;

            return course.lang;
        }

        const courseId = CoreNavigator.getRouteNumberParam('courseId');
        if (!courseId) {
            // Not in a course/module, empty the cache and return.
            this.lastNavigationCheck.courseId = 0;
            this.lastNavigationCheck.courseLang = undefined;

            return;
        }

        if (this.lastNavigationCheck.courseId === courseId) {
            return this.lastNavigationCheck.courseLang;
        }
        this.lastNavigationCheck.courseId = courseId;

        course = await CorePromiseUtils.ignoreErrors(
            CoreCourses.getCourseByField('id', courseId, { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE }),
        );

        this.lastNavigationCheck.courseLang = course?.lang;

        return course?.lang;
    }

}
export const CoreCourseForceLanguage = makeSingleton(CoreCourseForceLanguageService);
