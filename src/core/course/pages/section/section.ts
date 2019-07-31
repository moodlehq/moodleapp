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

import { Component, ViewChild, OnDestroy, Injector } from '@angular/core';
import { IonicPage, NavParams, Content, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseProvider } from '../../providers/course';
import { CoreCourseHelperProvider } from '../../providers/helper';
import { CoreCourseFormatDelegate } from '../../providers/format-delegate';
import { CoreCourseModulePrefetchDelegate } from '../../providers/module-prefetch-delegate';
import { CoreCourseOptionsDelegate, CoreCourseOptionsHandlerToDisplay,
    CoreCourseOptionsMenuHandlerToDisplay } from '../../providers/options-delegate';
import { CoreCourseSyncProvider } from '../../providers/sync';
import { CoreCourseFormatComponent } from '../../components/format/format';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@IonicPage({ segment: 'core-course-section' })
@Component({
    selector: 'page-core-course-section',
    templateUrl: 'section.html',
})
export class CoreCourseSectionPage implements OnDestroy {
    @ViewChild('courseSectionContent') content: Content;
    @ViewChild(CoreCourseFormatComponent) formatComponent: CoreCourseFormatComponent;
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;

    title: string;
    course: any;
    sections: any[];
    sectionId: number;
    sectionNumber: number;
    courseHandlers: CoreCourseOptionsHandlerToDisplay[];
    courseMenuHandlers: CoreCourseOptionsMenuHandlerToDisplay[] = [];
    dataLoaded: boolean;
    downloadEnabled = false;
    downloadEnabledIcon = 'square-outline'; // Disabled by default.
    prefetchCourseData = {
        prefetchCourseIcon: 'spinner',
        title: 'core.course.downloadcourse'
    };
    downloadCourseEnabled: boolean;
    moduleId: number;
    displayEnableDownload: boolean;
    displayRefresher: boolean;

    protected module: any;
    protected modParams: any;
    protected completionObserver;
    protected courseStatusObserver;
    protected selectTabObserver;
    protected syncObserver;
    protected firstTabName: string;
    protected isDestroyed = false;

