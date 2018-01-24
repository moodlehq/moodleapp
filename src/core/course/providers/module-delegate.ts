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
import { NavController } from 'ionic-angular';
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreCourseProvider } from './course';
import { CoreSite } from '../../../classes/site';

/**
 * Interface that all course module handlers must implement.
 */
export interface CoreCourseModuleHandler {
    /**
     * A name to identify the addon.
     * @type {string}
     */
    name: string;

    /**
     * Name of the module. It should match the "modname" of the module returned in core_course_get_contents.
     * @type {string}
     */
    modname: string;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean|Promise<boolean>;

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @return {CoreCourseModuleHandlerData} Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number) : CoreCourseModuleHandlerData;

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     *
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any} The component to use, undefined if not found.
     */
    getMainComponent(course: any, module: any) : any;
};

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
     * The image to use as icon (path to the image).
     * @type {string}
     */
    icon?: string;

    /**
     * The class to assign to the item.
     * @type {string}
     */
    class?: string;

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
     */
    action?(event: Event, navCtrl: NavController, module: any, courseId: number) : void;
};

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
    action(event: Event, navCtrl: NavController, module: any, courseId: number) : void;
};

/**
 * Delegate to register module handlers.
 */
@Injectable()
export class CoreCourseModuleDelegate {
    protected logger;
    protected handlers: {[s: string]: CoreCourseModuleHandler} = {}; // All registered handlers.
    protected enabledHandlers: {[s: string]: CoreCourseModuleHandler} = {}; // Handlers enabled for the current site.
    protected lastUpdateHandlersStart: number;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            private courseProvider: CoreCourseProvider) {
        this.logger = logger.getInstance('CoreCourseModuleDelegate');

        eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.REMOTE_ADDONS_LOADED, this.updateHandlers.bind(this));
    }

    /**
     * Get the component to render the module.
     *
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any} The component to use, undefined if not found.
     */
    getMainComponent?(course: any, module: any) : any {
        let handler = this.enabledHandlers[module.modname];
        if (handler && handler.getMainComponent) {
            let component = handler.getMainComponent(course, module);
            if (component) {
                return component;
            }
        }
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
    getModuleDataFor(modname: string, module: any, courseId: number, sectionId: number) : CoreCourseModuleHandlerData {
        if (typeof this.enabledHandlers[modname] != 'undefined') {
            return this.enabledHandlers[modname].getData(module, courseId, sectionId);
        }

        // Return the default data.
        let defaultData: CoreCourseModuleHandlerData = {
            icon: this.courseProvider.getModuleIconSrc(module.modname),
            title: module.name,
            class: 'core-course-default-handler core-course-module-' + module.modname + '-handler',
            action: (event: Event, navCtrl: NavController, module: any, courseId: number) => {
                event.preventDefault();
                event.stopPropagation();

                navCtrl.push('CoreCourseUnsupportedModulePage', {module: module});
            }
        };

        if (module.url) {
            defaultData.buttons = [{
                icon: 'open',
                label: 'core.openinbrowser',
                action: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(module.url);
                }
            }];
        }

        return defaultData;
    };

    /**
     * Check if a module has a registered handler (not necessarily enabled).
     *
     * @param {string} modname The name of the module type.
     * @return {boolean} If the controller is installed or not.
     */
    hasHandler(modname: string) : boolean {
        return typeof this.handlers[modname] !== 'undefined';
    }

    /**
     * Check if a certain module type is disabled in a site.
     *
     * @param {string} modname The name of the module type.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether module is disabled.
     */
    isModuleDisabled(modname: string, siteId?: string) : Promise<boolean> {
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
    isModuleDisabledInSite(modname: string, site?: CoreSite) : boolean {
        site = site || this.sitesProvider.getCurrentSite();

        if (typeof this.handlers[modname] != 'undefined') {
            return site.isFeatureDisabled('$mmCourseDelegate_' + this.handlers[modname].name);
        }
        return false;
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param {number} time Time to check.
     * @return {boolean} Whether it's the last call.
     */
    isLastUpdateCall(time: number) : boolean {
        if (!this.lastUpdateHandlersStart) {
            return true;
        }
        return time == this.lastUpdateHandlersStart;
    }

    /**
     * Register a handler.
     *
     * @param {CoreCourseModuleHandler} handler The handler to register.
     * @return {boolean} True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreCourseModuleHandler) : boolean {
        if (typeof this.handlers[handler.modname] !== 'undefined') {
            this.logger.log('There is an addon named \'' + this.handlers[handler.modname].name +
                    '\' already registered as handler for ' + handler.modname);
            return false;
        }
        this.logger.log(`Registered addon '${handler.name}' for '${handler.modname}'`);
        this.handlers[handler.modname] = handler;
        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param {CoreCourseModuleHandler} handler The handler to check.
     * @param {number} time Time this update process started.
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandler(handler: CoreCourseModuleHandler, time: number) : Promise<void> {
        let promise,
            siteId = this.sitesProvider.getCurrentSiteId(),
            currentSite = this.sitesProvider.getCurrentSite();

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else if (currentSite.isFeatureDisabled('$mmCourseDelegate_' + handler.name)) {
            promise = Promise.resolve(false);
        } else {
            promise = Promise.resolve(handler.isEnabled());
        }

        // Checks if the handler is enabled.
        return promise.catch(() => {
            return false;
        }).then((enabled: boolean) => {
            // Verify that this call is the last one that was started.
            if (this.isLastUpdateCall(time) && this.sitesProvider.getCurrentSiteId() === siteId) {
                if (enabled) {
                    this.enabledHandlers[handler.modname] = handler;
                } else {
                    delete this.enabledHandlers[handler.modname];
                }
            }
        });
    }

    /**
     * Update the handlers for the current site.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected updateHandlers() : Promise<any> {
        let promises = [],
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (let name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).catch(() => {
            // Never reject.
        });
    }
}
