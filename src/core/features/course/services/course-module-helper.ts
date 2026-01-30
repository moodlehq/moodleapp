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
import { CoreEvents } from '@static/events';
import { CoreSites } from '@services/sites';
import { makeSingleton, Translate } from '@singletons';
import {
    CoreCourseViewedModulesDBPrimaryKeys,
    CoreCourseViewedModulesDBRecord,
    COURSE_VIEWED_MODULES_PRIMARY_KEYS,
    COURSE_VIEWED_MODULES_TABLE,
} from './database/course';
import { lazyMap, LazyMap } from '@/core/utils/lazy-map';
import { asyncInstance, AsyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { CoreArray } from '@static/array';
import { CORE_COURSE_CORE_MODULES } from '../constants';
import { ModFeature } from '@addons/mod/constants';
import { CoreCourseModuleSummary } from './course';
import { CoreCourseModuleData } from './course-helper';
import { CoreCourseModuleDelegate } from './module-delegate';
import { CoreWSExternalFile } from '@services/ws';

/**
 * Service that provides some features regarding a course.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModuleHelperService {

    protected viewedModulesTables: LazyMap<
        AsyncInstance<CoreDatabaseTable<CoreCourseViewedModulesDBRecord, CoreCourseViewedModulesDBPrimaryKeys, never>>
    >;

    constructor() {
        this.viewedModulesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable<CoreCourseViewedModulesDBRecord, CoreCourseViewedModulesDBPrimaryKeys, never>(
                    COURSE_VIEWED_MODULES_TABLE,
                    {
                        siteId,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        primaryKeyColumns: [...COURSE_VIEWED_MODULES_PRIMARY_KEYS],
                        rowIdColumn: null,
                        onDestroy: () => delete this.viewedModulesTables[siteId],
                    },
                ),
            ),
        );
    }

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

    /**
     * Get certain module viewed records in the app.
     *
     * @param ids Module IDs.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with map of last module viewed data.
     */
    async getCertainModulesViewed(ids: number[] = [], siteId?: string): Promise<Record<number, CoreCourseViewedModulesDBRecord>> {
        if (!ids.length) {
            return {};
        }

        const site = await CoreSites.getSite(siteId);
        const entries = await this.viewedModulesTables[site.getId()].getManyWhere({
            sql: `cmId IN (${ids.map(() => '?').join(', ')})`,
            sqlParams: ids,
            js: (record) => ids.includes(record.cmId),
        });

        return CoreArray.toObject(entries, 'cmId');
    }

    /**
     * Get all viewed modules in a course, ordered by timeaccess in descending order.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of viewed modules.
     */
    async getViewedModules(courseId: number, siteId?: string): Promise<CoreCourseViewedModulesDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return this.viewedModulesTables[site.getId()].getMany({ courseId }, {
            sorting: [
                { timeaccess: 'desc' },
            ],
        });
    }

    /**
     * Store activity as viewed.
     *
     * @param courseId Chapter ID.
     * @param cmId Module ID.
     * @param options Other options.
     * @returns Promise resolved with last chapter viewed, undefined if none.
     */
    async storeModuleViewed(courseId: number, cmId: number, options: CoreCourseStoreModuleViewedOptions = {}): Promise<void> {
        const site = await CoreSites.getSite(options.siteId);

        const timeaccess = options.timeaccess ?? Date.now();

        await this.viewedModulesTables[site.getId()].insert({
            courseId,
            cmId,
            sectionId: options.sectionId,
            timeaccess,
        });

        CoreEvents.trigger(CoreEvents.COURSE_MODULE_VIEWED, {
            courseId,
            cmId,
            timeaccess,
            sectionId: options.sectionId,
        }, site.getId());
    }

    /**
     * Get last module viewed in the app for a course.
     *
     * @param id Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with last module viewed data, undefined if none.
     */
    async getLastModuleViewed(id: number, siteId?: string): Promise<CoreCourseViewedModulesDBRecord | undefined> {
        const viewedModules = await this.getViewedModules(id, siteId);

        return viewedModules[0];
    }

    /**
     * Check if the module is a core module.
     *
     * @param moduleName The module name.
     * @returns Whether it's a core module.
     */
    isCoreModule(moduleName: string): boolean {
        // If core modules are removed for a certain version we should check the version of the site.
        return CORE_COURSE_CORE_MODULES.includes(moduleName);
    }

    /**
     * Returns the source to a module icon.
     *
     * @param moduleName The module name.
     * @param modicon The mod icon string to use in case we are not using a core activity.
     * @returns The IMG src.
     */
    getModuleIconSrc(moduleName: string, modicon?: string, mimetypeIcon = ''): string {
        if (mimetypeIcon) {
            return mimetypeIcon;
        }

        if (!this.isCoreModule(moduleName)) {
            if (modicon) {
                return modicon;
            }

            moduleName = 'external-tool';
        }

        const path = this.getModuleIconsPath();

        // Use default icon on core modules.
        return `${path + moduleName  }.svg`;
    }

    /**
     * Get the path where the module icons are stored.
     *
     * @returns Path.
     */
    getModuleIconsPath(): string {
        if (!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            // @deprecatedonmoodle since 3.11.
            return 'assets/img/mod_legacy/';
        }

        if (!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.4')) {
            // @deprecatedonmoodle since 4.3.
            return 'assets/img/mod_40/';
        }

        return 'assets/img/mod/';
    }

    /**
     * Check if a module has a view page. E.g. labels don't have a view page.
     *
     * @param module The module object.
     * @returns Whether the module has a view page.
     */
    moduleHasView(module: CoreCourseModuleSummary | CoreCourseModuleData): boolean {
        if ('modname' in module) {
            // noviewlink was introduced in 3.8.5, use supports feature as a fallback.
            if (module.noviewlink ||
                CoreCourseModuleDelegate.supportsFeature(module.modname, ModFeature.NO_VIEW_LINK, false)) {
                return false;
            }
        }

        return !!module.url;
    }

    /**
     * Translate a module name to current language.
     *
     * @param moduleName The module name.
     * @param fallback Fallback text to use if not translated. Will use moduleName otherwise.
     * @returns Translated name.
     */
    translateModuleName(moduleName: string, fallback?: string): string {
        const langKey = `core.mod_${moduleName}`;
        const translated = Translate.instant(langKey);

        return translated !== langKey ?
            translated :
            (fallback || moduleName);
    }

}
export const CoreCourseModuleHelper = makeSingleton(CoreCourseModuleHelperService);

/**
 * Options for storeModuleViewed.
 */
export type CoreCourseStoreModuleViewedOptions = {
    sectionId?: number;
    timeaccess?: number;
    siteId?: string;
};

/**
 * Common data returned by get modules by course function.
 * This relates to LMS helper_for_get_mods_by_courses::standard_coursemodule_elements_returns,
 * do not modify unless the exporter changes.
 * This is not implemented as an exporter in LMS right now.
 */
export type CoreCourseModuleStandardElements = {
    id: number; // Activity instance id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Activity name.
    intro?: string; // Activity introduction.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN, or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    section?: number; // Course section id.
    visible?: boolean; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
    lang?: string; // @since 4.1. Forced activity language.
};
