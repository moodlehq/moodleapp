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

import { DownloadStatus } from '@/core/constants';
import { OnInit, OnDestroy, Input, Output, EventEmitter, Component, inject } from '@angular/core';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@static/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreLogger } from '@static/logger';
import { CoreCourseModuleSummaryResult } from '../components/module-summary/module-summary';
import CoreCourseContentsPage from '../pages/contents/contents';
import { CoreCourse, CoreCourseModuleContentFile } from '../services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '../services/course-helper';
import { CoreCourseModuleDelegate, CoreCourseModuleMainComponent } from '../services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../services/module-prefetch-delegate';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUrl } from '@static/url';
import { CoreTime } from '@static/time';
import { CoreText } from '@static/text';
import { CoreModals } from '@services/overlays/modals';
import { CoreErrorHelper, CoreErrorObject } from '@services/error-helper';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseModuleHelper } from '../services/course-module-helper';

/**
 * Result of a resource download.
 */
export type CoreCourseResourceDownloadResult = {
    failed?: boolean; // Whether the download has failed.
    error?: string | CoreErrorObject; // The error in case it failed.
};

/**
 * Template class to easily create CoreCourseModuleMainComponent of resources (or activities without syncing).
 */
@Component({
    template: '',
})
export class CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {

    @Input({ required: true }) module!: CoreCourseModuleData; // The module of the component.
    @Input({ required: true }) courseId!: number; // Course ID the component belongs to.
    @Output() dataRetrieved = new EventEmitter<unknown>(); // Called to notify changes the index page from the main component.

    showLoading = true; // Whether to show loading.
    component?: string; // Component name.
    componentId?: number; // Component ID.
    hasOffline = false; // Resources don't have any data to sync.
    description?: string; // Module description.
    pluginName?: string; // The plugin name without "mod_", e.g. assign or book.

    protected fetchContentDefaultError = 'core.course.errorgetmodule'; // Default error to show when loading contents.
    protected isCurrentView = false; // Whether the component is in the current view.
    protected siteId?: string; // Current Site ID.
    protected statusObserver?: CoreEventObserver; // Observer of package status. Only if setStatusListener is called.
    currentStatus?: DownloadStatus; // The current status of the module. Only if setStatusListener is called.
    downloadTimeReadable?: string; // Last download time in a readable format. Only if setStatusListener is called.

    protected completionObserver?: CoreEventObserver;
    protected logger: CoreLogger;
    protected debouncedUpdateModule?: () => void; // Update the module after a certain time.
    protected showCompletion = false; // Whether to show completion inside the activity.
    protected displayDescription = true; // Wether to show Module description on module page, and not on summary or the contrary.
    protected isDestroyed = false; // Whether the component is destroyed.
    protected checkCompletionAfterLog = true; // Whether to check if completion has changed after calling logActivity.
    protected finishSuccessfulFetch: () => void;

    protected courseContentsPage = inject(CoreCourseContentsPage, { optional: true });

