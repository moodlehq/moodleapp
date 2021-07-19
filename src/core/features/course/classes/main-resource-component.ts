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

import { CoreConstants } from '@/core/constants';
import { AddonBlog } from '@addons/blog/services/blog';
import { AddonBlogMainMenuHandlerService } from '@addons/blog/services/handlers/mainmenu';
import { OnInit, OnDestroy, Input, Output, EventEmitter, Component, Optional, Inject } from '@angular/core';
import { Params } from '@angular/router';
import { IonRefresher } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';

import { CoreTextErrorObject, CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreCourseContentsPage } from '../pages/contents/contents';
import { CoreCourse } from '../services/course';
import { CoreCourseHelper, CoreCourseModule } from '../services/course-helper';
import { CoreCourseModuleDelegate, CoreCourseModuleMainComponent } from '../services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../services/module-prefetch-delegate';

/**
 * Result of a resource download.
 */
export type CoreCourseResourceDownloadResult = {
    failed?: boolean; // Whether the download has failed.
    error?: string | CoreTextErrorObject; // The error in case it failed.
};

/**
 * Template class to easily create CoreCourseModuleMainComponent of resources (or activities without syncing).
 */
@Component({
    template: '',
})
export class CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {

    @Input() module!: CoreCourseModule; // The module of the component.
    @Input() courseId!: number; // Course ID the component belongs to.
    @Output() dataRetrieved = new EventEmitter<unknown>(); // Called to notify changes the index page from the main component.

    loaded = false; // If the component has been loaded.
    component?: string; // Component name.
    componentId?: number; // Component ID.
    blog?: boolean; // If blog is available.

    // Data for context menu.
    externalUrl?: string; // External URL to open in browser.
    description?: string; // Module description.
    refreshIcon = CoreConstants.ICON_LOADING; // Refresh icon, normally spinner or refresh.
    prefetchStatusIcon?: string; // Used when calling fillContextMenu.
    prefetchStatus?: string; // Used when calling fillContextMenu.
    prefetchText?: string; // Used when calling fillContextMenu.
    size?: string; // Used when calling fillContextMenu.
    isDestroyed = false; // Whether the component is destroyed, used when calling fillContextMenu.
    contextMenuStatusObserver?: CoreEventObserver; // Observer of package status, used when calling fillContextMenu.
    contextFileStatusObserver?: CoreEventObserver; // Observer of file status, used when calling fillContextMenu.
    showCompletion = false; // Whether to show completion inside the activity.

    protected fetchContentDefaultError = 'core.course.errorgetmodule'; // Default error to show when loading contents.
    protected isCurrentView = false; // Whether the component is in the current view.
    protected siteId?: string; // Current Site ID.
    protected statusObserver?: CoreEventObserver; // Observer of package status. Only if setStatusListener is called.
    protected currentStatus?: string; // The current status of the module. Only if setStatusListener is called.
    protected completionObserver?: CoreEventObserver;
    protected logger: CoreLogger;
    protected debouncedUpdateModule?: () => void; // Update the module after a certain time.

    constructor(
        @Optional() @Inject('') loggerName: string = 'CoreCourseModuleMainResourceComponent',
        protected courseContentsPage?: CoreCourseContentsPage,
    ) {
        this.logger = CoreLogger.getInstance(loggerName);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.siteId = CoreSites.getCurrentSiteId();
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.courseId = this.courseId || this.module.course!;
        this.showCompletion = !!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.11');

        if (this.showCompletion) {
            this.completionObserver = CoreEvents.on(CoreEvents.COMPLETION_MODULE_VIEWED, async (data) => {
                if (data && data.cmId == this.module.id) {
                    await CoreCourse.invalidateModule(this.module.id);

                    this.fetchModule();
                }
            });

            this.debouncedUpdateModule = CoreUtils.debounce(() => {
                this.fetchModule();
            }, 10000);
        }

        this.blog = await AddonBlog.isPluginEnabled();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher | null, done?: () => void, showErrors: boolean = false): Promise<void> {
        if (!this.loaded || !this.module) {
            // Module can be undefined if course format changes from single activity to weekly/topics.
            return;
        }

        // If it's a single activity course and the refresher is displayed within the component,
        // call doRefresh on the section page to refresh the course data.
        if (this.courseContentsPage && !CoreCourseModuleDelegate.displayRefresherInSingleActivity(this.module.modname)) {
            await CoreUtils.ignoreErrors(this.courseContentsPage.doRefresh());
        }

        await CoreUtils.ignoreErrors(this.refreshContent(true, showErrors));

        refresher?.complete();
        done && done();
    }

