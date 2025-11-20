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
import { CoreCourse } from './course';
import { CoreCourseModuleDelegate } from './module-delegate';
import { CoreCourseForceLanguageSource } from '../constants';

/**
 * Service that provides some features regarding course and module forced languages.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseForceLanguageService {

    protected lastNavigationCheck: {
        courseId: number;
        courseLang: string | undefined;
        cmId: number;
        cmLang: string | undefined;
        timestamp: number;
    } = {
        courseId: 0,
        courseLang: undefined,
        cmId: 0,
        cmLang: undefined,
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
                    lang = await this.getForcedLanguageFromRoute(routeData.checkForcedLanguage);
                }

                if (currentNavigationCheck === this.lastNavigationCheck.timestamp) {
                    await CoreLang.forceContextLanguage(lang);
                }
            });
    }

    /**
     * Get forced language from route.
     *
     * @param source Forced language source.
     * @returns Language code if forced.
     */
    protected async getForcedLanguageFromRoute(source: CoreCourseForceLanguageSource): Promise<string | undefined> {
        let course = CoreNavigator.getRouteParam<CoreCourseSearchedData>('course');
        let courseId = course?.id ?? CoreNavigator.getRouteNumberParam('courseId');

        if (!courseId) {
            // Not in a course/module, empty the cache and return.
            this.lastNavigationCheck.courseId = 0;
            this.lastNavigationCheck.courseLang = undefined;
            this.lastNavigationCheck.cmId = 0;
            this.lastNavigationCheck.cmLang = undefined;

            return;
        }

        if (source === CoreCourseForceLanguageSource.MODULE) {
            const modLang = await this.getModuleForcedLangFromRoute(courseId);
            if (modLang) {
                return modLang;
            }
        } else {
            this.lastNavigationCheck.cmId = 0;
            this.lastNavigationCheck.cmLang = undefined;
        }

        let lang: string | undefined = undefined;
        if (this.lastNavigationCheck.courseId === courseId) {
            lang = this.lastNavigationCheck.courseLang;
        } else if (course?.lang !== undefined) {
            lang = course.lang;
        } else {
            try {
                course = await
                    CoreCourses.getCourseByField('id', courseId, { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE });
                lang = course.lang;
            } catch {
                lang = undefined;
                courseId = 0;
            }
        }

        this.lastNavigationCheck.courseId = courseId;
        this.lastNavigationCheck.courseLang = lang;

        return lang;
    }

    /**
     * Get module forced language from route.
     *
     * @param courseId Course ID of the module.
     * @returns Module forced language if found.
     */
    protected async getModuleForcedLangFromRoute(courseId: number): Promise<string | undefined> {
        const cmId = CoreNavigator.getRouteNumberParam('cmId');
        let lang: string | undefined = undefined;
        if (cmId) {
            if (this.lastNavigationCheck.cmId === cmId) {
                lang = this.lastNavigationCheck.cmLang;
            } else {
                // TODO: In the future this should directly return the module language instead of checking the delegate.
                // See: MDL-87241
                const module = await CorePromiseUtils.ignoreErrors(
                    CoreCourse.getModule(cmId, courseId, undefined, true),
                );

                if (module) {
                    lang = await CorePromiseUtils.ignoreErrors(
                        CoreCourseModuleDelegate.getModuleForcedLang(module),
                    );
                }
            }
        }

        this.lastNavigationCheck.cmId = cmId ?? 0;
        this.lastNavigationCheck.cmLang = lang;

        return lang;
    }

}
export const CoreCourseForceLanguage = makeSingleton(CoreCourseForceLanguageService);
