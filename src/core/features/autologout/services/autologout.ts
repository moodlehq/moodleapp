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
import { CoreSite } from '@classes/sites/site';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreStorage } from '@services/storage';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';

/**
 * Auto logout service
 */
@Injectable({ providedIn: 'root' })
export class CoreAutoLogoutService {

    /**
     * Timestamp indicating the last time the application was in the foreground.
     */
    protected static readonly TIMESTAMP_DB_KEY = 'CoreAutoLogoutTimestamp';

    /**
     * How often we will store a timestamp (in miliseconds).
     */
    protected static readonly DEFAULT_TIMESTAMP_STORE_TIME = 10000;

    /**
     * Grace period if you return to the application too soon (in miliseconds).
     */
    protected static readonly GRACE_PERIOD = 30000;

    protected platformResumeSubscription?: Subscription;
    protected platformPauseSubscription?: Subscription;
    protected interval?: ReturnType<typeof setInterval>;
    protected backgroundTimestamp?: number;

    /**
     * Initialize.
     */
    initialize(): void {
        CoreEvents.on(CoreEvents.LOGIN, async() => await this.refreshListeners());
        CoreEvents.on(CoreEvents.LOGOUT, async({ siteId }) => {
            this.cancelListeners();

            const site = await CoreSites.getSite(siteId);

            await CoreStorage.forSite(site).remove(CoreAutoLogoutService.TIMESTAMP_DB_KEY);
        });
    }

    /**
     * Refresh listeners for auto logout.
     */
    async refreshListeners(): Promise<void> {
        if (!CoreSites.isLoggedIn()) {
            return;
        }

        const site = CoreSites.getCurrentSite();

        if (!site) {
            return;
        }

        const autoLogoutType = Number(site.getStoredConfig('tool_mobile_autologout'));
        this.cancelListeners();

        if (!autoLogoutType || autoLogoutType === CoreAutoLogoutType.NEVER) {
            return;
        }

        if (autoLogoutType === CoreAutoLogoutType.CUSTOM) {
            await this.setTimestamp();
            this.setInterval();
        }

        this.platformPauseSubscription = CorePlatform.pause.subscribe(async () => {
            this.backgroundTimestamp = new Date().getTime();
            this.clearInterval();
        });

        this.platformResumeSubscription = CorePlatform.resume.subscribe(async () => {
            if (autoLogoutType !== CoreAutoLogoutType.CUSTOM) {
                await this.handleAppClosed(site);

                return;
            }

            const autoLogoutTime = Number(site.getStoredConfig('tool_mobile_autologouttime'));
            const loggedOut = await this.handleSessionClosed(autoLogoutTime, site);

            if (!loggedOut) {
                await this.setTimestamp();
                this.setInterval();
            }
        });
    }

    /**
     * Set site logged out.
     *
     * @param siteId site id.
     */
    protected async logout(siteId: string): Promise<void> {
        await CoreSites.setSiteLoggedOut(siteId, true);
    }

    /**
     * Saves stored timestamp.
     */
    protected async setTimestamp(): Promise<void> {
        const date = new Date().getTime();
        const storage = CoreStorage.forCurrentSite();
        await storage.set(CoreAutoLogoutService.TIMESTAMP_DB_KEY, date);
    }

    /**
     * Gives if auto logout can be displayed.
     *
     * @returns true if can display, false if not.
     */
    async canShowPreference(): Promise<boolean> {
        const site = CoreSites.getCurrentSite();

        if (!site) {
            return false;
        }

        const autoLogoutType = Number(site.getStoredConfig('tool_mobile_autologout'));

        return autoLogoutType !== CoreAutoLogoutType.NEVER;
    }

    /**
     * Cancel uncompleted listeners.
     */
    protected cancelListeners(): void {
        this.clearInterval();
        this.platformResumeSubscription?.unsubscribe();
        this.platformPauseSubscription?.unsubscribe();
        delete this.platformPauseSubscription;
        delete this.platformResumeSubscription;
    }

    /**
     * Set interval.
     */
    protected setInterval(): void {
        this.interval = setInterval(async () => await this.setTimestamp(), CoreAutoLogoutService.DEFAULT_TIMESTAMP_STORE_TIME);
    }

    /**
     * Clear interval.
     */
    protected clearInterval(): void {
        if (!this.interval) {
            return;
        }

        clearInterval(this.interval);
        delete this.interval;
    }

    /**
     * Logout user if his session is expired.
     *
     * @param sessionDuration Session duration.
     * @param site Current site.
     * @returns Whether site has been logged out.
     */
    async handleSessionClosed(sessionDuration: number, site: CoreSite): Promise<boolean> {
        if (!site.id) {
            return false;
        }

        const storage = CoreStorage.forSite(site);
        const savedTimestamp = await storage.get<number>(CoreAutoLogoutService.TIMESTAMP_DB_KEY);

        if (!savedTimestamp) {
            return false;
        }

        // Get expiration time from site preferences as miliseconds.
        const expirationDate = savedTimestamp + ((sessionDuration || 0) * 1000);
        await storage.remove(CoreAutoLogoutService.TIMESTAMP_DB_KEY);

        if (new Date().getTime() < expirationDate) {
            return false;
        }

        await this.logout(site.id);

        return true;
    }

    /**
     * Logout if user closed the app.
     *
     * @param site Current site.
     * @returns Whether site has been logged out.
     */
    async handleAppClosed(site: CoreSite): Promise<boolean> {
        if (!site.id) {
            return false;
        }

        if (
            this.backgroundTimestamp &&
            (this.backgroundTimestamp + CoreAutoLogoutService.GRACE_PERIOD) > new Date().getTime()
        ) {
            delete this.backgroundTimestamp;

            return false;
        }

        await this.logout(site.id);

        return true;
    }

    getConfig(): { autoLogoutType: CoreAutoLogoutType; autoLogoutTime: number } {
        const site = CoreSites.getRequiredCurrentSite();
        const autoLogoutType = Number(site.getStoredConfig('tool_mobile_autologout'));
        const autoLogoutTime = Number(site.getStoredConfig('tool_mobile_autologouttime'));

        return { autoLogoutType, autoLogoutTime };
    }

}

export type CoreAutoLogoutSessionConfig = {
    type: CoreAutoLogoutType.CUSTOM;
    sessionDuration: number;
};

export type CoreAutoLogoutOtherConfig = {
    type: Exclude<CoreAutoLogoutType, CoreAutoLogoutType.CUSTOM>;
};

/**
 * Possible automatic logout cases.
 */
export enum CoreAutoLogoutType {
    /**
     * Disabled automatic logout.
     */
    NEVER = 0,

    /**
     * When the user closes the app, in next login he need to login again.
     */
    INMEDIATE = 1,

    /**
     * This applies when session time is set. If the user closes the app more time than the specified,
     * then, the user must login again.
     */
    CUSTOM = 2,
}

export type CoreAutoLogoutConfig = CoreAutoLogoutSessionConfig | CoreAutoLogoutOtherConfig;

export const CoreAutoLogout = makeSingleton(CoreAutoLogoutService);