    /**
     * Perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        this.refreshIcon = CoreConstants.ICON_LOADING;

        try {
            await CoreUtils.ignoreErrors(Promise.all([
                this.invalidateContent(),
                this.showCompletion ? CoreCourse.invalidateModule(this.module.id) : undefined,
            ]));

            if (this.showCompletion) {
                this.fetchModule();
            }

            await this.loadContent(true);
        } finally {
            this.refreshIcon = CoreConstants.ICON_REFRESH;
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        return;
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async fetchContent(refresh?: boolean): Promise<void> {
        return;
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async loadContent(refresh?: boolean): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        try {
            await this.fetchContent(refresh);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        } finally {
            this.loaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;
        }
    }

    /**
     * Fill the context menu options
     */
    protected fillContextMenu(refresh: boolean = false): void {
        // All data obtained, now fill the context menu.
        CoreCourseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
    }

    /**
     * Check if the module is prefetched or being prefetched. To make it faster, just use the data calculated by fillContextMenu.
     * This means that you need to call fillContextMenu to make this work.
     */
    protected isPrefetched(): boolean {
        return this.prefetchStatus != CoreConstants.NOT_DOWNLOADABLE && this.prefetchStatus != CoreConstants.NOT_DOWNLOADED;
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        CoreTextUtils.viewText(Translate.instant('core.description'), this.description!, {
            component: this.component,
            componentId: this.module.id,
            filter: true,
            contextLevel: 'module',
            instanceId: this.module.id,
            courseId: this.courseId,
        });
    }

    /**
     * Go to blog posts.
     */
    async gotoBlog(): Promise<void> {
        const params: Params = { cmId: this.module.id };

        await CoreNavigator.navigateToSitePath(AddonBlogMainMenuHandlerService.PAGE_NAME, { params });
    }

    /**
     * Prefetch the module.
     *
     * @param done Function to call when done.
     */
    prefetch(done?: () => void): void {
        CoreCourseHelper.contextMenuPrefetch(this, this.module, this.courseId, done);
    }

    /**
     * Confirm and remove downloaded files.
     *
     * @param done Function to call when done.
     */
    removeFiles(done?: () => void): void {
        if (this.prefetchStatus == CoreConstants.DOWNLOADING) {
            CoreDomUtils.showAlertTranslated(undefined, 'core.course.cannotdeletewhiledownloading');

            return;
        }

        CoreCourseHelper.confirmAndRemoveFiles(this.module, this.courseId, done);
    }

    /**
     * Get message about an error occurred while downloading files.
     *
     * @param error The specific error.
     * @param multiLine Whether to put each message in a different paragraph or in a single line.
     */
    protected getErrorDownloadingSomeFilesMessage(error: string | CoreTextErrorObject, multiLine?: boolean): string {
        if (multiLine) {
            return CoreTextUtils.buildSeveralParagraphsMessage([
                Translate.instant('core.errordownloadingsomefiles'),
                error,
            ]);
        } else {
            error = CoreTextUtils.getErrorMessageFromError(error) || error;

            return Translate.instant('core.errordownloadingsomefiles') + (error ? ' ' + error : '');
        }
    }

    /**
     * Show an error occurred while downloading files.
     *
     * @param error The specific error.
     */
    protected showErrorDownloadingSomeFiles(error: string | CoreTextErrorObject): void {
        CoreDomUtils.showErrorModal(this.getErrorDownloadingSomeFilesMessage(error, true));
    }

