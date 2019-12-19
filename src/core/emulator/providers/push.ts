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
import { Observable } from 'rxjs/Observable';
import { Channel, EventResponse, Push, PushEvent, PushObject, PushOptions } from '@ionic-native/push';
import { CoreAppProvider } from '@providers/app';

/**
 * Emulates the Cordova Push plugin in desktop apps and in browser.
 */
@Injectable()
export class PushMock implements Push {

    constructor(private appProvider: CoreAppProvider) {
    }

    /**
     * Init push notifications
     *
     * @param options
     */
    init(options: PushOptions): PushObject {
        return new PushObjectMock(this.appProvider);
    }

    /**
     * Check whether the push notification permission has been granted.
     *
     * @return Returns a Promise that resolves with an object with one property: isEnabled, a
     *         boolean that indicates if permission has been granted.
     */
    hasPermission(): Promise<{isEnabled: boolean}> {
        return Promise.reject('hasPermission is only supported in mobile devices');
    }

    /**
     * Create a new notification channel for Android O and above.
     *
     * @param channel
     */
    createChannel(channel?: Channel): Promise<any> {
        return Promise.reject('createChannel is only supported in mobile devices');
    }

    /**
     * Delete a notification channel for Android O and above.
     *
     * @param id
     */
    deleteChannel(id?: string): Promise<any> {
        return Promise.reject('deleteChannel is only supported in mobile devices');
    }

    /**
     * Returns a list of currently configured channels.
     */
    listChannels(): Promise<Channel[]> {
        return Promise.reject('listChannels is only supported in mobile devices');
    }
}

/**
 * Emulates the PushObject class in desktop apps and in browser.
 */
export class PushObjectMock extends PushObject {

    constructor(private appProvider: CoreAppProvider) {
        super({});
    }

    /**
     * Adds an event listener
     * @param event
     */
    on(event: PushEvent): Observable<EventResponse> {
        return Observable.empty();
    }

    /**
     * The unregister method is used when the application no longer wants to receive push notifications.
     * Beware that this cleans up all event handlers previously registered,
     * so you will need to re-register them if you want them to function again without an application reload.
     */
    unregister(): Promise<any> {
        return Promise.reject('unregister is only supported in mobile devices');
    }

    /**
     * Set the badge count visible when the app is not running
     *
     * The count is an integer indicating what number should show up in the badge.
     * Passing 0 will clear the badge.
     * Each notification event contains a data.count value which can be used to set the badge to correct number.
     *
     * @param count
     */
    setApplicationIconBadgeNumber(count?: number): Promise<any> {
        if (!this.appProvider.isDesktop()) {
            return Promise.reject('setApplicationIconBadgeNumber is not supported in browser');
        }

        try {
            const app = require('electron').remote.app;
            if (app.setBadgeCount(count)) {
                return Promise.resolve();
            } else {
                return Promise.reject(null);
            }
        } catch (ex) {
            return Promise.reject(ex);
        }
    }

    /**
     * Get the current badge count visible when the app is not running
     * successHandler gets called with an integer which is the current badge count
     */
    getApplicationIconBadgeNumber(): Promise<number> {
        if (!this.appProvider.isDesktop()) {
            return Promise.reject('getApplicationIconBadgeNumber is not supported in browser');
        }

        try {
            const app = require('electron').remote.app;

            return Promise.resolve(app.getBadgeCount());
        } catch (ex) {
            return Promise.reject(ex);
        }
    }

    /**
     * iOS only
     * Tells the OS that you are done processing a background push notification.
     * successHandler gets called when background push processing is successfully completed.
     * @param [id]
     */
    finish(id?: string): Promise<any> {
        return Promise.reject('finish is only supported in mobile devices');
    }

    /**
     * Tells the OS to clear all notifications from the Notification Center
     */
    clearAllNotifications(): Promise<any> {
        return Promise.reject('clearAllNotifications is only supported in mobile devices');
    }

    /**
     * The subscribe method is used when the application wants to subscribe a new topic to receive push notifications.
     * @param topic Topic to subscribe to.
     */
    subscribe(topic: string): Promise<any> {
        return Promise.reject('subscribe is only supported in mobile devices');
    }

    /**
     * The unsubscribe method is used when the application no longer wants to receive push notifications from a specific topic but
     * continue to receive other push messages.
     *
     * @param topic Topic to unsubscribe from.
     */
    unsubscribe(topic: string): Promise<any> {
        return Promise.reject('unsubscribe is only supported in mobile devices');
    }
}
