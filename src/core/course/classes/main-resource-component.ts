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

import { OnInit, OnDestroy, Input, Output, EventEmitter, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseModuleMainComponent, CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseSectionPage } from '@core/course/pages/section/section.ts';

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

    // Data for context menu.
    externalUrl: string; // External URL to open in browser.
    description: string; // Module description.
    refreshIcon: string; // Refresh icon, normally spinner or refresh.
    prefetchStatusIcon: string; // Used when calling fillContextMenu.
    prefetchText: string; // Used when calling fillContextMenu.
    size: string; // Used when calling fillContextMenu.

    protected isDestroyed; // Whether the component is destroyed, used when calling fillContextMenu.
    protected statusObserver; // Observer of package status changed, used when calling fillContextMenu.
    protected fetchContentDefaultError = 'core.course.errorgetmodule'; // Default error to show when loading contents.
    protected isCurrentView: boolean; // Whether the component is in the current view.

    // List of services that will be injected using injector.
    // It's done like this so subclasses don't have to send all the services to the parent in the constructor.
    protected textUtils: CoreTextUtilsProvider;
    protected courseHelper: CoreCourseHelperProvider;
    protected translate: TranslateService;
    protected domUtils: CoreDomUtilsProvider;
    protected moduleDelegate: CoreCourseModuleDelegate;
    protected courseSectionPage: CoreCourseSectionPage;

    constructor(injector: Injector) {
        this.textUtils = injector.get(CoreTextUtilsProvider);
        this.courseHelper = injector.get(CoreCourseHelperProvider);
        this.translate = injector.get(TranslateService);
        this.domUtils = injector.get(CoreDomUtilsProvider);
        this.moduleDelegate = injector.get(CoreCourseModuleDelegate);
        this.courseSectionPage = injector.get(CoreCourseSectionPage, null);
        this.dataRetrieved = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.loaded = false;
        this.refreshIcon = 'spinner';
    }

    /**
     * Refresh the data.
     *
     * @param {any}       [refresher] Refresher.
     * @param {Function}  [done] Function to call when done.
     * @param {boolean}   [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors: boolean = false): Promise<any> {
        if (this.loaded) {
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
     * @param  {boolean}      [sync=false]       If the refresh needs syncing.
     * @param  {boolean}      [showErrors=false] Wether to show errors to the user or hide them.
     * @return {Promise<any>} Resolved when done.
     */
     protected refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<any> {
        this.refreshIcon = 'spinner';

        return this.invalidateContent().catch(() => {
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
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Download the component contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadContent(refresh?: boolean): Promise<any> {
        return this.fetchContent(refresh).catch((error) => {
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
     * Expand the description.
     */
    expandDescription(): void {
        this.textUtils.expandText(this.translate.instant('core.description'), this.description, this.component, this.module.id);
    }

    /**
     * Prefetch the module.
     */
    prefetch(): void {
        this.courseHelper.contextMenuPrefetch(this, this.module, this.courseId);
    }

    /**
     * Confirm and remove downloaded files.
     */
    removeFiles(): void {
        this.courseHelper.confirmAndRemoveFiles(this.module, this.courseId);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
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
