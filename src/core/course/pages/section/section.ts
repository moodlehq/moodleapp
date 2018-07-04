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
import { CoreCourseProvider } from '../../providers/course';
import { CoreCourseHelperProvider } from '../../providers/helper';
import { CoreCourseFormatDelegate } from '../../providers/format-delegate';
import { CoreCourseModulePrefetchDelegate } from '../../providers/module-prefetch-delegate';
import { CoreCourseOptionsDelegate, CoreCourseOptionsHandlerToDisplay } from '../../providers/options-delegate';
import { CoreCourseFormatComponent } from '../../components/format/format';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreTabsComponent } from '@components/tabs/tabs';

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
    dataLoaded: boolean;
    downloadEnabled: boolean;
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
    protected completionObserver;
    protected courseStatusObserver;
    protected isDestroyed = false;

    constructor(navParams: NavParams, private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private courseOptionsDelegate: CoreCourseOptionsDelegate,
            private translate: TranslateService, private courseHelper: CoreCourseHelperProvider, eventsProvider: CoreEventsProvider,
            private textUtils: CoreTextUtilsProvider, private coursesProvider: CoreCoursesProvider,
            sitesProvider: CoreSitesProvider, private navCtrl: NavController, private injector: Injector,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate) {
        this.course = navParams.get('course');
        this.sectionId = navParams.get('sectionId');
        this.sectionNumber = navParams.get('sectionNumber');
        this.module = navParams.get('module');

        // Get the title to display. We dont't have sections yet.
        this.title = courseFormatDelegate.getCourseTitle(this.course);
        this.displayEnableDownload = courseFormatDelegate.displayEnableDownload(this.course);
        this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();

        // Check if the course format requires the view to be refreshed when completion changes.
        courseFormatDelegate.shouldRefreshWhenCompletionChanges(this.course).then((shouldRefresh) => {
            if (shouldRefresh) {
                this.completionObserver = eventsProvider.on(CoreEventsProvider.COMPLETION_MODULE_VIEWED, (data) => {
                    if (data && data.courseId == this.course.id) {
                        this.refreshAfterCompletionChange();
                    }
                });
            }
        });

        if (this.downloadCourseEnabled) {
            // Listen for changes in course status.
            this.courseStatusObserver = eventsProvider.on(CoreEventsProvider.COURSE_STATUS_CHANGED, (data) => {
                if (data.courseId == this.course.id) {
                    this.updateCourseStatus(data.status);
                }
            }, sitesProvider.getCurrentSiteId());
        }
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {

        if (this.module) {
            this.moduleId = this.module.id;
            this.courseHelper.openModule(this.navCtrl, this.module, this.course.id, this.sectionId);
        }

        this.loadData().finally(() => {
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
     */
    protected loadData(refresh?: boolean): Promise<any> {
        // First of all, get the course because the data might have changed.
        return this.coursesProvider.getUserCourse(this.course.id).catch(() => {
            // Error getting the course, probably guest access.
        }).then((course) => {
            const promises = [];
            let promise;

            if (course) {
                this.course = course;
            }

            // Get the completion status.
            if (this.course.enablecompletion === false) {
                // Completion not enabled.
                promise = Promise.resolve({});
            } else {
                promise = this.courseProvider.getActivitiesCompletionStatus(this.course.id).catch(() => {
                    // It failed, don't use completion.
                    return {};
                });
            }

            promises.push(promise.then((completionStatus) => {
                // Get all the sections.
                return this.courseProvider.getSections(this.course.id, false, true).then((sections) => {
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

                    this.courseHelper.addHandlerDataForModules(sections, this.course.id, completionStatus);

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
            } else if (this.coursesProvider.isGetCoursesByFieldAvailable()) {
                promises.push(this.coursesProvider.getCoursesByField('id', this.course.id).then((coursesInfo) => {
                    if (coursesInfo[0] && coursesInfo[0].overviewfiles && coursesInfo[0].overviewfiles[0]) {
                        this.course.imageThumb = coursesInfo[0].overviewfiles[0].fileurl;
                    } else {
                        this.course.imageThumb = false;
                    }
                }));
            }

            // Load the course handlers.
            promises.push(this.courseOptionsDelegate.getHandlersToDisplay(this.injector, this.course, refresh, false)
                    .then((handlers) => {
                // Add the courseId to the handler component data.
                handlers.forEach((handler) => {
                    handler.data.componentData = handler.data.componentData || {};
                    handler.data.componentData.courseId = this.course.id;
                });

                this.courseHandlers = handlers;
            }));

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
            return this.loadData(true).finally(() => {
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
    onCompletionChange(): void {
        this.invalidateData().finally(() => {
            this.refreshAfterCompletionChange();
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
        promises.push(this.coursesProvider.invalidateCoursesByField('id', this.course.id));

        if (this.sections) {
            promises.push(this.prefetchDelegate.invalidateCourseUpdates(this.course.id));
        }

        return Promise.all(promises);
    }

    /**
     * Refresh list after a completion change since there could be new activities.
     */
    protected refreshAfterCompletionChange(): void {
        // Save scroll position to restore it once done.
        const scrollElement = this.content.getScrollElement(),
            scrollTop = scrollElement.scrollTop || 0,
            scrollLeft = scrollElement.scrollLeft || 0;

        this.dataLoaded = false;
        this.content.scrollToTop(); // Scroll top so the spinner is seen.

        this.loadData().finally(() => {
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
        this.courseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course, this.sections, this.courseHandlers)
                .then(() => {
            if (this.downloadEnabled) {
                // Recalculate the status.
                this.courseHelper.calculateSectionsStatus(this.sections, this.course.id).catch(() => {
                    // Ignore errors (shouldn't happen).
                });
            }
        }).catch((error) => {
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
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        if (this.completionObserver) {
            this.completionObserver.off();
        }
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