    /**
     * Displays some data based on the current status.
     *
     * @param status The current status.
     * @param previousStatus The previous status. If not defined, there is no previous status.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected showStatus(status: string, previousStatus?: string): void {
        // To be overridden.
    }

    /**
     * Watch for changes on the status.
     *
     * @return Promise resolved when done.
     */
    protected async setStatusListener(): Promise<void> {
        if (typeof this.statusObserver != 'undefined') {
            return;
        }

        // Listen for changes on this module status.
        this.statusObserver = CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
            if (data.componentId != this.module.id || data.component != this.component) {
                return;
            }

            // The status has changed, update it.
            const previousStatus = this.currentStatus;
            this.currentStatus = data.status;

            this.showStatus(this.currentStatus, previousStatus);
        }, this.siteId);

        // Also, get the current status.
        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(this.module, this.courseId);

        this.currentStatus = status;
        this.showStatus(status);
    }

    /**
     * Download a resource if needed.
     * If the download call fails the promise won't be rejected, but the error will be included in the returned object.
     * If module.contents cannot be loaded then the Promise will be rejected.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async downloadResourceIfNeeded(
        refresh?: boolean,
        contentsAlreadyLoaded?: boolean,
    ): Promise<CoreCourseResourceDownloadResult> {

        const result: CoreCourseResourceDownloadResult = {
            failed: false,
        };

        // Get module status to determine if it needs to be downloaded.
        await this.setStatusListener();

        if (this.currentStatus != CoreConstants.DOWNLOADED) {
            // Download content. This function also loads module contents if needed.
            try {
                await CoreCourseModulePrefetchDelegate.downloadModule(this.module, this.courseId);

                // If we reach here it means the download process already loaded the contents, no need to do it again.
                contentsAlreadyLoaded = true;
            } catch (error) {
                // Mark download as failed but go on since the main files could have been downloaded.
                result.failed = true;
                result.error = error;
            }
        }

        if (!this.module.contents.length || (refresh && !contentsAlreadyLoaded)) {
            // Try to load the contents.
            const ignoreCache = refresh && CoreApp.isOnline();

            try {
                await CoreCourse.loadModuleContents(this.module, this.courseId, undefined, false, ignoreCache);
            } catch (error) {
                // Error loading contents. If we ignored cache, try to get the cached value.
                if (ignoreCache && !this.module.contents) {
                    await CoreCourse.loadModuleContents(this.module, this.courseId);
                } else if (!this.module.contents) {
                    // Not able to load contents, throw the error.
                    throw error;
                }
            }
        }

        return result;
    }

    /**
     * The completion of the modules has changed.
     *
     * @return Promise resolved when done.
     */
    async onCompletionChange(): Promise<void> {
        // Update the module data after a while.
        this.debouncedUpdateModule?.();
    }

    /**
     * Fetch module.
     *
     * @return Promise resolved when done.
     */
    protected async fetchModule(): Promise<void> {
        const module = await CoreCourse.getModule(this.module.id, this.courseId);

        CoreCourseHelper.calculateModuleCompletionData(module, this.courseId);

        await CoreCourseHelper.loadModuleOfflineCompletion(this.courseId, module);

        this.module = module;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.contextMenuStatusObserver?.off();
        this.contextFileStatusObserver?.off();
        this.statusObserver?.off();
        this.completionObserver?.off();
    }

    /**
     * User entered the page that contains the component. This function should be called by the page that contains this component.
     */
    ionViewDidEnter(): void {
        this.isCurrentView = true;
    }

    /**
     * User left the page that contains the component. This function should be called by the page that contains this component.
     */
    ionViewDidLeave(): void {
        this.isCurrentView = false;
    }

    /**
     * User will enter the page that contains the component. This function should be called by the page that contains the component.
     */
    ionViewWillEnter(): void {
        // To be overridden.
    }

    /**
     * User will leave the page that contains the component. This function should be called by the page that contains the component.
     */
    ionViewWillLeave(): void {
        // To be overridden.
    }

}
