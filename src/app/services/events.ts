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
import { Subject } from 'rxjs';

import { CoreLogger } from '@singletons/logger';
import { makeSingleton } from '@singletons/core.singletons';

/**
 * Observer instance to stop listening to an event.
 */
export interface CoreEventObserver {
    /**
     * Stop the observer.
     */
    off: () => void;
}

/*
 * Service to send and listen to events.
 */
@Injectable()
export class CoreEventsProvider {

    static readonly SESSION_EXPIRED = 'session_expired';
    static readonly PASSWORD_CHANGE_FORCED = 'password_change_forced';
    static readonly USER_NOT_FULLY_SETUP = 'user_not_fully_setup';
    static readonly SITE_POLICY_NOT_AGREED = 'site_policy_not_agreed';
    static readonly LOGIN = 'login';
    static readonly LOGOUT = 'logout';
    static readonly LANGUAGE_CHANGED = 'language_changed';
    static readonly NOTIFICATION_SOUND_CHANGED = 'notification_sound_changed';
    static readonly SITE_ADDED = 'site_added';
    static readonly SITE_UPDATED = 'site_updated';
    static readonly SITE_DELETED = 'site_deleted';
    static readonly COMPLETION_MODULE_VIEWED = 'completion_module_viewed';
    static readonly USER_DELETED = 'user_deleted';
    static readonly PACKAGE_STATUS_CHANGED = 'package_status_changed';
    static readonly COURSE_STATUS_CHANGED = 'course_status_changed';
    static readonly SECTION_STATUS_CHANGED = 'section_status_changed';
    static readonly COMPONENT_FILE_ACTION = 'component_file_action';
    static readonly SITE_PLUGINS_LOADED = 'site_plugins_loaded';
    static readonly SITE_PLUGINS_COURSE_RESTRICT_UPDATED = 'site_plugins_course_restrict_updated';
    static readonly LOGIN_SITE_CHECKED = 'login_site_checked';
    static readonly LOGIN_SITE_UNCHECKED = 'login_site_unchecked';
    static readonly IAB_LOAD_START = 'inappbrowser_load_start';
    static readonly IAB_EXIT = 'inappbrowser_exit';
    static readonly APP_LAUNCHED_URL = 'app_launched_url'; // App opened with a certain URL (custom URL scheme).
    static readonly FILE_SHARED = 'file_shared';
    static readonly KEYBOARD_CHANGE = 'keyboard_change';
    static readonly CORE_LOADING_CHANGED = 'core_loading_changed';
    static readonly ORIENTATION_CHANGE = 'orientation_change';
    static readonly LOAD_PAGE_MAIN_MENU = 'load_page_main_menu';
    static readonly SEND_ON_ENTER_CHANGED = 'send_on_enter_changed';
    static readonly MAIN_MENU_OPEN = 'main_menu_open';
    static readonly SELECT_COURSE_TAB = 'select_course_tab';
    static readonly WS_CACHE_INVALIDATED = 'ws_cache_invalidated';
    static readonly SITE_STORAGE_DELETED = 'site_storage_deleted';
    static readonly FORM_ACTION = 'form_action';
    static readonly ACTIVITY_DATA_SENT = 'activity_data_sent';

    protected logger: CoreLogger;
    protected observables: { [eventName: string]: Subject<unknown> } = {};
    protected uniqueEvents: { [eventName: string]: {data: unknown} } = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CoreEventsProvider');
    }

    /**
     * Listen for a certain event. To stop listening to the event:
     * let observer = eventsProvider.on('something', myCallBack);
     * ...
     * observer.off();
     *
     * @param eventName Name of the event to listen to.
     * @param callBack Function to call when the event is triggered.
     * @param siteId Site where to trigger the event. Undefined won't check the site.
     * @return Observer to stop listening.
     */
    on(eventName: string, callBack: (value: unknown) => void, siteId?: string): CoreEventObserver {
        // If it's a unique event and has been triggered already, call the callBack.
        // We don't need to create an observer because the event won't be triggered again.
        if (this.uniqueEvents[eventName]) {
            callBack(this.uniqueEvents[eventName].data);

            // Return a fake observer to prevent errors.
            return {
                off: (): void => {
                    // Nothing to do.
                },
            };
        }

        this.logger.debug(`New observer listening to event '${eventName}'`);

        if (typeof this.observables[eventName] == 'undefined') {
            // No observable for this event, create a new one.
            this.observables[eventName] = new Subject<unknown>();
        }

        const subscription = this.observables[eventName].subscribe((value: {siteId?: string; [key: string]: unknown}) => {
            if (!siteId || value.siteId == siteId) {
                callBack(value);
            }
        });

        // Create and return a CoreEventObserver.
        return {
            off: (): void => {
                this.logger.debug(`Stop listening to event '${eventName}'`);
                subscription.unsubscribe();
            },
        };
    }

    /**
     * Listen for several events. To stop listening to the events:
     * let observer = eventsProvider.onMultiple(['something', 'another'], myCallBack);
     * ...
     * observer.off();
     *
     * @param eventNames Names of the events to listen to.
     * @param callBack Function to call when any of the events is triggered.
     * @param siteId Site where to trigger the event. Undefined won't check the site.
     * @return Observer to stop listening.
     */
    onMultiple(eventNames: string[], callBack: (value: unknown) => void, siteId?: string): CoreEventObserver {
        const observers = eventNames.map((name) => this.on(name, callBack, siteId));

        // Create and return a CoreEventObserver.
        return {
            off: (): void => {
                observers.forEach((observer) => {
                    observer.off();
                });
            },
        };
    }

    /**
     * Triggers an event, notifying all the observers.
     *
     * @param event Name of the event to trigger.
     * @param data Data to pass to the observers.
     * @param siteId Site where to trigger the event. Undefined means no Site.
     */
    trigger(eventName: string, data?: unknown, siteId?: string): void {
        this.logger.debug(`Event '${eventName}' triggered.`);
        if (this.observables[eventName]) {
            if (siteId) {
                data = Object.assign(data || {}, { siteId });
            }
            this.observables[eventName].next(data);
        }
    }

    /**
     * Triggers a unique event, notifying all the observers. If the event has already been triggered, don't do anything.
     *
     * @param event Name of the event to trigger.
     * @param data Data to pass to the observers.
     * @param siteId Site where to trigger the event. Undefined means no Site.
     */
    triggerUnique(eventName: string, data: unknown, siteId?: string): void {
        if (this.uniqueEvents[eventName]) {
            this.logger.debug(`Unique event '${eventName}' ignored because it was already triggered.`);
        } else {
            this.logger.debug(`Unique event '${eventName}' triggered.`);

            if (siteId) {
                data = Object.assign(data || {}, { siteId });
            }

            // Store the data so it can be passed to observers that register from now on.
            this.uniqueEvents[eventName] = {
                data,
            };

            // Now pass the data to observers.
            if (this.observables[eventName]) {
                this.observables[eventName].next(data);
            }
        }
    }

}

export class CoreEvents extends makeSingleton(CoreEventsProvider) {}
