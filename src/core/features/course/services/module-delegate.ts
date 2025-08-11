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
import { SafeUrl } from '@angular/platform-browser';

import { CoreSite } from '@classes/sites/site';
import { CoreCourseModuleDefaultHandler } from './handlers/default-module';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourse } from './course';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreCourseModuleData } from './course-helper';
import { CoreNavigationOptions } from '@services/navigator';
import { CoreIonicColorNames } from '@singletons/colors';
import { DownloadStatus } from '@/core/constants';

/**
 * Interface that all course module handlers must implement.
 */
export interface CoreCourseModuleHandler extends CoreDelegateHandler {
    /**
     * Name of the module. It should match the "modname" of the module returned in core_course_get_contents.
     */
    modName: string;

    /**
     * List of supported features. The keys should be the name of the feature.
     * This is to replicate the "plugin_supports" function of Moodle.
     * If you need some dynamic checks please implement the supportsFeature function.
     */
    supportedFeatures?: Record<string, unknown>;

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @returns Data to render the module.
     */
    getData(
        module: CoreCourseModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): Promise<CoreCourseModuleHandlerData> | CoreCourseModuleHandlerData;

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course object.
     * @param module The module object.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    getMainComponent(course: CoreCourseAnyCourseData, module: CoreCourseModuleData): Promise<Type<unknown> | undefined>;

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @returns Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity?(): boolean;

    /**
     * Get the icon src for the module.
     *
     * @param module Module to get the icon from.
     * @param modicon The mod icon string.
     * @returns The icon src.
     */
    getIconSrc?(module?: CoreCourseModuleData, modicon?: string): Promise<string | undefined> | string | undefined;

    /**
     * Check whether the icon should be treated as a shape or a rich image.
     *
     * @param module Module to get the icon from.
     * @param modicon The mod icon string.
     * @returns Whether the icon should be treated as a shape.
     * @deprecated since 4.3. Now it uses platform information. This function is not used anymore.
     */
    iconIsShape?(module?: CoreCourseModuleData, modicon?: string): Promise<boolean | undefined> | boolean | undefined;

    /**
     * Check if this type of module supports a certain feature.
     * If this function is implemented, the supportedFeatures object will be ignored.
     *
     * @param feature The feature to check.
     * @returns The result of the supports check.
     */
    supportsFeature?(feature: string): unknown;

    /**
     * Return true to show the manual completion regardless of the course's showcompletionconditions setting.
     * Returns false by default.
     *
     * @param module Module.
     * @returns Promise resolved with boolean: whether the manual completion should always be displayed.
     */
    manualCompletionAlwaysShown?(module: CoreCourseModuleData): Promise<boolean>;

    /**
     * Opens the activity page.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param options Options for the navigation.
     * @returns Promise resolved when done.
     */
    openActivityPage(module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void>;

    /**
     * Whether the activity is branded.
     * This information is used, for instance, to decide if a filter should be applied to the icon or not.
     *
     * @returns bool True if the activity is branded, false otherwise.
     */
    isBranded?(): Promise<boolean>;
}

/**
 * Data needed to render the module in course contents.
 */
export interface CoreCourseModuleHandlerData {
    /**
     * The title to display in the module.
     */
    title: string;

    /**
     * The accessibility title to use in the module. If not provided, title will be used.
     */
    a11yTitle?: string;

    /**
     * The image to use as icon (path to the image).
     */
    icon?: string | SafeUrl;

    /**
     * The class to assign to the item.
     */
    class?: string;

    /**
     * The text to show in an extra badge.
     */
    extraBadge?: string;

    /**
     * The color of the extra badge. Default: primary.
     *
     * @deprecated since 4.3 Not used anymore.
     */
    extraBadgeColor?: CoreIonicColorNames;

    /**
     * Extra content to display (e.g., file previews).
     */
    extraContent?: string;

    /**
     * Whether to display a button to download/refresh the module if it's downloadable.
     * If it's set to true, the app will show a download/refresh button when needed and will handle the download of the
     * module using CoreCourseModulePrefetchDelegate.
     */
    showDownloadButton?: boolean;

    /**
     * Wether activity has the custom cmlist item flag enabled.
     *
     * Activities like label uses this flag to indicate that it should be
     * displayed as a custom course item instead of a tipical activity card.
     */
    hasCustomCmListItem?: boolean;

    /**
     * The buttons to display in the module item.
     *
     * @deprecated since 4.3 Use button instead. It will only display the first.
     */
    buttons?: CoreCourseModuleHandlerButton[];

    /**
     * The button to display in the module item.
     */
    button?: CoreCourseModuleHandlerButton;

    /**
     * Whether to display a spinner where the download button is displayed. The module icon, title, etc. will be displayed.
     */
    spinner?: boolean;

    /**
     * Whether the data is being loaded. If true, it will display a spinner in the whole module, nothing else will be shown.
     */
    loading?: boolean;

    /**
     * Action to perform when the module is clicked.
     *
     * @param event The click event.
     * @param module The module object.
     * @param courseId The course ID.
     * @param options Options for the navigation.
     * @returns Promise resolved when done.
     */
    action?(event: Event, module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void> | void;

    /**
     * Updates the status of the module.
     *
     * @param status Module status.
     */
    updateStatus?(status: DownloadStatus): void;

    /**
     * On Destroy function in case it's needed.
     */
    onDestroy?(): void;
}

/**
 * Interface that all the components to render the module in singleactivity must implement.
 */
export interface CoreCourseModuleMainComponent {
    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param showErrors If show errors to the user of hide them.
     * @returns Promise resolved when done.
     */
    doRefresh(refresher?: HTMLIonRefresherElement | null, showErrors?: boolean): Promise<void>;
}

/**
 * A button to display in a module item.
 */
export interface CoreCourseModuleHandlerButton {
    /**
     * The label to add to the button.
     */
    label: string;

