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
import { CoreCourse } from '../services/course';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCourseContentsPage } from '../pages/contents/contents';
import { CoreSites } from '@services/sites';

/**
 * Template class to easily create CoreCourseModuleMainComponent of activities.
 */
@Component({
    template: '',
})
export class CoreCourseModuleMainActivityComponent extends CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy {

    @Input() group?: number; // Group ID the component belongs to.

    moduleName?: string; // Raw module name to be translated. It will be translated on init.

    protected syncObserver?: CoreEventObserver; // It will observe the sync auto event.
    protected syncEventName?: string; // Auto sync event name.

    constructor(
        @Optional() @Inject('') loggerName: string = 'CoreCourseModuleMainResourceComponent',
        protected content?: IonContent,
        courseContentsPage?: CoreCourseContentsPage,
    ) {
        super(loggerName, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await super.ngOnInit();

        this.hasOffline = false;
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
     * @returns True if refresh is needed, false otherwise.
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
     * @returns Resolved when done.
     */
    protected async refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        await CoreUtils.ignoreErrors(Promise.all([
            this.invalidateContent(),
            this.showCompletion ? CoreCourse.invalidateModule(this.module.id) : undefined,
        ]));

        await this.loadContent(true, sync, showErrors);
    }

    /**
     * Show loading and perform the load content function.
     *
     * @param sync If the fetch needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @returns Resolved when done.
     */
    protected async showLoadingAndFetch(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        this.showLoading = true;
        this.content?.scrollToTop();

        await this.loadContent(false, sync, showErrors);
    }

    /**
     * Show loading and perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @returns Resolved when done.
     */
    protected showLoadingAndRefresh(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        this.showLoading = true;
        this.content?.scrollToTop();

        return this.refreshContent(sync, showErrors);
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @returns Promise resolved when done.
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
     * @returns Promise resolved when done.
     */
    protected async loadContent(refresh?: boolean, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        try {
            if (refresh && this.showCompletion) {
                await CoreUtils.ignoreErrors(this.fetchModule());
            }

            await this.fetchContent(refresh, sync, showErrors);

            this.finishSuccessfulFetch();
        } catch (error) {
            if (!refresh && !CoreSites.getCurrentSite()?.isOfflineDisabled() && this.isNotFoundError(error)) {
                // Module not found, retry without using cache.
                return await this.refreshContent(sync);
            }

            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @returns Promise resolved when done.
     */
    protected async sync(): Promise<unknown> {
        return {};
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @returns If suceed or not.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected hasSyncSucceed(result: unknown): boolean {
        return true;
    }

    /**
     * Tries to synchronize the activity.
     *
     * @param showErrors If show errors to the user of hide them.
     * @returns Promise resolved with true if sync succeed, or false if failed.
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
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.syncObserver?.off();
    }

}
