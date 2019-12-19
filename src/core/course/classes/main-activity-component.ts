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

import { Injector, Input, NgZone } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreEventsProvider } from '@providers/events';
import { Network } from '@ionic-native/network';
import { CoreAppProvider } from '@providers/app';
import { CoreCourseModuleMainResourceComponent } from './main-resource-component';

/**
 * Template class to easily create CoreCourseModuleMainComponent of activities.
 */
export class CoreCourseModuleMainActivityComponent extends CoreCourseModuleMainResourceComponent {
    @Input() group?: number; // Group ID the component belongs to.

    moduleName: string; // Raw module name to be translated. It will be translated on init.

    // Data for context menu.
    syncIcon: string; // Sync icon.
    hasOffline: boolean; // If it has offline data to be synced.
    isOnline: boolean; // If the app is online or not.

    protected siteId: string; // Current Site ID.
    protected syncObserver: any; // It will observe the sync auto event.
    protected statusObserver: any; // It will observe changes on the status of the activity. Only if setStatusListener is called.
    protected onlineObserver: any; // It will observe the status of the network connection.
    protected syncEventName: string; // Auto sync event name.
    protected currentStatus: string; // The current status of the activity. Only if setStatusListener is called.

    // List of services that will be injected using injector.
    // It's done like this so subclasses don't have to send all the services to the parent in the constructor.
    protected sitesProvider: CoreSitesProvider;
    protected courseProvider: CoreCourseProvider;
    protected appProvider: CoreAppProvider;
    protected eventsProvider: CoreEventsProvider;
    protected modulePrefetchDelegate: CoreCourseModulePrefetchDelegate;

    constructor(injector: Injector, protected content?: Content, loggerName: string = 'CoreCourseModuleMainResourceComponent') {
        super(injector, loggerName);

        this.sitesProvider = injector.get(CoreSitesProvider);
        this.courseProvider = injector.get(CoreCourseProvider);
        this.appProvider = injector.get(CoreAppProvider);
        this.eventsProvider = injector.get(CoreEventsProvider);
        this.modulePrefetchDelegate = injector.get(CoreCourseModulePrefetchDelegate);

        const network = injector.get(Network);
        const zone = injector.get(NgZone);

        // Refresh online status when changes.
        this.onlineObserver = network.onchange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.isOnline = this.appProvider.isOnline();
            });
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.hasOffline = false;
        this.syncIcon = 'spinner';
        this.siteId = this.sitesProvider.getCurrentSiteId();
        this.moduleName = this.courseProvider.translateModuleName(this.moduleName);

        if (this.syncEventName) {
            // Refresh data if this discussion is synchronized automatically.
            this.syncObserver = this.eventsProvider.on(this.syncEventName, (data) => {
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
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        return false;
    }

    /**
     * An autosync event has been received, check if refresh is needed and update the view.
     *
     * @param syncEventData Data receiven on sync observer.
     */
    protected autoSyncEventReceived(syncEventData: any): void {
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
    protected refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<any> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return Promise.resolve();
        }

        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';

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
            return this.loadContent(true, sync, showErrors);
        }).finally(() =>  {
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });
    }

    /**
     * Show loading and perform the load content function.
     *
     * @param sync If the fetch needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    protected showLoadingAndFetch(sync: boolean = false, showErrors: boolean = false): Promise<any> {
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';
        this.loaded = false;
        this.domUtils.scrollToTop(this.content);

        return this.loadContent(false, sync, showErrors).finally(() => {
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });
    }

    /**
     * Show loading and perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    protected showLoadingAndRefresh(sync: boolean = false, showErrors: boolean = false): Promise<any> {
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';
        this.loaded = false;
        this.domUtils.scrollToTop(this.content);

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
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Promise resolved when done.
     */
    protected loadContent(refresh?: boolean, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        this.isOnline = this.appProvider.isOnline();

        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return Promise.resolve();
        }

        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        // E.g. when changing course format we cannot know when will this.module become undefined, so it could cause errors.
        let promise;

        try {
            promise = this.fetchContent(refresh, sync, showErrors);
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);

            promise = Promise.resolve();
        }

        return promise.catch((error) => {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return this.refreshContent(sync);
            }

            // Error getting data, fail.
            this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });
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
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return Promise.resolve(true);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @return If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return true;
    }

    /**
     * Tries to synchronize the activity.
     *
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved with true if sync succeed, or false if failed.
     */
    protected syncActivity(showErrors: boolean = false): Promise<boolean> {
        return this.sync().then((result) => {
            if (result.warnings && result.warnings.length) {
                this.domUtils.showErrorModal(result.warnings[0]);
            }

            return this.hasSyncSucceed(result);
        }).catch((error) => {
            if (showErrors) {
                this.domUtils.showErrorModalDefault(error, 'core.errorsync', true);
            }

            return false;
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.onlineObserver && this.onlineObserver.unsubscribe();
        this.syncObserver && this.syncObserver.off();
        this.statusObserver && this.statusObserver.off();
    }
}
