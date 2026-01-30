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

import { Subject } from 'rxjs';

import { CoreLogger } from '@static/logger';
import { CoreSite } from '@classes/sites/site';
import { CoreFilepoolComponentFileEventData } from '@services/filepool';
import { CoreRedirectPayload } from '@services/navigator';
import { CoreCourseModuleCompletionData } from '@features/course/services/course-helper';
import { CoreScreenOrientation } from '@services/screen';
import { CoreSiteInfoResponse, CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { DownloadStatus } from '../constants';
import { COURSE_STATUS_CHANGED_EVENT } from '@features/course/constants';

/**
 * Observer instance to stop listening to an event.
 */
export interface CoreEventObserver {
    /**
     * Stop the observer.
     */
    off: () => void;
}

/**
 * Event payloads.
 */
export interface CoreEventsData {
    [CoreEvents.SITE_UPDATED]: CoreEventSiteUpdatedData;
    [CoreEvents.SITE_ADDED]: CoreEventSiteAddedData;
    [CoreEvents.SITE_DELETED]: CoreSite;
    [CoreEvents.SESSION_EXPIRED]: CoreEventSessionExpiredData;
    [CoreEvents.PACKAGE_STATUS_CHANGED]: CoreEventPackageStatusChanged;
    [CoreEvents.USER_DELETED]: CoreEventUserDeletedData;
    [CoreEvents.USER_SUSPENDED]: CoreEventUserSuspendedData;
    [CoreEvents.USER_NO_LOGIN]: CoreEventUserNoLoginData;
    [CoreEvents.FORM_ACTION]: CoreEventFormActionData;
    [CoreEvents.NOTIFICATION_SOUND_CHANGED]: CoreEventNotificationSoundChangedData;
    [CoreEvents.COMPLETION_MODULE_VIEWED]: CoreEventCompletionModuleViewedData;
    [CoreEvents.MANUAL_COMPLETION_CHANGED]: CoreEventManualCompletionChangedData;
    [CoreEvents.SECTION_STATUS_CHANGED]: CoreEventSectionStatusChangedData;
    [CoreEvents.ACTIVITY_DATA_SENT]: CoreEventActivityDataSentData;
    [CoreEvents.IAB_LOAD_START]: InAppBrowserEvent;
    [CoreEvents.IAB_LOAD_STOP]: InAppBrowserEvent;
    [CoreEvents.IAB_MESSAGE]: Record<string, unknown>;
    [CoreEvents.LOGIN]: { siteId: string };
    [CoreEvents.LOGIN_SITE_CHECKED]: CoreEventLoginSiteCheckedData;
    [CoreEvents.LOGIN_SITE_UNCHECKED]: CoreEventLoginSiteUncheckedData;
    [CoreEvents.SEND_ON_ENTER_CHANGED]: CoreEventSendOnEnterChangedData;
    [CoreEvents.COMPONENT_FILE_ACTION]: CoreFilepoolComponentFileEventData;
    [CoreEvents.FILE_SHARED]: CoreEventFileSharedData;
    [CoreEvents.APP_LAUNCHED_URL]: CoreEventAppLaunchedData;
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    [CoreEvents.ORIENTATION_CHANGE]: CoreEventOrientationData;
    [CoreEvents.COURSE_MODULE_VIEWED]: CoreEventCourseModuleViewed;
    [CoreEvents.COMPLETE_REQUIRED_PROFILE_DATA_FINISHED]: CoreEventCompleteRequiredProfileDataFinished;
}

/*
 * Static class to send and listen to events.
 */
export class CoreEvents {

    static readonly SESSION_EXPIRED = 'session_expired';
    static readonly PASSWORD_CHANGE_FORCED = 'password_change_forced';
    static readonly USER_NOT_FULLY_SETUP = 'user_not_fully_setup';
    static readonly SITE_POLICY_AGREED = 'site_policy_agreed';
    static readonly SITE_POLICY_NOT_AGREED = 'site_policy_not_agreed';
    static readonly LOGIN = 'login';
    static readonly LOGOUT = 'logout';
    static readonly LANGUAGE_CHANGED = 'language_changed';
    static readonly NOTIFICATION_SOUND_CHANGED = 'notification_sound_changed';
    static readonly SITE_ADDED = 'site_added';
    static readonly SITE_UPDATED = 'site_updated';
    static readonly SITE_DELETED = 'site_deleted';
    static readonly COMPLETION_MODULE_VIEWED = 'completion_module_viewed';
    static readonly MANUAL_COMPLETION_CHANGED = 'manual_completion_changed';
    static readonly USER_DELETED = 'user_deleted';
    static readonly USER_SUSPENDED = 'user_suspended';
    static readonly USER_NO_LOGIN = 'user_no_login';
    static readonly PACKAGE_STATUS_CHANGED = 'package_status_changed';
    /**
     * @deprecated since 5.0. Use COURSE_STATUS_CHANGED_EVENT instead.
     */
    static readonly COURSE_STATUS_CHANGED = COURSE_STATUS_CHANGED_EVENT;
    static readonly SECTION_STATUS_CHANGED = 'section_status_changed';
    static readonly COMPONENT_FILE_ACTION = 'component_file_action';
    static readonly SITE_PLUGINS_LOADED = 'site_plugins_loaded';
    static readonly SITE_PLUGINS_COURSE_RESTRICT_UPDATED = 'site_plugins_course_restrict_updated';
    static readonly LOGIN_SITE_CHECKED = 'login_site_checked';
    static readonly LOGIN_SITE_UNCHECKED = 'login_site_unchecked';
    static readonly IAB_LOAD_START = 'inappbrowser_load_start';
    static readonly IAB_LOAD_STOP = 'inappbrowser_load_stop';
    static readonly IAB_EXIT = 'inappbrowser_exit';
    static readonly IAB_MESSAGE = 'inappbrowser_message';
    static readonly APP_LAUNCHED_URL = 'app_launched_url'; // App opened with a certain URL (custom URL scheme).
    static readonly FILE_SHARED = 'file_shared';
    /**
     * @deprecated since 5.0.0. Use CoreKeyboard.getKeyboardShownSignal signal.
     */
    static readonly KEYBOARD_CHANGE = 'keyboard_change';
    /**
     * @deprecated since 5.1.0. Use CoreScreen.orientationSignal signal.
     */
    static readonly ORIENTATION_CHANGE = 'orientation_change';
    static readonly SEND_ON_ENTER_CHANGED = 'send_on_enter_changed';
    /**
     * @deprecated since 5.1.0. Use CORE_COURSE_SELECT_TAB instead.
     */
    static readonly SELECT_COURSE_TAB = 'select_course_tab';
    static readonly WS_CACHE_INVALIDATED = 'ws_cache_invalidated';
    static readonly SITE_STORAGE_DELETED = 'site_storage_deleted';
    static readonly FORM_ACTION = 'form_action';
    static readonly ACTIVITY_DATA_SENT = 'activity_data_sent';
    static readonly DEVICE_REGISTERED_IN_MOODLE = 'device_registered_in_moodle';
    static readonly COURSE_MODULE_VIEWED = 'course_module_viewed';
    static readonly COMPLETE_REQUIRED_PROFILE_DATA_FINISHED = 'complete_required_profile_data_finished';
    static readonly MAIN_HOME_LOADED = 'main_home_loaded';
    /**
     * @deprecated since 5.1.0. Not used anymore.
     */
    static readonly FULL_SCREEN_CHANGED = 'full_screen_changed';

    protected static logger = CoreLogger.getInstance('CoreEvents');
    protected static observables: { [eventName: string]: Subject<unknown> } = {};
    protected static uniqueEvents: { [eventName: string]: { data: unknown } } = {};

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
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
     * @returns Observer to stop listening.
     */
    static on<Fallback = unknown, Event extends string = string>(
        eventName: Event,
        callBack: (value: CoreEventData<Event, Fallback> & CoreEventSiteData) => void,
        siteId?: string,
    ): CoreEventObserver {
        // If it's a unique event and has been triggered already, call the callBack.
        // We don't need to create an observer because the event won't be triggered again.
        if (CoreEvents.uniqueEvents[eventName]) {
            callBack(CoreEvents.uniqueEvents[eventName].data as CoreEventData<Event, Fallback> & CoreEventSiteData);

            // Return a fake observer to prevent errors.
            return {
                off: (): void => {
                    // Nothing to do.
                },
            };
        }

        CoreEvents.logger.debug(`New observer listening to event '${eventName}'`);

        if (CoreEvents.observables[eventName] === undefined) {
            // No observable for this event, create a new one.
            CoreEvents.observables[eventName] = new Subject();
        }

        const subscription = CoreEvents.observables[eventName].subscribe(
            (value: CoreEventData<Event, Fallback> & CoreEventSiteData) => {
                if (!siteId || value.siteId === siteId) {
                    callBack(value);
                }
            },
        );

        // Create and return a CoreEventObserver.
        return {
            off: (): void => {
                CoreEvents.logger.debug(`Stop listening to event '${eventName}'`);
                subscription.unsubscribe();
            },
        };
    }

    /**
     * Listen once for a certain event. To stop listening to the event (in case it wasn't triggered):
     * let observer = eventsProvider.on('something', myCallBack);
     * ...
     * observer.off();
     *
     * @param eventName Name of the event to listen to.
     * @param callBack Function to call when the event is triggered.
     * @param siteId Site where to trigger the event. Undefined won't check the site.
     * @returns Observer to stop listening.
     */
    static once<Fallback = unknown, Event extends string = string>(
        eventName: Event,
        callBack: (value: CoreEventData<Event, Fallback> & CoreEventSiteData) => void,
        siteId?: string,
    ): CoreEventObserver {
        const listener = CoreEvents.on<Fallback, Event>(eventName, (value) => {
            listener.off();
            callBack(value);
        }, siteId);

        return listener;
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
     * @returns Observer to stop listening.
     */
    static onMultiple<T = unknown>(eventNames: string[], callBack: (value: T) => void, siteId?: string): CoreEventObserver {
        const observers = eventNames.map((name) => CoreEvents.on<T>(name, callBack, siteId));

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
     * @param eventName Name of the event to trigger.
     * @param data Data to pass to the observers.
     * @param siteId Site where to trigger the event. Undefined means no Site.
     */
    static trigger<Fallback = unknown, Event extends string = string>(
        eventName: Event,
        data?: CoreEventData<Event, Fallback>,
        siteId?: string,
    ): void {
        CoreEvents.logger.debug(`Event '${eventName}' triggered.`);
        if (CoreEvents.observables[eventName]) {
            if (siteId) {
                Object.assign(data || {}, { siteId });
            }
            CoreEvents.observables[eventName].next(data || {});
        }
    }

    /**
     * Triggers a unique event, notifying all the observers. If the event has already been triggered, don't do anything.
     *
     * @param eventName Name of the event to trigger.
     * @param data Data to pass to the observers.
     * @param siteId Site where to trigger the event. Undefined means no Site.
     */
    static triggerUnique<Fallback = unknown, Event extends string = string>(
        eventName: Event,
        data: CoreEventData<Event, Fallback>,
        siteId?: string,
    ): void {
        if (CoreEvents.uniqueEvents[eventName]) {
            CoreEvents.logger.debug(`Unique event '${eventName}' ignored because it was already triggered.`);
        } else {
            CoreEvents.logger.debug(`Unique event '${eventName}' triggered.`);

            if (siteId) {
                Object.assign(data || {}, { siteId });
            }

            // Store the data so it can be passed to observers that register from now on.
            CoreEvents.uniqueEvents[eventName] = {
                data,
            };

            // Now pass the data to observers.
            if (CoreEvents.observables[eventName]) {
                CoreEvents.observables[eventName].next(data);
            }
        }
    }

    /**
     * Wait until an event has been emitted.
     *
     * @param eventName Event name.
     */
    static waitUntil(eventName: string): Promise<void> {
        return new Promise(resolve => CoreEvents.once(eventName, () => resolve()));
    }

}

/**
 * Resolve payload type for a given event.
 */
export type CoreEventData<Event, Fallback> = Event extends keyof CoreEventsData ? CoreEventsData[Event] : Fallback;

/**
 * Some events contains siteId added by the trigger function. This type is intended to be combined with others.
 */
export type CoreEventSiteData = {
    siteId?: string;
};

/**
 * Data passed to SITE_UPDATED event.
 */
export type CoreEventSiteUpdatedData = CoreSiteInfoResponse;

/**
 * Data passed to SITE_ADDED event.
 */
export type CoreEventSiteAddedData = CoreSiteInfoResponse;

/**
 * Data passed to SESSION_EXPIRED event.
 */
export type CoreEventSessionExpiredData = CoreRedirectPayload;

/**
 * Data passed to CORE_LOADING_CHANGED event.
 */
export type CoreEventLoadingChangedData = {
    loaded: boolean;
    uniqueId: string;
};

/**
 * Data passed to PACKAGE_STATUS_CHANGED event.
 */
export type CoreEventPackageStatusChanged = {
    component: string;
    componentId: string | number;
    status: DownloadStatus;
};

/**
 * Data passed to USER_DELETED event.
 */
export type CoreEventUserDeletedData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any; // Params sent to the WS that failed.
};

/**
 * Data passed to USER_SUSPENDED event.
 */
export type CoreEventUserSuspendedData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any; // Params sent to the WS that failed.
};

/**
 * Data passed to USER_NO_LOGIN event.
 */
export type CoreEventUserNoLoginData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any; // Params sent to the WS that failed.
};

