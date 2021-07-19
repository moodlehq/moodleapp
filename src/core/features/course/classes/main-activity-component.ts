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

import { Component, Inject, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { IonContent } from '@ionic/angular';

import { CoreCourseModuleMainResourceComponent } from './main-resource-component';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Network, NgZone } from '@singletons';
import { Subscription } from 'rxjs';
import { CoreApp } from '@services/app';
import { CoreCourse } from '../services/course';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCourseContentsPage } from '../pages/contents/contents';
import { CoreConstants } from '@/core/constants';

/**
 * Template class to easily create CoreCourseModuleMainComponent of activities.
 */
@Component({
    template: '',
})
export class CoreCourseModuleMainActivityComponent extends CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy {

    @Input() group?: number; // Group ID the component belongs to.

    moduleName?: string; // Raw module name to be translated. It will be translated on init.

    // Data for context menu.
    syncIcon?: string; // Sync icon.
    hasOffline?: boolean; // If it has offline data to be synced.
    isOnline?: boolean; // If the app is online or not.

    protected syncObserver?: CoreEventObserver; // It will observe the sync auto event.
    protected onlineSubscription: Subscription; // It will observe the status of the network connection.
    protected syncEventName?: string; // Auto sync event name.

    constructor(
        @Optional() @Inject('') loggerName: string = 'CoreCourseModuleMainResourceComponent',
        protected content?: IonContent,
        courseContentsPage?: CoreCourseContentsPage,
    ) {
        super(loggerName, courseContentsPage);

        // Refresh online status when changes.
        this.onlineSubscription = Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreApp.isOnline();
            });
        });
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        await super.ngOnInit();

        this.hasOffline = false;
        this.syncIcon = CoreConstants.ICON_LOADING;
        this.moduleName = CoreCourse.translateModuleName(this.moduleName || '');

        if (this.syncEventName) {
            // Refresh data if this discussion is synchronized automatically.
            this.syncObserver = CoreEvents.on(this.syncEventName, (data) => {
                this.autoSyncEventReceived(data);
            }, this.siteId);
        }
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data received on sync observer.
     * @return True if refresh is needed, false otherwise.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected isRefreshSyncNeeded(syncEventData: unknown): boolean {
        return false;
    }

    /**
     * An autosync event has been received, check if refresh is needed and update the view.
     *
     * @param syncEventData Data receiven on sync observer.
     */
    protected autoSyncEventReceived(syncEventData: unknown): void {
        if (this.isRefreshSyncNeeded(syncEventData)) {
            // Refresh the data.
            this.showLoadingAndRefresh(false);
        }
    }

    /**
     * Perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    protected async refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        this.refreshIcon = CoreConstants.ICON_LOADING;
        this.syncIcon = CoreConstants.ICON_LOADING;

        try {
            await CoreUtils.ignoreErrors(Promise.all([
                this.invalidateContent(),
                this.showCompletion ? CoreCourse.invalidateModule(this.module.id) : undefined,
            ]));

            await this.loadContent(true, sync, showErrors);
        } finally {
            this.refreshIcon = CoreConstants.ICON_REFRESH;
            this.syncIcon = CoreConstants.ICON_SYNC;
        }
    }

    /**
     * Show loading and perform the load content function.
     *
     * @param sync If the fetch needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    protected async showLoadingAndFetch(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        this.refreshIcon = CoreConstants.ICON_LOADING;
        this.syncIcon = CoreConstants.ICON_LOADING;
        this.loaded = false;
        this.content?.scrollToTop();

        try {
            await this.loadContent(false, sync, showErrors);
        } finally {
            this.refreshIcon = CoreConstants.ICON_REFRESH;
            this.syncIcon = CoreConstants.ICON_REFRESH;
        }
    }

    /**
     * Show loading and perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    protected showLoadingAndRefresh(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        this.refreshIcon = CoreConstants.ICON_LOADING;
        this.syncIcon = CoreConstants.ICON_LOADING;
        this.loaded = false;
        this.content?.scrollToTop();

        return this.refreshContent(sync, showErrors);
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        return;
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Promise resolved when done.
     */
    protected async loadContent(refresh?: boolean, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        this.isOnline = CoreApp.isOnline();

        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        try {
            if (refresh && this.showCompletion) {
                try {
                    this.module = await CoreCourse.getModule(this.module.id, this.courseId);
                } catch {
                    // Ignore errors.
                }
            }

            await this.fetchContent(refresh, sync, showErrors);
        } catch (error) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return await this.refreshContent(sync);
            }

            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        } finally {
            this.loaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;
            this.syncIcon = CoreConstants.ICON_REFRESH;
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected async sync(): Promise<unknown> {
        return {};
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @return If suceed or not.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected hasSyncSucceed(result: unknown): boolean {
        return true;
    }

    /**
     * Tries to synchronize the activity.
     *
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved with true if sync succeed, or false if failed.
     */
    protected async syncActivity(showErrors: boolean = false): Promise<boolean> {
        try {
            const result = <{warnings?: CoreWSExternalWarning[]}> await this.sync();

            if (result?.warnings?.length) {
                CoreDomUtils.showErrorModal(result.warnings[0]);
            }

            return this.hasSyncSucceed(result);
        } catch (error) {
            if (showErrors) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errorsync', true);
            }

            return false;
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.onlineSubscription?.unsubscribe();
        this.syncObserver?.off();
    }

}