    constructor(navParams: NavParams, private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private courseOptionsDelegate: CoreCourseOptionsDelegate,
            private translate: TranslateService, private courseHelper: CoreCourseHelperProvider, eventsProvider: CoreEventsProvider,
            private textUtils: CoreTextUtilsProvider, private coursesProvider: CoreCoursesProvider,
            sitesProvider: CoreSitesProvider, private navCtrl: NavController, private injector: Injector,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate, private syncProvider: CoreCourseSyncProvider,
            private utils: CoreUtilsProvider) {
        this.course = navParams.get('course');
        this.sectionId = navParams.get('sectionId');
        this.sectionNumber = navParams.get('sectionNumber');
        this.module = navParams.get('module');
        this.firstTabName = navParams.get('selectedTab');
        this.modParams = navParams.get('modParams');

        // Get the title to display. We dont't have sections yet.
        this.title = courseFormatDelegate.getCourseTitle(this.course);
        this.displayEnableDownload = !sitesProvider.getCurrentSite().isOfflineDisabled() &&
            courseFormatDelegate.displayEnableDownload(this.course);
        this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();

        // Check if the course format requires the view to be refreshed when completion changes.
        courseFormatDelegate.shouldRefreshWhenCompletionChanges(this.course).then((shouldRefresh) => {
            if (shouldRefresh) {
                this.completionObserver = eventsProvider.on(CoreEventsProvider.COMPLETION_MODULE_VIEWED, (data) => {
                    if (data && data.courseId == this.course.id) {
                        this.refreshAfterCompletionChange(true);
                    }
                });

                this.syncObserver = eventsProvider.on(CoreCourseSyncProvider.AUTO_SYNCED, (data) => {
                    if (data && data.courseId == this.course.id) {
                        this.refreshAfterCompletionChange(false);

                        if (data.warnings && data.warnings[0]) {
                            this.domUtils.showErrorModal(data.warnings[0]);
                        }
                    }
                });
            }
        });

        if (this.downloadCourseEnabled) {
            // Listen for changes in course status.
            this.courseStatusObserver = eventsProvider.on(CoreEventsProvider.COURSE_STATUS_CHANGED, (data) => {
                if (data.courseId == this.course.id || data.courseId == CoreCourseProvider.ALL_COURSES_CLEARED) {
                    this.updateCourseStatus(data.status);
                }
            }, sitesProvider.getCurrentSiteId());
        }

        this.selectTabObserver = eventsProvider.on(CoreEventsProvider.SELECT_COURSE_TAB, (data) => {

            if (!data.name) {
                // If needed, set sectionId and sectionNumber. They'll only be used if the content tabs hasn't been loaded yet.
                this.sectionId = data.sectionId || this.sectionId;
                this.sectionNumber = data.sectionNumber || this.sectionNumber;

                // Select course contents.
                this.tabsComponent && this.tabsComponent.selectTab(0);
            } else if (this.courseHandlers) {
                const index = this.courseHandlers.findIndex((handler) => {
                    return handler.name == data.name;
                });

                if (index >= 0) {
                    this.tabsComponent && this.tabsComponent.selectTab(index + 1);
                }
            }
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {

        if (this.module) {
            this.moduleId = this.module.id;
            this.courseHelper.openModule(this.navCtrl, this.module, this.course.id, this.sectionId, this.modParams);
        }

        this.loadData(false, true).finally(() => {
            this.dataLoaded = true;

            if (!this.downloadCourseEnabled) {
                // Cannot download the whole course, stop.
                return;
            }

            // Determine the course prefetch status.
            this.determineCoursePrefetchIcon().then(() => {
                if (this.prefetchCourseData.prefetchCourseIcon == 'spinner') {
                    // Course is being downloaded. Get the download promise.
                    const promise = this.courseHelper.getCourseDownloadPromise(this.course.id);
                    if (promise) {
                        // There is a download promise. Show an error if it fails.
                        promise.catch((error) => {
                            if (!this.isDestroyed) {
                                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                            }
                        });
                    } else {
                        // No download, this probably means that the app was closed while downloading. Set previous status.
                        this.courseProvider.setCoursePreviousStatus(this.course.id).then((status) => {
                            this.updateCourseStatus(status);
                        });
                    }
                }
            });
        });
    }

    /**
     * Fetch and load all the data required for the view.
     *
     * @param {boolean} [refresh] If it's refreshing content.
     * @param {boolean} [sync] If it should try to sync.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadData(refresh?: boolean, sync?: boolean): Promise<any> {
        // First of all, get the course because the data might have changed.
        return this.courseHelper.getCourse(this.course.id).then((result) => {
            return result.course;
        }).catch(() => {
            // Error getting the course, probably guest access.
        }).then((course) => {
            if (course) {
                if (this.course.id === course.id && this.course.hasOwnProperty('displayname')
                        && !course.hasOwnProperty('displayname')) {
                    course.displayname = this.course.displayname;
                }
                this.course = course;
            }

            if (sync) {
                // Try to synchronize the course data.
                return this.syncProvider.syncCourse(this.course.id).then((result) => {
                    if (result.warnings && result.warnings.length) {
                        this.domUtils.showErrorModal(result.warnings[0]);
                    }
                }).catch(() => {
                    // For now we don't allow manual syncing, so ignore errors.
                });
            }
        }).then(() => {
            const promises = [];

            // Get all the sections.
            promises.push(this.courseProvider.getSections(this.course.id, false, true).then((sections) => {
                if (refresh) {
                    // Invalidate the recently downloaded module list. To ensure info can be prefetched.
                    const modules = this.courseProvider.getSectionsModules(sections);

                    return this.prefetchDelegate.invalidateModules(modules, this.course.id).then(() => {
                        return sections;
                    });
                } else {
                    return sections;
                }
            }).then((sections) => {
                let promise;

                 // Get the completion status.
                if (this.course.enablecompletion === false) {
                    // Completion not enabled.
                    promise = Promise.resolve({});
                } else {
                    const sectionWithModules = sections.find((section) => {
                            return section.modules.length > 0;
                    });

                    if (sectionWithModules && typeof sectionWithModules.modules[0].completion != 'undefined') {
                        // The module already has completion (3.6 onwards). Load the offline completion.
                        promise = this.courseHelper.loadOfflineCompletion(this.course.id, sections).catch(() => {
                            // It shouldn't happen.
                        }).then(() => {
                            return {};
                        });
                    } else {
                        promise = this.courseProvider.getActivitiesCompletionStatus(this.course.id).catch(() => {
                            // It failed, don't use completion.
                            return {};
                        });
                    }
                }

                return promise.then((completionStatus) => {
                    this.courseHelper.addHandlerDataForModules(sections, this.course.id, completionStatus, this.course.fullname);

                    // Format the name of each section and check if it has content.
                    this.sections = sections.map((section) => {
                        this.textUtils.formatText(section.name.trim(), true, true).then((name) => {
                            section.formattedName = name;
                        });
                        section.hasContent = this.courseHelper.sectionHasContent(section);

                        return section;
                    });

                    if (this.courseFormatDelegate.canViewAllSections(this.course)) {
                        // Add a fake first section (all sections).
                        this.sections.unshift({
                            name: this.translate.instant('core.course.allsections'),
                            id: CoreCourseProvider.ALL_SECTIONS_ID,
                            hasContent: true
                        });
                    }

                    // Get the title again now that we have sections.
                    this.title = this.courseFormatDelegate.getCourseTitle(this.course, this.sections);

                    // Get whether to show the refresher now that we have sections.
                    this.displayRefresher = this.courseFormatDelegate.displayRefresher(this.course, this.sections);
                });
            }));

            // Get the overview files.
            if (this.course.overviewfiles) {
                this.course.imageThumb = this.course.overviewfiles[0] && this.course.overviewfiles[0].fileurl;
            }

            // Load the course handlers.
            promises.push(this.courseOptionsDelegate.getHandlersToDisplay(this.injector, this.course, refresh, false)
                    .then((handlers) => {
                let tabToLoad;

                // Add the courseId to the handler component data.
                handlers.forEach((handler, index) => {
                    handler.data.componentData = handler.data.componentData || {};
                    handler.data.componentData.courseId = this.course.id;

                    // Check if this handler should be the first selected tab.
                    if (this.firstTabName && handler.name == this.firstTabName) {
                        tabToLoad = index + 1;
                    }
                });

                this.courseHandlers = handlers;

                // Select the tab if needed.
                this.firstTabName = undefined;
                if (tabToLoad) {
                    setTimeout(() => {
                        this.tabsComponent.selectTab(tabToLoad);
                    });
                }
            }));

            // Load the course menu handlers.
            promises.push(this.courseOptionsDelegate.getMenuHandlersToDisplay(this.injector, this.course).then((handlers) => {
                this.courseMenuHandlers = handlers;
            }));

            // Load the course format options when course completion is enabled to show completion progress on sections.
            if (this.course.enablecompletion && this.coursesProvider.isGetCoursesByFieldAvailable()) {
                promises.push(this.coursesProvider.getCourseByField('id', this.course.id).catch(() => {
                    // Ignore errors.
                }).then((course) => {
                    course && Object.assign(this.course, course);

                    if (this.course.courseformatoptions) {
                        this.course.courseformatoptions = this.utils.objectToKeyValueMap(this.course.courseformatoptions,
                            'name', 'value');
                    }
                }));
            }

            return Promise.all(promises).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
            });
        });
    }

    /**
     * Refresh the data.
     *
     * @param  {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any): Promise<any> {
        return this.invalidateData().finally(() => {
            return this.loadData(true, true).finally(() => {
                /* Do not call doRefresh on the format component if the refresher is defined in the format component
                   to prevent an inifinite loop. */
                 let promise;
                 if (this.displayRefresher) {
                     promise = this.formatComponent.doRefresh(refresher);
                 } else {
                     promise = Promise.resolve();
                 }

                return promise.finally(() => {
                    refresher && refresher.complete();
                });
            });
        });
    }

    /**
     * The completion of any of the modules have changed.
     */
    onCompletionChange(completionData: any): void {
        const shouldReload = !completionData.hasOwnProperty('valueused') || completionData.valueused;
        this.invalidateData().finally(() => {
            if (shouldReload) {
                this.refreshAfterCompletionChange(true);
            }
        });
    }

    /**
     * Invalidate the data.
     */
    protected invalidateData(): Promise<any> {
        const promises = [];

        promises.push(this.courseProvider.invalidateSections(this.course.id));
        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseFormatDelegate.invalidateData(this.course, this.sections));

        if (this.sections) {
            promises.push(this.prefetchDelegate.invalidateCourseUpdates(this.course.id));
        }

        return Promise.all(promises);
    }

    /**
     * Refresh list after a completion change since there could be new activities.
     *
     * @param {boolean} [sync] If it should try to sync.
     */
    protected refreshAfterCompletionChange(sync?: boolean): void {
        // Save scroll position to restore it once done.
        const scrollElement = this.content.getScrollElement(),
            scrollTop = scrollElement.scrollTop || 0,
            scrollLeft = scrollElement.scrollLeft || 0;

        this.dataLoaded = false;
        this.domUtils.scrollToTop(this.content); // Scroll top so the spinner is seen.

        this.loadData(true, sync).then(() => {
            return this.formatComponent.doRefresh(undefined, undefined, true);
        }).finally(() => {
            this.dataLoaded = true;

            // Wait for new content height to be calculated and scroll without animation.
            setTimeout(() => {
                this.content.scrollTo(scrollLeft, scrollTop, 0);
            });
        });
    }

    /**
     * Determines the prefetch icon of the course.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected determineCoursePrefetchIcon(): Promise<void> {
        return this.courseHelper.getCourseStatusIconAndTitle(this.course.id).then((data) => {
            this.prefetchCourseData.prefetchCourseIcon = data.icon;
            this.prefetchCourseData.title = data.title;
        });
    }

    /**
     * Prefetch the whole course.
     */
    prefetchCourse(): void {
        this.courseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course, this.sections,
                this.courseHandlers, this.courseMenuHandlers).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        });
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        this.downloadEnabled = !this.downloadEnabled;
        this.downloadEnabledIcon = this.downloadEnabled ? 'checkbox-outline' : 'square-outline';
    }

    /**
     * Update the course status icon and title.
     *
     * @param {string} status Status to show.
     */
    protected updateCourseStatus(status: string): void {
        const statusData = this.courseHelper.getCourseStatusIconAndTitleFromStatus(status);

        this.prefetchCourseData.prefetchCourseIcon = statusData.icon;
        this.prefetchCourseData.title = statusData.title;
    }

    /**
     * Open the course summary
     */
    openCourseSummary(): void {
        this.navCtrl.push('CoreCoursesCoursePreviewPage', {course: this.course, avoidOpenCourse: true});
    }

    /**
     * Opens a menu item registered to the delegate.
     *
     * @param {CoreCourseMenuHandlerToDisplay} item Item to open
     */
    openMenuItem(item: CoreCourseOptionsMenuHandlerToDisplay): void {
        const params = Object.assign({ course: this.course}, item.data.pageParams);
        this.navCtrl.push(item.data.page, params);
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.completionObserver && this.completionObserver.off();
        this.selectTabObserver && this.selectTabObserver.off();
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.formatComponent && this.formatComponent.ionViewDidEnter();
        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.formatComponent && this.formatComponent.ionViewDidLeave();
        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
    }
}