export enum CoreEventFormAction {
    CANCEL = 'cancel',
    SUBMIT = 'submit',
}

/**
 * Data passed to FORM_ACTION event.
 */
export type CoreEventFormActionData = {
    action: CoreEventFormAction; // Action performed.
    form: HTMLElement; // Form element.
    online?: boolean; // Whether the data was sent to server or not. Only when submitting.
};

/**
 * Data passed to NOTIFICATION_SOUND_CHANGED event.
 */
export type CoreEventNotificationSoundChangedData = {
    enabled: boolean;
};

/**
 * Data passed to COMPLETION_MODULE_VIEWED event.
 */
export type CoreEventCompletionModuleViewedData = {
    courseId: number;
    cmId?: number;
};

/**
 * Data passed to MANUAL_COMPLETION_CHANGED event.
 */
export type CoreEventManualCompletionChangedData = {
    completion: CoreCourseModuleCompletionData;
};

/**
 * Data passed to SECTION_STATUS_CHANGED event.
 */
export type CoreEventSectionStatusChangedData = {
    courseId: number;
    sectionId?: number;
};

/**
 * Data passed to ACTIVITY_DATA_SENT event.
 */
export type CoreEventActivityDataSentData = {
    module: string;
};

/**
 * Data passed to LOGIN_SITE_CHECKED event.
 */
