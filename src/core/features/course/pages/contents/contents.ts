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

import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { IonContent, IonRefresher } from '@ionic/angular';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourses, CoreCourseAnyCourseData } from '@features/courses/services/courses';
import {
    CoreCourse,
    CoreCourseCompletionActivityStatus,
    CoreCourseProvider,
} from '@features/course/services/course';
import {
    CoreCourseHelper,
    CoreCourseModuleCompletionData,
    CoreCourseSection,
    CorePrefetchStatusInfo,
} from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import {
    CoreCourseOptionsDelegate,
    CoreCourseOptionsMenuHandlerToDisplay,
} from '@features/course/services/course-options-delegate';
// import { CoreCourseSyncProvider } from '../../providers/sync';
import { CoreCourseFormatComponent } from '../../components/format/format';
import {
    CoreEvents,
    CoreEventObserver,
    CoreEventCourseStatusChanged,
    CoreEventCompletionModuleViewedData,
} from '@singletons/events';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays the contents of a course.
 */
@Component({
    selector: 'page-core-course-contents',
    templateUrl: 'contents.html',
})
export class CoreCourseContentsPage implements OnInit, OnDestroy {

    @ViewChild(IonContent) content?: IonContent;
    @ViewChild(CoreCourseFormatComponent) formatComponent?: CoreCourseFormatComponent;

