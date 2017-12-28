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
import { Subject } from 'rxjs';
import { CoreLoggerProvider } from '../providers/logger';

export interface CoreEventObserver {
    off: () => void; // Unsubscribe.
};

/*
 * Service to send and listen to events.
 */
@Injectable()
export class CoreEventsProvider {
    public static SESSION_EXPIRED = 'session_expired';
    public static PASSWORD_CHANGE_FORCED = 'password_change_forced';
    public static USER_NOT_FULLY_SETUP = 'user_not_fully_setup';
    public static SITE_POLICY_NOT_AGREED = 'site_policy_not_agreed';
    public static LOGIN = 'login';
    public static LOGOUT = 'logout';
    public static LANGUAGE_CHANGED = 'language_changed';
    public static NOTIFICATION_SOUND_CHANGED = 'notification_sound_changed';
    public static SITE_ADDED = 'site_added';
    public static SITE_UPDATED = 'site_updated';
    public static SITE_DELETED = 'site_deleted';
    public static COMPLETION_MODULE_VIEWED = 'completion_module_viewed';
    public static USER_DELETED = 'user_deleted';
    public static PACKAGE_STATUS_CHANGED = 'package_status_changed';
    public static SECTION_STATUS_CHANGED = 'section_status_changed';
    public static REMOTE_ADDONS_LOADED = 'remote_addons_loaded';
    public static LOGIN_SITE_CHECKED = 'login_site_checked';
    public static LOGIN_SITE_UNCHECKED = 'login_site_unchecked';
    public static IAB_LOAD_START = 'inappbrowser_load_start';
    public static IAB_EXIT = 'inappbrowser_exit';
    public static APP_LAUNCHED_URL = 'app_launched_url'; // App opened with a certain URL (custom URL scheme).
    public static FILE_SHARED = 'file_shared';

    logger;
    observables: {[s: string] : Subject<any>} = {};
    uniqueEvents = {};

    constructor(logger: CoreLoggerProvider) {
        this.logger = logger.getInstance('CoreEventsProvider');
    }

    /**
     * Listen for a certain event. To stop listening to the event:
     * let observer = eventsProvider.on('something', myCallBack);
     * ...
     * observer.off();
     *
     * @param {string} eventName Name of the event to listen to.
     * @param {Function} callBack Function to call when the event is triggered.
     * @param {string} [siteId] Site where to trigger the event. Undefined won't check the site.
     * @return {CoreEventObserver} Observer to stop listening.
     */
    on(eventName: string, callBack: (value: any) => void, siteId?: string) : CoreEventObserver {
        // If it's a unique event and has been triggered already, call the callBack.
        // We don't need to create an observer because the event won't be triggered again.
        if (this.uniqueEvents[eventName]) {
            callBack(this.uniqueEvents[eventName].data);
            // Return a fake observer to prevent errors.
            return {
                off: () => {}
            };
        }

        this.logger.debug(`New observer listening to event '${eventName}'`);

        if (typeof this.observables[eventName] == 'undefined') {
            // No observable for this event, create a new one.
            this.observables[eventName] = new Subject<any>();
        }

        let subscription = this.observables[eventName].subscribe((value: any) => {
            if (!siteId || value.siteId == siteId) {
                callBack(value);
            }
        });

        // Create and return a CoreEventObserver.
        return {
            off: () => {
                this.logger.debug(`Stop listening to event '${eventName}'`);
                subscription.unsubscribe();
            }
        };
    }

    /**
     * Triggers an event, notifying all the observers.
     *
     * @param {string} event Name of the event to trigger.
     * @param {any} [data] Data to pass to the observers.
     * @param {string} [siteId] Site where to trigger the event. Undefined means no Site.
     */
    trigger(eventName: string, data?: any, siteId?: string) : void {
        this.logger.debug(`Event '${eventName}' triggered.`);
        if (this.observables[eventName]) {
            if (siteId) {
                if (!data) {
                    data = {};
                }
                data.siteId = siteId;
            }
            this.observables[eventName].next(data);
        }
    }

    /**
     * Triggers a unique event, notifying all the observers. If the event has already been triggered, don't do anything.
     *
     * @param {string} event Name of the event to trigger.
     * @param {any} data Data to pass to the observers.
     * @param {string} [siteId] Site where to trigger the event. Undefined means no Site.
     */
    triggerUnique(eventName: string, data: any, siteId?: string) : void {
        if (this.uniqueEvents[eventName]) {
            this.logger.debug(`Unique event '${eventName}' ignored because it was already triggered.`);
        } else {
            this.logger.debug(`Unique event '${eventName}' triggered.`);

            if (siteId) {
                if (!data) {
                    data = {};
                }
                data.siteId = siteId;
            }

            // Store the data so it can be passed to observers that register from now on.
            this.uniqueEvents[eventName] = {
                data: data
            };

            // Now pass the data to observers.
            if (this.observables[eventName]) {
                this.observables[eventName].next(data);
            }
        }
    }
}
