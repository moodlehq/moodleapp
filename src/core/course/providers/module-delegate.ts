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

import { Injectable, Injector } from '@angular/core';
import { NavController, NavOptions } from 'ionic-angular';
import { SafeUrl } from '@angular/platform-browser';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseProvider } from './course';
import { CoreSite } from '@classes/site';
import { CoreCourseModuleDefaultHandler } from './default-module';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';

/**
 * Interface that all course module handlers must implement.
 */
export interface CoreCourseModuleHandler extends CoreDelegateHandler {
    /**
     * Name of the module. It should match the "modname" of the module returned in core_course_get_contents.
     * @type {string}
     */
    modName: string;

    /**
     * List of supported features. The keys should be the name of the feature.
     * This is to replicate the "plugin_supports" function of Moodle.
     * If you need some dynamic checks please implement the supportsFeature function.
     * @type {{[name: string]: any}}
     */
    supportedFeatures?: {[name: string]: any};

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @return {CoreCourseModuleHandlerData} Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData;

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getMainComponent(injector: Injector, course: any, module: any): any | Promise<any>;

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity?(): boolean;

    /**
     * Get the icon src for the module.
     *
     * @return {string} The icon src.
     */
    getIconSrc?(): string;

    /**
     * Check if this type of module supports a certain feature.
     * If this function is implemented, the supportedFeatures object will be ignored.
     *
     * @param {string} feature The feature to check.
     * @return {any} The result of the supports check.
     */
    supportsFeature?(feature: string): any;
}

/**
 * Data needed to render the module in course contents.
 */
export interface CoreCourseModuleHandlerData {
    /**
     * The title to display in the module.
     * @type {string}
     */
    title: string;

    /**
     * The accessibility title to use in the module. If not provided, title will be used.
     * @type {string}
     */
    a11yTitle?: string;

    /**
     * The image to use as icon (path to the image).
     * @type {string}
     */
    icon?: string | SafeUrl;

    /**
     * The class to assign to the item.
     * @type {string}
     */
    class?: string;

    /**
     * The text to show in an extra badge.
     * @type {string}
     */
    extraBadge?: string;

    /**
     * The color of the extra badge. Default: primary.
     * @type {string}
     */
    extraBadgeColor?: string;

    /**
     * Whether to display a button to download/refresh the module if it's downloadable.
     * If it's set to true, the app will show a download/refresh button when needed and will handle the download of the
     * module using CoreCourseModulePrefetchDelegate.
     * @type {boolean}
     */
    showDownloadButton?: boolean;

    /**
     * The buttons to display in the module item.
     * @type {CoreCourseModuleHandlerButton[]}
     */
    buttons?: CoreCourseModuleHandlerButton[];

    /**
     * Whether to display a spinner in the module item.
     * @type {boolean}
     */
    spinner?: boolean;

    /**
     * Action to perform when the module is clicked.
     *
     * @param {Event} event The click event.
     * @param {NavController} navCtrl NavController instance.
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {NavOptions} [options] Options for the navigation.
     * @param {any} [params] Params for the new page.
     */
    action?(event: Event, navCtrl: NavController, module: any, courseId: number, options?: NavOptions, params?: any): void;

    /**
     * Updates the status of the module.
     *
     * @param {string} status Module status.
     */
    updateStatus?(status: string): void;

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
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any>;
}

/**
 * A button to display in a module item.
 */
export interface CoreCourseModuleHandlerButton {
    /**
     * The label to add to the button.
     * @type {string}
     */
    label: string;

    /**
     * The name of the button icon.
     * @type {string}
     */
    icon: string;

    /**
     * Whether the button should be hidden.
     * @type {boolean}
     */
    hidden?: boolean;

    /**
     * The name of the button icon to use in iOS instead of "icon".
     * @type {string}
     */
    iosIcon?: string;

    /**
     * The name of the button icon to use in MaterialDesign instead of "icon".
     * @type {string}
     */
    mdIcon?: string;

    /**
     * Action to perform when the button is clicked.
     *
     * @param {Event} event The click event.
     * @param {NavController} navCtrl NavController instance.
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     */
    action(event: Event, navCtrl: NavController, module: any, courseId: number): void;
}

/**
 * Delegate to register module handlers.
 */
@Injectable()
export class CoreCourseModuleDelegate extends CoreDelegate {
    protected featurePrefix = 'CoreCourseModuleDelegate_';
    protected handlerNameProperty = 'modName';

    constructor(loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected courseProvider: CoreCourseProvider, protected defaultHandler: CoreCourseModuleDefaultHandler) {
        super('CoreCourseModuleDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * Get the component to render the module.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getMainComponent(injector: Injector, course: any, module: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(module.modname, 'getMainComponent', [injector, course, module]))
                .catch((err) => {
            this.logger.error('Error getting main component', err);
        });
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param {string} modname The name of the module type.
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @return {CoreCourseModuleHandlerData} Data to render the module.
     */
    getModuleDataFor(modname: string, module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData {
        return this.executeFunctionOnEnabled(modname, 'getData', [module, courseId, sectionId]);
    }

    /**
     * Check if a certain module type is disabled in a site.
     *
     * @param {string} modname The name of the module type.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether module is disabled.
     */
    isModuleDisabled(modname: string, siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isModuleDisabledInSite(modname, site);
        });
    }

    /**
     * Check if a certain module type is disabled in a site.
     *
     * @param {string} modname The name of the module type.
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether module is disabled.
     */
    isModuleDisabledInSite(modname: string, site?: CoreSite): boolean {
        const handler = this.getHandler(modname, true);

        if (handler) {
            site = site || this.sitesProvider.getCurrentSite();

            return this.isFeatureDisabled(handler, site);
        }

        return false;
    }

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @param {any} modname The name of the module type.
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity(modname: string): boolean {
        return this.executeFunctionOnEnabled(modname, 'displayRefresherInSingleActivity');
    }

    /**
     * Get the icon src for a certain type of module.
     *
     * @param {any} modname The name of the module type.
     * @param {string} [modicon] The mod icon string.
     * @return {string} The icon src.
     */
    getModuleIconSrc(modname: string, modicon?: string): string {
        return this.executeFunctionOnEnabled(modname, 'getIconSrc') || this.courseProvider.getModuleIconSrc(modname, modicon);
    }

    /**
     * Check if a certain type of module supports a certain feature.
     *
     * @param {string} modname The modname.
     * @param {string} feature The feature to check.
     * @param {any} defaultValue Value to return if the module is not supported or doesn't know if it's supported.
     * @return {any} The result of the supports check.
     */
    supportsFeature(modname: string, feature: string, defaultValue: any): any {
        const handler = this.enabledHandlers[modname];
        let result;

        if (handler) {
            if (handler['supportsFeature']) {
                // The handler specified a function to determine the feature, use it.
                result = handler['supportsFeature'].apply(handler, [feature]);
            } else if (handler['supportedFeatures']) {
                // Handler has an object to determine the feature, use it.
                result = handler['supportedFeatures'][feature];
            }
        }

        if (result === null || typeof result == 'undefined') {
            // Not supported or doesn't know, return defaul.
            return defaultValue;
        } else {
            return result;
        }
    }
}