    constructor() {
        this.logger = CoreLogger.getInstance(this.constructor.name);
        this.finishSuccessfulFetch = CoreTime.once(() => this.performFinishSuccessfulFetch());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.siteId = CoreSites.getCurrentSiteId();
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.courseId = this.courseId || this.module.course;
        this.showCompletion = !!CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('3.11');

        if (this.showCompletion) {
            this.module.completiondata =
                await CoreCourseHelper.loadOfflineCompletionData(this.module.id, this.module.completiondata);

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
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param showErrors If show errors to the user of hide them.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement | null, showErrors = false): Promise<void> {
        if (!this.module) {
            // Module can be undefined if course format changes from single activity to weekly/topics.
            return;
        }

        // If it's a single activity course and the refresher is displayed within the component,
        // call doRefresh on the section page to refresh the course data.
        if (this.courseContentsPage && !CoreCourseModuleDelegate.displayRefresherInSingleActivity(this.module.modname)) {
            await CorePromiseUtils.ignoreErrors(this.courseContentsPage.doRefresh());
        }

        await CorePromiseUtils.ignoreErrors(this.refreshContent(true, showErrors));

        refresher?.complete();
    }

    /**
     * Perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @returns Resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async refreshContent(sync = false, showErrors = false): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        await CorePromiseUtils.ignoreErrors(Promise.all([
            this.invalidateContent(),
            this.showCompletion ? CoreCourse.invalidateModule(this.module.id) : undefined,
        ]));

        if (this.showCompletion) {
            this.fetchModule();
        }

        await this.loadContent(true);
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        return;
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async fetchContent(refresh?: boolean): Promise<void> {
        return;
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async loadContent(refresh?: boolean): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        try {
            await this.fetchContent(refresh);

            this.finishSuccessfulFetch();
        } catch (error) {
            if (!refresh && !CoreSites.getCurrentSite()?.isOfflineDisabled() && CoreCourseModuleHelper.isNotFoundError(error)) {
                // Module not found, retry without using cache.
                return await this.refreshContent();
            }

            CoreAlerts.showError(error, { default: Translate.instant(this.fetchContentDefaultError) });
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Updage package last downloaded.
     */
    protected async getPackageLastDownloaded(): Promise<void> {
        if (!this.module) {
            return;
        }

        const lastDownloaded =
                await CoreCourseHelper.getModulePackageLastDownloaded(this.module, this.component);

        this.downloadTimeReadable = CoreText.capitalize(lastDownloaded.downloadTimeReadable);
    }

    /**
     * Check if the module is prefetched or being prefetched.
     * To make it faster, just use the data calculated by setStatusListener.
     *
     * @returns If module has been prefetched.
     */
    protected isPrefetched(): boolean {
        return this.currentStatus !== DownloadStatus.NOT_DOWNLOADABLE &&
            this.currentStatus !== DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
    }

    /**
     * Get message about an error occurred while downloading files.
     *
     * @param error The specific error.
     * @param multiLine Whether to put each message in a different paragraph or in a single line.
     * @returns Error text message.
     */
    protected getErrorDownloadingSomeFilesMessage(error: string | CoreErrorObject, multiLine?: boolean): string {
        if (multiLine) {
            return CoreErrorHelper.buildSeveralParagraphsMessage([
                Translate.instant('core.errordownloadingsomefiles'),
                error,
            ]);
        } else {
            error = CoreErrorHelper.getErrorMessageFromError(error) || '';

            return Translate.instant('core.errordownloadingsomefiles') + (error ? ` ${error}` : '');
        }
    }

    /**
     * Show an error occurred while downloading files.
     *
     * @param error The specific error.
     */
    protected showErrorDownloadingSomeFiles(error: string | CoreErrorObject): void {
        CoreAlerts.showError(Translate.instant(this.getErrorDownloadingSomeFilesMessage(error)));
    }

    /**
     * Displays some data based on the current status.
     *
     * @param status The current status.
     * @param previousStatus The previous status. If not defined, there is no previous status.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected showStatus(status: DownloadStatus, previousStatus?: DownloadStatus): void {
        // To be overridden.
    }

    /**
     * Watch for changes on the status.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async setStatusListener(refresh?: boolean): Promise<void> {
        if (this.statusObserver === undefined) {
            // Listen for changes on this module status.
            this.statusObserver = CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
                if (data.componentId != this.module.id || data.component != this.component) {
                    return;
                }

                // The status has changed, update it.
                const previousStatus = this.currentStatus;
                this.currentStatus = data.status;

                this.getPackageLastDownloaded();

                this.showStatus(this.currentStatus, previousStatus);
            }, this.siteId);
        } else if (!refresh) {
            return;
        }

        if (refresh) {
            await CorePromiseUtils.ignoreErrors(CoreCourseModulePrefetchDelegate.invalidateCourseUpdates(this.courseId));
        }

        // Also, get the current status.
        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(this.module, this.courseId, undefined, refresh);

        this.currentStatus = status;

        this.getPackageLastDownloaded();

        this.showStatus(status);
    }

    /**
     * Download a resource if needed.
     * If the download call fails the promise won't be rejected, but the error will be included in the returned object.
     * If module.contents cannot be loaded then the Promise will be rejected.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async downloadResourceIfNeeded(
        refresh?: boolean,
        contentsAlreadyLoaded?: boolean,
    ): Promise<CoreCourseResourceDownloadResult> {

        const result: CoreCourseResourceDownloadResult = {
            failed: false,
        };

        // Get module status to determine if it needs to be downloaded.
        await this.setStatusListener(refresh);

        if (this.currentStatus !== DownloadStatus.DOWNLOADED) {
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

        if (!this.module.contents?.length || (refresh && !contentsAlreadyLoaded)) {
            // Try to load the contents.
            await this.getModuleContents(refresh);
        }

        return result;
    }

    /**
     * Get module contents.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Module contents.
     */
    protected async getModuleContents(refresh?: boolean): Promise<CoreCourseModuleContentFile[]> {
        const ignoreCache = refresh && CoreNetwork.isOnline();

        try {
            return await CoreCourse.getModuleContents(this.module, undefined, undefined, false, ignoreCache);
        } catch (error) {
            // Error loading contents. If we ignored cache, try to get the cached value.
            if (ignoreCache && !this.module.contents) {
                return await CoreCourse.getModuleContents(this.module);
            } else if (!this.module.contents) {
                // Not able to load contents, throw the error.
                throw error;
            }

            return this.module.contents;
        }
    }

    /**
     * The completion of the modules has changed.
     *
     * @returns Promise resolved when done.
     */
    async onCompletionChange(): Promise<void> {
        // Update the module data after a while.
        this.debouncedUpdateModule?.();
    }

    /**
     * Fetch module.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchModule(): Promise<void> {
        const previousCompletion = this.module.completiondata;

        const module = await CoreCourse.getModule(this.module.id, this.courseId);

        this.module.completiondata = await CoreCourseHelper.loadOfflineCompletionData(this.module.id, this.module.completiondata);

        this.module = module;

        // @todo: Temporary fix to update course page completion. This should be refactored in MOBILE-4326.
        if (previousCompletion && module.completiondata && previousCompletion.state !== module.completiondata.state) {
            await CorePromiseUtils.ignoreErrors(CoreCourse.invalidateSections(this.courseId));

            CoreEvents.trigger(CoreEvents.COMPLETION_MODULE_VIEWED, {
                courseId: this.courseId,
                cmId: module.completiondata.cmid,
            });
        }
    }

    /**
     * Opens a module summary page.
     */
    async openModuleSummary(): Promise<void> {
        if (!this.module) {
            return;
        }

        const { CoreCourseModuleSummaryComponent } = await import('@features/course/components/module-summary/module-summary');

        const data = await CoreModals.openSideModal<CoreCourseModuleSummaryResult>({
            component: CoreCourseModuleSummaryComponent,
            componentProps: {
                moduleId: this.module.id,
                module: this.module,
                description: this.description,
                component: this.component,
                courseId: this.courseId,
                hasOffline: this.hasOffline,
                displayOptions: {
                    // Show description on summary if not shown on the page.
                    displayDescription: !this.displayDescription,
                },
            },
        });

        if (data) {
            if (!this.showLoading && (data.action === 'refresh' || data.action === 'sync')) {
                this.showLoading = true;
                try {
                    await this.doRefresh(undefined, data.action === 'sync');
                } finally {
                    this.showLoading = false;
                }
            }
        }
    }

    /**
     * Finish first successful fetch.
     *
     * @returns Promise resolved when done.
     */
    protected async performFinishSuccessfulFetch(): Promise<void> {
        this.storeModuleViewed();

        // Log activity now.
        try {
            await this.logActivity();

            if (this.checkCompletionAfterLog) {
                this.checkCompletion();
            }
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Store module as viewed.
     *
     * @returns Promise resolved when done.
     */
    protected async storeModuleViewed(): Promise<void> {
        await CoreCourseModuleHelper.storeModuleViewed(this.courseId, this.module.id, { sectionId: this.module.section });
    }

    /**
     * Log activity.
     *
     * @returns Promise resolved when done.
     */
    protected async logActivity(): Promise<void> {
        // To be overridden.
    }

    /**
     * Log activity view in analytics.
     *
     * @param wsName Name of the WS used.
     * @param options Other data to send.
     * @returns Promise resolved when done.
     */
    async analyticsLogEvent(
        wsName: string,
        options: AnalyticsLogEventOptions = {},
    ): Promise<void> {
        let url: string | undefined;
        if (options.sendUrl === true || options.sendUrl === undefined) {
            if (typeof options.url === 'string') {
                url = options.url;
            } else if (this.pluginName) {
                // Use default value.
                url = CoreUrl.addParamsToUrl(`/mod/${this.pluginName}/view.php?id=${this.module.id}`, options.data);
            }
        }

        await CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: wsName,
            name: options.name || this.module.name,
            data: { id: this.module.instance, category: this.pluginName, ...options.data },
            url,
        });
    }

    /**
     * Check the module completion.
     */
    protected checkCompletion(): void {
        CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
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

type AnalyticsLogEventOptions = {
    data?: Record<string, unknown>; // Other data to send.
    name?: string; // Name to send, defaults to activity name.
    url?: string; // URL to use. If not set and sendUrl is true, a default value will be used.
    sendUrl?: boolean; // Whether to pass a URL to analytics. Defaults to true.
};
