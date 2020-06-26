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

import { OnInit, OnDestroy, Input, Output, EventEmitter, Injector } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider, CoreTextErrorObject } from '@providers/utils/text';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModuleMainComponent, CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseSectionPage } from '@core/course/pages/section/section.ts';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonBlogProvider } from '@addon/blog/providers/blog';
import { CoreConstants } from '@core/constants';

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
export class CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module of the component.
    @Input() courseId: number; // Course ID the component belongs to.
    @Output() dataRetrieved?: EventEmitter<any>; // Called to notify changes the index page from the main component.

    loaded: boolean; // If the component has been loaded.
    component: string; // Component name.
    componentId: number; // Component ID.
    blog: boolean; // If blog is avalaible.

    // Data for context menu.
    externalUrl: string; // External URL to open in browser.
    description: string; // Module description.
    refreshIcon: string; // Refresh icon, normally spinner or refresh.
    prefetchStatusIcon: string; // Used when calling fillContextMenu.
    prefetchStatus: string; // Used when calling fillContextMenu.
    prefetchText: string; // Used when calling fillContextMenu.
    size: string; // Used when calling fillContextMenu.

    protected isDestroyed; // Whether the component is destroyed, used when calling fillContextMenu.
    protected contextMenuStatusObserver; // Observer of package status changed, used when calling fillContextMenu.
    protected contextFileStatusObserver; // Observer of file status changed, used when calling fillContextMenu.
    protected fetchContentDefaultError = 'core.course.errorgetmodule'; // Default error to show when loading contents.
    protected isCurrentView: boolean; // Whether the component is in the current view.
    protected siteId: string; // Current Site ID.
    protected statusObserver: any; // It will observe changes on the status of the module. Only if setStatusListener is called.
    protected currentStatus: string; // The current status of the module. Only if setStatusListener is called.

    // List of services that will be injected using injector.
    // It's done like this so subclasses don't have to send all the services to the parent in the constructor.
    protected textUtils: CoreTextUtilsProvider;
    protected courseHelper: CoreCourseHelperProvider;
    protected translate: TranslateService;
    protected domUtils: CoreDomUtilsProvider;
    protected moduleDelegate: CoreCourseModuleDelegate;
    protected courseSectionPage: CoreCourseSectionPage;
    protected linkHelper: CoreContentLinksHelperProvider;
    protected navCtrl: NavController;
    protected blogProvider: AddonBlogProvider;
    protected sitesProvider: CoreSitesProvider;
    protected eventsProvider: CoreEventsProvider;
    protected modulePrefetchDelegate: CoreCourseModulePrefetchDelegate;
    protected courseProvider: CoreCourseProvider;
    protected appProvider: CoreAppProvider;

    protected logger;

    constructor(injector: Injector, loggerName: string = 'CoreCourseModuleMainResourceComponent') {
        this.textUtils = injector.get(CoreTextUtilsProvider);
        this.courseHelper = injector.get(CoreCourseHelperProvider);
        this.translate = injector.get(TranslateService);
        this.domUtils = injector.get(CoreDomUtilsProvider);
        this.moduleDelegate = injector.get(CoreCourseModuleDelegate);
        this.courseSectionPage = injector.get(CoreCourseSectionPage, null);
        this.linkHelper = injector.get(CoreContentLinksHelperProvider);
        this.navCtrl = injector.get(NavController, null);
        this.blogProvider = injector.get(AddonBlogProvider, null);
        this.sitesProvider = injector.get(CoreSitesProvider);
        this.eventsProvider = injector.get(CoreEventsProvider);
        this.modulePrefetchDelegate = injector.get(CoreCourseModulePrefetchDelegate);
        this.courseProvider = injector.get(CoreCourseProvider);
        this.appProvider = injector.get(CoreAppProvider);

        this.dataRetrieved = new EventEmitter();

        const loggerProvider = injector.get(CoreLoggerProvider);
        this.logger = loggerProvider.getInstance(loggerName);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.siteId = this.sitesProvider.getCurrentSiteId();
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.loaded = false;
        this.refreshIcon = 'spinner';
        this.blogProvider.isPluginEnabled().then((enabled) => {
            this.blog = enabled;
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors: boolean = false): Promise<any> {
        if (this.loaded && this.module) {
            /* If it's a single activity course and the refresher is displayed within the component,
               call doRefresh on the section page to refresh the course data. */
            let promise;
            if (this.courseSectionPage && !this.moduleDelegate.displayRefresherInSingleActivity(this.module.modname)) {
                promise = this.courseSectionPage.doRefresh();
            } else {
                promise = Promise.resolve();
            }

            return promise.finally(() => {
                return this.refreshContent(true, showErrors).finally(() => {
                    refresher && refresher.complete();
                    done && done();
                });
            });
        }

        return Promise.resolve();
    }

    /**
     * Perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
     protected refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<any> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return Promise.resolve();
        }

        this.refreshIcon = 'spinner';

        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        // E.g. when changing course format we cannot know when will this.module become undefined, so it could cause errors.
        let promise;

        try {
            promise = this.invalidateContent();
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);

            promise = Promise.resolve();
        }

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.loadContent(true);
        }).finally(() =>  {
            this.refreshIcon = 'refresh';
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected loadContent(refresh?: boolean): Promise<any> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return Promise.resolve();
        }

        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        // E.g. when changing course format we cannot know when will this.module become undefined, so it could cause errors.
        let promise;

        try {
            promise = this.fetchContent(refresh);
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);

            promise = Promise.resolve();
        }

        return promise.catch((error) => {
            // Error getting data, fail.
            this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
        });
    }

    /**
     * Fill the context menu options
     */
    protected fillContextMenu(refresh: boolean = false): void {
        // All data obtained, now fill the context menu.
        this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
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
        this.textUtils.viewText(this.translate.instant('core.description'), this.description, {
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
     *
     * @param event Event.
     */
    gotoBlog(event: any): Promise<any> {
        return this.linkHelper.goInSite(this.navCtrl, 'AddonBlogEntriesPage', { cmId: this.module.id });
    }

    /**
     * Prefetch the module.
     *
     * @param done Function to call when done.
     */
    prefetch(done?: () => void): void {
        this.courseHelper.contextMenuPrefetch(this, this.module, this.courseId, done);
    }

    /**
     * Confirm and remove downloaded files.
     *
     * @param done Function to call when done.
     */
    removeFiles(done?: () => void): void {
        if (this.prefetchStatus == CoreConstants.DOWNLOADING) {
            this.domUtils.showAlertTranslated(null, 'core.course.cannotdeletewhiledownloading');

            return;
        }

        this.courseHelper.confirmAndRemoveFiles(this.module, this.courseId, done);
    }

    /**
     * Get message about an error occurred while downloading files.
     *
     * @param error The specific error.
     * @param multiLine Whether to put each message in a different paragraph or in a single line.
     */
    protected getErrorDownloadingSomeFilesMessage(error: string | CoreTextErrorObject, multiLine?: boolean): string {
        if (multiLine) {
            return this.textUtils.buildSeveralParagraphsMessage([
                this.translate.instant('core.errordownloadingsomefiles'),
                error,
            ]);
        } else {
            error = this.textUtils.getErrorMessageFromError(error);

            return this.translate.instant('core.errordownloadingsomefiles') + (error ? ' ' + error : '');
        }
    }

    /**
     * Show an error occurred while downloading files.
     *
     * @param error The specific error.
     */
    protected showErrorDownloadingSomeFiles(error: string | CoreTextErrorObject): void {
        this.domUtils.showErrorModal(this.getErrorDownloadingSomeFilesMessage(error, true));
    }

    /**
     * Displays some data based on the current status.
     *
     * @param status The current status.
     * @param previousStatus The previous status. If not defined, there is no previous status.
     */
    protected showStatus(status: string, previousStatus?: string): void {
        // To be overridden.
    }

    /**
     * Watch for changes on the status.
     *
     * @return Promise resolved when done.
     */
    protected setStatusListener(): Promise<any> {
        if (typeof this.statusObserver == 'undefined') {
            // Listen for changes on this module status.
            this.statusObserver = this.eventsProvider.on(CoreEventsProvider.PACKAGE_STATUS_CHANGED, (data) => {
                if (data.componentId === this.module.id && data.component === this.component) {
                    // The status has changed, update it.
                    const previousStatus = this.currentStatus;
                    this.currentStatus = data.status;

                    this.showStatus(this.currentStatus, previousStatus);
                }
            }, this.siteId);

            // Also, get the current status.
            return this.modulePrefetchDelegate.getModuleStatus(this.module, this.courseId).then((status) => {
                this.currentStatus = status;
                this.showStatus(status);
            });
        }

        return Promise.resolve();
    }

    /**
     * Download a resource if needed.
     * If the download call fails the promise won't be rejected, but the error will be included in the returned object.
     * If module.contents cannot be loaded then the Promise will be rejected.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async downloadResourceIfNeeded(refresh?: boolean, contentsAlreadyLoaded?: boolean)
            : Promise<CoreCourseResourceDownloadResult> {

        const result: CoreCourseResourceDownloadResult = {
            failed: false,
        };

        // Get module status to determine if it needs to be downloaded.
        await this.setStatusListener();

        if (this.currentStatus != CoreConstants.DOWNLOADED) {
            // Download content. This function also loads module contents if needed.
            try {
                await this.modulePrefetchDelegate.downloadModule(this.module, this.courseId);

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
            const ignoreCache = refresh && this.appProvider.isOnline();

            try {
                await this.courseProvider.loadModuleContents(this.module, this.courseId, undefined, false, ignoreCache);
            } catch (error) {
                // Error loading contents. If we ignored cache, try to get the cached value.
                if (ignoreCache && !this.module.contents) {
                    await this.courseProvider.loadModuleContents(this.module, this.courseId);
                } else if (!this.module.contents) {
                    // Not able to load contents, throw the error.
                    throw error;
                }
            }
        }

        return result;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.contextMenuStatusObserver && this.contextMenuStatusObserver.off();
        this.contextFileStatusObserver && this.contextFileStatusObserver.off();
        this.statusObserver && this.statusObserver.off();
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
}