export type CoreEventLoginSiteCheckedData = {
    config: CoreSitePublicConfigResponse;
    siteId?: string;
};

/**
 * Data passed to LOGIN_SITE_UNCHECKED event.
 */
export type CoreEventLoginSiteUncheckedData = {
    config?: CoreSitePublicConfigResponse;
    loginSuccessful: boolean;
    siteId?: string;
};

/**
 * Data passed to SEND_ON_ENTER_CHANGED event.
 */
export type CoreEventSendOnEnterChangedData = {
    sendOnEnter: boolean;
};

/**
 * Data passed to FILE_SHARED event.
 */
export type CoreEventFileSharedData = {
    name: string;
    siteId: string;
};

/**
 * Data passed to APP_LAUNCHED_URL event.
 */
export type CoreEventAppLaunchedData = {
    url: string;
};

/**
 * Data passed to ORIENTATION_CHANGE event.
 *
 * @deprecated since 5.1.0. Use CoreScreen.orientationSignal signal.
 */
export type CoreEventOrientationData = {
    orientation: CoreScreenOrientation;
};

/**
 * Data passed to COURSE_MODULE_VIEWED event.
 */
export type CoreEventCourseModuleViewed = {
    courseId: number;
    cmId: number;
    timeaccess: number;
    sectionId?: number;
};

/**
 * Data passed to COMPLETE_REQUIRED_PROFILE_DATA_FINISHED event.
 */
export type CoreEventCompleteRequiredProfileDataFinished = {
    path: string;
};