    /**
     * The name of the button icon.
     */
    icon: string;

    /**
     * Whether the button should be hidden.
     */
    hidden?: boolean;

    /**
     * Action to perform when the button is clicked.
     *
     * @param event The click event.
     * @param module The module object.
     * @param courseId The course ID.
     * @param options Options for the navigation.
     * @returns Promise resolved when done.
     */
    action(event: Event, module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void> | void;
}

/**
 * Delegate to register module handlers.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModuleDelegateService extends CoreDelegate<CoreCourseModuleHandler> {

    protected featurePrefix = 'CoreCourseModuleDelegate_';
    protected handlerNameProperty = 'modName';

    constructor(protected defaultHandler: CoreCourseModuleDefaultHandler) {
        super('CoreCourseModuleDelegate');
    }

    /**
     * Get the component to render the module.
     *
     * @param course The course object.
     * @param module The module object.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    async getMainComponent(course: CoreCourseAnyCourseData, module: CoreCourseModuleData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(module.modname, 'getMainComponent', [course, module]);
        } catch (error) {
            this.logger.error('Error getting main component', error);
        }
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param modname The name of the module type.
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @returns Data to render the module.
     */
    async getModuleDataFor(
        modname: string,
        module: CoreCourseModuleData,
        courseId: number,
        sectionId?: number,
        forCoursePage?: boolean,
    ): Promise<CoreCourseModuleHandlerData | undefined> {
        const data = await this.executeFunctionOnEnabled<CoreCourseModuleHandlerData>(
            modname,
            'getData',
            [module, courseId, sectionId, forCoursePage],
        );

        if (data) {
            data.showDownloadButton = data.showDownloadButton ?? true;
        }

        return data;
    }

    /**
     * Opens the activity page.
     *
     * @param modname The name of the module type.
     * @param module The module object.
     * @param courseId The course ID.
     * @param options Options for the navigation.
     * @returns Promise resolved when done.
     */
    async openActivityPage(
        modname: string,
        module: CoreCourseModuleData,
        courseId: number,
        options?: CoreNavigationOptions,
    ): Promise<void> {
        return this.executeFunctionOnEnabled<void>(
            modname,
            'openActivityPage',
            [module, courseId, options],
        );
    }

    /**
     * Check if a certain module type is disabled in a site.
     *
     * @param modname The name of the module type.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether module is disabled.
     */
    async isModuleDisabled(modname: string, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isModuleDisabledInSite(modname, site);
    }

    /**
     * Check if a certain module type is disabled in a site.
     *
     * @param modname The name of the module type.
     * @param site Site. If not defined, use current site.
     * @returns Whether module is disabled.
     */
    isModuleDisabledInSite(modname: string, site?: CoreSite): boolean {
        const handler = this.getHandler(modname, false);

        if (handler) {
            site = site || CoreSites.getCurrentSite();

            if (!site) {
                return true;
            }

            return this.isFeatureDisabled(handler, site);
        }

        return false;
    }

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @param modname The name of the module type.
     * @returns Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity(modname: string): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(modname, 'displayRefresherInSingleActivity');
    }

    /**
     * Get the icon src for a certain type of module.
     *
     * @param modname The name of the module type.
     * @param modicon The mod icon string.
     * @param module The module to use.
     * @returns Promise resolved with the icon src.
     */
    async getModuleIconSrc(modname: string, modicon?: string, module?: CoreCourseModuleData): Promise<string> {
        const icon = await this.executeFunctionOnEnabled<Promise<string>>(modname, 'getIconSrc', [module, modicon]);

        return icon ?? CoreCourse.getModuleIconSrc(modname, modicon) ?? '';
    }

    /**
     * Get whether the icon for the given module should be treated as a shape or a rich image.
     *
     * @param modname The name of the module type.
     * @param modicon The mod icon string.
     * @param module The module to use.
     * @returns Whether the icon should be treated as a shape.
     * @deprecated since 4.3. Now it uses platform information. This function is not used anymore.
     */
    async moduleIconIsShape(modname: string, modicon?: string, module?: CoreCourseModuleData): Promise<boolean | undefined> {
        return await this.executeFunctionOnEnabled<Promise<boolean>>(modname, 'iconIsShape', [module, modicon]);
    }

    /**
     * Check if a certain type of module supports a certain feature.
     *
     * @param modname The modname.
     * @param feature The feature to check.
     * @param defaultValue Value to return if the module is not supported or doesn't know if it's supported.
     * @returns The result of the supports check.
     */
    supportsFeature<T = unknown>(modname: string, feature: string, defaultValue: T): T {
        const handler = this.enabledHandlers[modname];
        let result: T | undefined;

        if (handler) {
            if (handler.supportsFeature) {
                // The handler specified a function to determine the feature, use it.
                result = <T> handler.supportsFeature(feature);
            } else if (handler.supportedFeatures) {
                // Handler has an object to determine the feature, use it.
                result = <T> handler.supportedFeatures[feature];
            }
        }

        return result ?? defaultValue;
    }

    /**
     * Return true to show the manual completion regardless of the course's showcompletionconditions setting.
     * Returns false by default.
     *
     * @param module Module.
     * @returns Promise resolved with boolean: whether the manual completion should always be displayed.
     */
    async manualCompletionAlwaysShown(module: CoreCourseModuleData): Promise<boolean> {
        const result = await this.executeFunctionOnEnabled<boolean>(module.modname, 'manualCompletionAlwaysShown', [module]);

        return !!result;
    }

}

export const CoreCourseModuleDelegate = makeSingleton(CoreCourseModuleDelegateService);