    course!: CoreCourseAnyCourseData;
    sections?: CoreCourseSection[];
    sectionId?: number;
    sectionNumber?: number;
    courseMenuHandlers: CoreCourseOptionsMenuHandlerToDisplay[] = [];
    dataLoaded = false;
    downloadEnabled = false;
    downloadEnabledIcon = 'far-square'; // Disabled by default.
    downloadCourseEnabled = false;
    moduleId?: number;
    displayEnableDownload = false;
    displayRefresher = false;
    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: 'spinner',
        statusTranslatable: 'core.course.downloadcourse',
        status: '',
        loading: true,
    };

    protected formatOptions?: Record<string, unknown>;
    protected completionObserver?: CoreEventObserver;
    protected courseStatusObserver?: CoreEventObserver;
    protected syncObserver?: CoreEventObserver;
    protected isDestroyed = false;

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        const course = CoreNavigator.instance.getRouteParam<CoreCourseAnyCourseData>('course');

        if (!course) {
            CoreDomUtils.instance.showErrorModal('Missing required course parameter.');
            CoreNavigator.instance.back();

            return;
        }

        this.course = course;
        this.sectionId = CoreNavigator.instance.getRouteParam('sectionId');
        this.sectionNumber = CoreNavigator.instance.getRouteParam('sectionNumber');
        this.moduleId = CoreNavigator.instance.getRouteParam('moduleId');

        this.displayEnableDownload = !CoreSites.instance.getCurrentSite()?.isOfflineDisabled() &&
            CoreCourseFormatDelegate.instance.displayEnableDownload(this.course);
        this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();

        this.initListeners();

        await this.loadData(false, true);

        this.dataLoaded = true;

        this.initPrefetch();
    }

    /**
     * Init listeners.
     *
     * @return Promise resolved when done.
     */
    protected async initListeners(): Promise<void> {
        if (this.downloadCourseEnabled) {
            // Listen for changes in course status.
            this.courseStatusObserver = CoreEvents.on<CoreEventCourseStatusChanged>(CoreEvents.COURSE_STATUS_CHANGED, (data) => {
                if (data.courseId == this.course.id || data.courseId == CoreCourseProvider.ALL_COURSES_CLEARED) {
                    this.updateCourseStatus(data.status);
                }
            }, CoreSites.instance.getCurrentSiteId());
        }

        // Check if the course format requires the view to be refreshed when completion changes.
        const shouldRefresh = await CoreCourseFormatDelegate.instance.shouldRefreshWhenCompletionChanges(this.course);
        if (!shouldRefresh) {
            return;
        }

        this.completionObserver = CoreEvents.on<CoreEventCompletionModuleViewedData>(
            CoreEvents.COMPLETION_MODULE_VIEWED,
            (data) => {
                if (data && data.courseId == this.course.id) {
                    this.refreshAfterCompletionChange(true);
                }
            },
        );

        // @todo this.syncObserver = CoreEvents.on(CoreCourseSyncProvider.AUTO_SYNCED, (data) => {
        //     if (data && data.courseId == this.course.id) {
        //         this.refreshAfterCompletionChange(false);

        //         if (data.warnings && data.warnings[0]) {
        //             CoreDomUtils.instance.showErrorModal(data.warnings[0]);
        //         }
        //     }
        // });
    }

    /**
     * Init prefetch data if needed.
     *
     * @return Promise resolved when done.
     */
    protected async initPrefetch(): Promise<void> {
        if (!this.downloadCourseEnabled) {
            // Cannot download the whole course, stop.
            return;
        }

        // Determine the course prefetch status.
        await this.determineCoursePrefetchIcon();

        if (this.prefetchCourseData.icon != 'spinner') {
            return;
        }

        // Course is being downloaded. Get the download promise.
        const promise = CoreCourseHelper.instance.getCourseDownloadPromise(this.course.id);
        if (promise) {
            // There is a download promise. Show an error if it fails.
            promise.catch((error) => {
                if (!this.isDestroyed) {
                    CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                }
            });
        } else {
            // No download, this probably means that the app was closed while downloading. Set previous status.
            const status = await CoreCourse.instance.setCoursePreviousStatus(this.course.id);

            this.updateCourseStatus(status);
        }
    }

    /**
     * Fetch and load all the data required for the view.
     *
     * @param refresh If it's refreshing content.
     * @param sync If it should try to sync.
     * @return Promise resolved when done.
     */
    protected async loadData(refresh?: boolean, sync?: boolean): Promise<void> {
        // First of all, get the course because the data might have changed.
        const result = await CoreUtils.instance.ignoreErrors(CoreCourseHelper.instance.getCourse(this.course.id));

        if (result) {
            if (this.course.id === result.course.id && 'displayname' in this.course && !('displayname' in result.course)) {
                result.course.displayname = this.course.displayname;
            }
            this.course = result.course;
        }

        if (sync) {
            // Try to synchronize the course data.
            // @todo return this.syncProvider.syncCourse(this.course.id).then((result) => {
            //     if (result.warnings && result.warnings.length) {
            //         CoreDomUtils.instance.showErrorModal(result.warnings[0]);
            //     }
            // }).catch(() => {
            //     // For now we don't allow manual syncing, so ignore errors.
            // });
        }

        try {
            await Promise.all([
                this.loadSections(refresh),
                this.loadMenuHandlers(refresh),
                this.loadCourseFormatOptions(),
            ]);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        }
    }

    /**
     * Load course sections.
     *
     * @param refresh If it's refreshing content.
     * @return Promise resolved when done.
     */
    protected async loadSections(refresh?: boolean): Promise<void> {
        // Get all the sections.
        const sections = await CoreCourse.instance.getSections(this.course.id, false, true);

        if (refresh) {
            // Invalidate the recently downloaded module list. To ensure info can be prefetched.
            const modules = CoreCourse.instance.getSectionsModules(sections);

            await CoreCourseModulePrefetchDelegate.instance.invalidateModules(modules, this.course.id);
        }

        let completionStatus: Record<string, CoreCourseCompletionActivityStatus> = {};

        // Get the completion status.
        if (this.course.enablecompletion !== false) {
            const sectionWithModules = sections.find((section) => section.modules.length > 0);

            if (sectionWithModules && typeof sectionWithModules.modules[0].completion != 'undefined') {
                // The module already has completion (3.6 onwards). Load the offline completion.
                await CoreUtils.instance.ignoreErrors(CoreCourseHelper.instance.loadOfflineCompletion(this.course.id, sections));
            } else {
                const fetchedData = await CoreUtils.instance.ignoreErrors(
                    CoreCourse.instance.getActivitiesCompletionStatus(this.course.id),
                );

                completionStatus = fetchedData || completionStatus;
            }
        }

        // Add handlers
        const result = CoreCourseHelper.instance.addHandlerDataForModules(
            sections,
            this.course.id,
            completionStatus,
            this.course.fullname,
            true,
        );
        this.sections = result.sections;

        if (CoreCourseFormatDelegate.instance.canViewAllSections(this.course)) {
            // Add a fake first section (all sections).
            this.sections.unshift(CoreCourseHelper.instance.createAllSectionsSection());
        }

        // Get whether to show the refresher now that we have sections.
        this.displayRefresher = CoreCourseFormatDelegate.instance.displayRefresher(this.course, this.sections);
    }

    /**
     * Load the course menu handlers.
     *
     * @param refresh If it's refreshing content.
     * @return Promise resolved when done.
     */
    protected async loadMenuHandlers(refresh?: boolean): Promise<void> {
        this.courseMenuHandlers = await CoreCourseOptionsDelegate.instance.getMenuHandlersToDisplay(this.course, refresh);
    }

    /**
     * Load course format options if needed.
     *
     * @return Promise resolved when done.
     */
    protected async loadCourseFormatOptions(): Promise<void> {

        // Load the course format options when course completion is enabled to show completion progress on sections.
        if (!this.course.enablecompletion || !CoreCourses.instance.isGetCoursesByFieldAvailable()) {
            return;
        }

        if ('courseformatoptions' in this.course && this.course.courseformatoptions) {
            // Already loaded.
            this.formatOptions = CoreUtils.instance.objectToKeyValueMap(this.course.courseformatoptions, 'name', 'value');

            return;
        }

        const course = await CoreUtils.instance.ignoreErrors(CoreCourses.instance.getCourseByField('id', this.course.id));

        course && Object.assign(this.course, course);

        if (course?.courseformatoptions) {
            this.formatOptions = CoreUtils.instance.objectToKeyValueMap(course.courseformatoptions, 'name', 'value');
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: CustomEvent<IonRefresher>): Promise<void> {
        await CoreUtils.instance.ignoreErrors(this.invalidateData());

        try {
            await this.loadData(true, true);
        } finally {
            // Do not call doRefresh on the format component if the refresher is defined in the format component
            // to prevent an inifinite loop.
            if (this.displayRefresher && this.formatComponent) {
                await CoreUtils.instance.ignoreErrors(this.formatComponent.doRefresh(refresher));
            }

            refresher?.detail.complete();
        }
    }

    /**
     * The completion of any of the modules has changed.
     *
     * @param completionData Completion data.
     * @return Promise resolved when done.
     */
    async onCompletionChange(completionData: CoreCourseModuleCompletionData): Promise<void> {
        const shouldReload = typeof completionData.valueused == 'undefined' || completionData.valueused;

        if (!shouldReload) {
            return;
        }

        await CoreUtils.instance.ignoreErrors(this.invalidateData());

        await this.refreshAfterCompletionChange(true);
    }

    /**
     * Invalidate the data.
     *
     * @return Promise resolved when done.
     */
    protected async invalidateData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourse.instance.invalidateSections(this.course.id));
        promises.push(CoreCourses.instance.invalidateUserCourses());
        promises.push(CoreCourseFormatDelegate.instance.invalidateData(this.course, this.sections || []));

        if (this.sections) {
            promises.push(CoreCourseModulePrefetchDelegate.instance.invalidateCourseUpdates(this.course.id));
        }

        await Promise.all(promises);
    }

    /**
     * Refresh list after a completion change since there could be new activities.
     *
     * @param sync If it should try to sync.
     * @return Promise resolved when done.
     */
    protected async refreshAfterCompletionChange(sync?: boolean): Promise<void> {
        // Save scroll position to restore it once done.
        const scrollElement = await this.content?.getScrollElement();
        const scrollTop = scrollElement?.scrollTop || 0;
        const scrollLeft = scrollElement?.scrollLeft || 0;

        this.dataLoaded = false;
        this.content?.scrollToTop(0); // Scroll top so the spinner is seen.

        try {
            await this.loadData(true, sync);

            await this.formatComponent?.doRefresh(undefined, undefined, true);
        } finally {
            this.dataLoaded = true;

            // Wait for new content height to be calculated and scroll without animation.
            setTimeout(() => {
                this.content?.scrollToPoint(scrollLeft, scrollTop, 0);
            });
        }
    }

    /**
     * Determines the prefetch icon of the course.
     *
     * @return Promise resolved when done.
     */
    protected async determineCoursePrefetchIcon(): Promise<void> {
        this.prefetchCourseData = await CoreCourseHelper.instance.getCourseStatusIconAndTitle(this.course.id);
    }

    /**
     * Prefetch the whole course.
     */
    async prefetchCourse(): Promise<void> {
        try {
            await CoreCourseHelper.instance.confirmAndPrefetchCourse(
                this.prefetchCourseData,
                this.course,
                this.sections,
                undefined,
                this.courseMenuHandlers,
            );
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }

            CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
        }
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        this.downloadEnabled = !this.downloadEnabled;
        this.downloadEnabledIcon = this.downloadEnabled ? 'far-check-square' : 'far-square';
    }

    /**
     * Update the course status icon and title.
     *
     * @param status Status to show.
     */
    protected updateCourseStatus(status: string): void {
        this.prefetchCourseData = CoreCourseHelper.instance.getCourseStatusIconAndTitleFromStatus(status);
    }

    /**
     * Open the course summary
     */
    openCourseSummary(): void {
        CoreNavigator.instance.navigateToSitePath('/courses/preview', { params: { course: this.course, avoidOpenCourse: true } });
    }

    /**
     * Opens a menu item registered to the delegate.
     *
     * @param item Item to open
     */
    openMenuItem(item: CoreCourseOptionsMenuHandlerToDisplay): void {
        const params = Object.assign({ course: this.course }, item.data.pageParams);
        CoreNavigator.instance.navigateToSitePath(item.data.page, { params });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.completionObserver?.off();
        this.courseStatusObserver?.off();
        this.syncObserver?.off();
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.formatComponent?.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.formatComponent?.ionViewDidLeave();
    }

}
