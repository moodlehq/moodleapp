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
import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, inject } from '@angular/core';
import {
    CoreCourseDownloadStatusHelper,
    CoreEventCourseStatusChanged,
} from '@features/course/services/course-download-status-helper';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { CoreUserPreferences } from '@features/user/services/user-preferences';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseListItem, CoreCourses } from '../../services/courses';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithExtraInfoAndOptions } from '../../services/courses-helper';
import { CoreColors } from '@singletons/colors';
import { CoreEnrolHelper } from '@features/enrol/services/enrol-helper';
import { CoreDownloadStatusTranslatable } from '@components/download-refresh/download-refresh';
import { toBoolean } from '@/core/transforms/boolean';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreLoadings } from '@services/overlays/loadings';
import {
    CORE_COURSES_MY_COURSES_UPDATED_EVENT,
    CoreCoursesMyCoursesUpdatedEventAction,
    CORE_COURSES_STATE_HIDDEN,
    CORE_COURSES_STATE_FAVOURITE,
} from '@features/courses/constants';
import {
    CORE_COURSE_ALL_COURSES_CLEARED,
    CORE_COURSE_PROGRESS_UPDATED_EVENT,
    COURSE_STATUS_CHANGED_EVENT,
} from '@features/course/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreEnrolInfoIcon } from '@features/enrol/services/enrol-delegate';

/**
 * This directive is meant to display an item for a list of courses.
 *
 * Example usage:
 *
 * <core-courses-course-list-item [course]="course" />
 */
@Component({
    selector: 'core-courses-course-list-item',
    templateUrl: 'core-courses-course-list-item.html',
    styleUrl: 'course-list-item.scss',
    imports: [
        CoreSharedModule,
    ],
    host: {
        '[attr.data-course-id]': 'course.id',
        '[attr.data-category-id]': 'course.categoryid',
    },
})
export class CoreCoursesCourseListItemComponent implements OnInit, OnDestroy, OnChanges {

    @Input({ required: true }) course!: CoreCourseListItem; // The course to render.
    @Input({ transform: toBoolean }) showDownload = false; // If true, will show download button.
    @Input() layout: 'listwithenrol'|'summarycard'|'list'|'card' = 'listwithenrol';

    enrolmentIcons: CoreEnrolInfoIcon[] = [];
    isEnrolled = false;
    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
        loading: true,
    };

    statusesTranslatable: Partial<CoreDownloadStatusTranslatable> = {
        downloaded: 'core.course.refreshcourse',
        notdownloaded: 'core.course.downloadcourse',
        outdated: 'core.course.downloadcourse',
    };

    showSpinner = false;
    courseOptionMenuEnabled = false;
    progress = -1;
    completionUserTracked: boolean | undefined = false;

    protected courseStatus: DownloadStatus = DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
    protected isDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;

    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected progressObserver: CoreEventObserver;

    constructor() {
        const siteId = CoreSites.getCurrentSiteId();
        this.progressObserver = CoreEvents.on(CORE_COURSE_PROGRESS_UPDATED_EVENT, (data) => {
            if (!this.course || this.course.id !== data.courseId || !('progress' in this.course)) {
                return;
            }

            this.course.progress = data.progress;
            this.progress = this.course.progress ?? undefined;
        }, siteId);
    }

    /**
     * Get cleaned course name without year and term indicators.
     *
     * @returns Cleaned course name.
     */
    getCleanCourseName(): string {
        const name = this.course.displayname || this.course.fullname || '';
        // Remove year/term patterns: Y1-Y13, T1-T3, PN, FS1, FS2 and combinations
        return name
            .replace(/\s*-*\s*Y\d+\s*-\s*T\d+\s*-*\s*/gi, ' ') // Remove Y# - T# (Y + number + spaces? + dash + spaces? + T + number)
            .replace(/\s*-*\s*\b(PN|FS[12])\b\s*-*\s*/gi, ' ') // Remove PN, FS1, FS2
            .replace(/\s*-*\s*\bY\d+\b\s*-*\s*/gi, ' ') // Remove standalone Y#
            .replace(/\s*-*\s*\bT[1-3]\b\s*-*\s*/gi, ' ') // Remove standalone T1, T2, T3
            .replace(/[\s-]+$/g, '') // Remove all trailing spaces and dashes
            .replace(/^[\s-]+/g, '') // Remove all leading spaces and dashes
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Final trim
    }

    /**
     * Get pastel color class based on course ID.
     *
     * @returns Pastel color class name.
     */
    getPastelColorClass(): string {
        const colorIndex = (this.course.id % 6) + 1;
        return `pastel-color-${colorIndex}`;
    }

    /**
     * Get subject-specific icon based on course name.
     *
     * @returns Icon name for the course subject.
     */
    getCourseIcon(): string {
        const name = (this.course.displayname || this.course.fullname || '').toLowerCase();

        // Mathematics / Math
        if (name.includes('math') || name.includes('algebra') || name.includes('geometry') ||
            name.includes('calculus') || name.includes('statistics') || name.includes('trigonometry')) {
            return 'calculator';
        }

        // Science subjects
        if (name.includes('science') || name.includes('biology') || name.includes('chemistry') ||
            name.includes('physics') || name.includes('lab')) {
            return 'flask';
        }

        // English / Language Arts
        if (name.includes('english') || name.includes('language arts') || name.includes('literature') ||
            name.includes('writing') || name.includes('grammar') || name.includes('reading')) {
            return 'book';
        }

        // Arabic
        if (name.includes('arabic') || name.includes('عربي') || name.includes('عربى')) {
            return 'language';
        }

        // French / Foreign Languages
        if (name.includes('french') || name.includes('spanish') || name.includes('german') ||
            name.includes('language') || name.includes('foreign')) {
            return 'globe';
        }

        // History / Social Studies
        if (name.includes('history') || name.includes('social') || name.includes('civics') ||
            name.includes('geography') || name.includes('economics')) {
            return 'time';
        }

        // Art / Music / Creative
        if (name.includes('art') || name.includes('music') || name.includes('drama') ||
            name.includes('theater') || name.includes('creative') || name.includes('drawing')) {
            return 'color-palette';
        }

        // Physical Education / Sports
        if (name.includes('physical') || name.includes('sport') || name.includes('fitness') ||
            name.includes('health') || name.includes('p.e.') || name.includes('pe ')) {
            return 'fitness';
        }

        // Computer Science / Technology / ICT
        if (name.includes('computer') || name.includes('technology') || name.includes('programming') ||
            name.includes('coding') || name.includes('ict') || name.includes('digital')) {
            return 'laptop';
        }

        // Religious Studies / Islamic Studies / Moral Education
        if (name.includes('islamic') || name.includes('religion') || name.includes('moral') ||
            name.includes('ethics') || name.includes('quran') || name.includes('دين')) {
            return 'heart';
        }

        // Business / Economics
        if (name.includes('business') || name.includes('accounting') || name.includes('finance') ||
            name.includes('entrepreneur')) {
            return 'briefcase';
        }

        // Psychology / Sociology
        if (name.includes('psychology') || name.includes('sociology')) {
            return 'people';
        }

        // Environmental Studies
        if (name.includes('environment') || name.includes('ecology') || name.includes('sustainability')) {
            return 'leaf';
        }

        // Homeroom / Advisory / General
        if (name.includes('homeroom') || name.includes('advisory') || name.includes('tutor')) {
            return 'home';
        }

        // Default: school icon
        return 'school';
    }


    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Set course color immediately for card backgrounds
        this.setCourseColor();

        // Assume is enroled if mode is not listwithenrol.
        this.isEnrolled = this.layout !== 'listwithenrol' || this.course.progress !== undefined;

        if (!this.isEnrolled) {
            try {
                const course = await CoreCourses.getUserCourse(this.course.id);
                this.course = Object.assign(this.course, course);
                this.updateCourseFields();

                this.isEnrolled = true;
            } catch {
                this.isEnrolled = false;
            }
        }

        if (this.isEnrolled) {
            // This field is only available from 3.6 onwards.
            this.courseOptionMenuEnabled = (this.layout != 'listwithenrol' && this.layout != 'summarycard') &&
                this.course.isfavourite !== undefined;

            this.initPrefetchCourse();

        } else if ('enrollmentmethods' in this.course) {
            this.enrolmentIcons = await CoreEnrolHelper.getEnrolmentIcons(this.course.enrollmentmethods, this.course.id);
        }
    }

    /**
     * Removes the course image set because it cannot be loaded and set the fallback icon color.
     */
    loadFallbackCourseIcon(): void {
        this.course.courseimage = undefined;

        // Set the color because it won't be set at this point.
        this.setCourseColor();
    }

    /**
     * Set course color.
     */
    protected async setCourseColor(): Promise<void> {
        await CoreCoursesHelper.loadCourseColorAndImage(this.course);

        if (this.course.color) {
            this.element.style.setProperty('--course-color', this.course.color);

            const tint = CoreColors.lighter(this.course.color, 50);
            this.element.style.setProperty('--course-color-tint', tint);
        } else if(this.course.colorNumber !== undefined) {
            this.element.classList.add('course-color-' + this.course.colorNumber);
        } else {
            // Fallback: assign color based on course ID for consistent coloring
            const colorIndex = this.course.id % 10;
            this.element.classList.add('course-color-' + colorIndex);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.initPrefetchCourse();

        this.updateCourseFields();
    }

    /**
     * Helper function to update course fields.
     */
    protected updateCourseFields(): void {
        this.progress = 'progress' in this.course && typeof this.course.progress == 'number' ? this.course.progress : -1;
        this.completionUserTracked = 'completionusertracked' in this.course && this.course.completionusertracked;
    }

    /**
     * Open a course.
     */
    openCourse(): void {
        if (this.isEnrolled) {
            CoreCourseHelper.openCourse(this.course, { params: { isGuest: false } });
        } else {
            CoreNavigator.navigateToSitePath(
                `/course/${this.course.id}/summary`,
                { params: { course: this.course } },
            );
        }
    }

    /**
     * Get name length category for Metro tile sizing.
     * @returns The name length category
     */
    getNameLength(): 'short' | 'medium' | 'long' {
        const name = this.course.displayname || this.course.fullname;
        const length = name.length;
        
        if (length <= 15) {
            return 'short';
        } else if (length <= 30) {
            return 'medium';
        } else {
            return 'long';
        }
    }

    /**
     * Check if course has last access information.
     * @returns True if course has lastaccess property
     */
    hasLastAccess(): boolean {
        return !!(this.course as any).lastaccess;
    }

    /**
     * Initialize prefetch course.
     */
    async initPrefetchCourse(): Promise<void> {
        if (!this.isEnrolled || !this.showDownload) {
            return;
        }

        if (this.courseStatusObserver !== undefined) {
            // Already initialized.
            return;
        }

        // Listen for status change in course.
        this.courseStatusObserver = CoreEvents.on(COURSE_STATUS_CHANGED_EVENT, (data: CoreEventCourseStatusChanged) => {
            if (data.courseId == this.course.id || data.courseId === CORE_COURSE_ALL_COURSES_CLEARED) {
                this.updateCourseStatus(data.status);
            }
        }, CoreSites.getCurrentSiteId());

        // Determine course prefetch icon.
        const status = await CoreCourseDownloadStatusHelper.getCourseStatus(this.course.id);

        this.updateCourseStatus(status);

        if (this.prefetchCourseData.loading) {
            // Course is being downloaded. Get the download promise.
            const promise = CoreCourseHelper.getCourseDownloadPromise(this.course.id);
            if (promise) {
                // There is a download promise. If it fails, show an error.
                promise.catch((error) => {
                    if (!this.isDestroyed) {
                        CoreAlerts.showError(error, { default: Translate.instant('core.course.errordownloadingcourse') });
                    }
                });
            } else {
                // No download, this probably means that the app was closed while downloading. Set previous status.
                CoreCourseDownloadStatusHelper.setCoursePreviousStatus(this.course.id);
            }
        }

    }

    /**
     * Update the course status icon and title.
     *
     * @param status Status to show.
     */
    protected updateCourseStatus(status: DownloadStatus): void {
        const statusData = CoreCourseHelper.getCoursePrefetchStatusInfo(status);

        this.courseStatus = status;
        this.prefetchCourseData.status = statusData.status;
        this.prefetchCourseData.icon = statusData.icon;
        this.prefetchCourseData.statusTranslatable = statusData.statusTranslatable;
        this.prefetchCourseData.loading = statusData.loading;
        this.prefetchCourseData.downloadSucceeded = status === DownloadStatus.DOWNLOADED;
    }

    /**
     * Prefetch the course.
     *
     * @param event Click event.
     */
    async prefetchCourse(event?: Event): Promise<void> {
        event?.preventDefault();
        event?.stopPropagation();

        try {
            await CoreCourseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreAlerts.showError(error, { default: Translate.instant('core.course.errordownloadingcourse') });
            }
        }
    }

    /**
     * Delete course stored data.
     */
    async deleteCourseStoredData(): Promise<void> {
        try {
            await CoreAlerts.confirmDelete(Translate.instant('addon.storagemanager.confirmdeletedatafrom', {
                name: this.course.displayname || this.course.fullname,
            }));
        } catch (error) {
            if (!CoreErrorHelper.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreLoadings.show();

        try {
            await CoreCourseHelper.deleteCourseFiles(this.course.id);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.errordeletefile') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Click Event.
     */
    async showCourseOptionsMenu(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        this.initPrefetchCourse();

        const { CoreCoursesCourseOptionsMenuComponent } = await import('../course-options-menu/course-options-menu');

        const popoverData = await CorePopovers.open<string>({
            component: CoreCoursesCourseOptionsMenuComponent,
            componentProps: {
                course: this.course,
                prefetch: this.prefetchCourseData,
            },
            event: event,
        });

        switch (popoverData) {
            case 'download':
                if (!this.prefetchCourseData.loading) {
                    this.prefetchCourse(event);
                }
                break;
            case 'delete':
                if (this.courseStatus === DownloadStatus.DOWNLOADED || this.courseStatus === DownloadStatus.OUTDATED) {
                    this.deleteCourseStoredData();
                }
                break;
            case 'hide':
                this.setCourseHidden(true);
                break;
            case 'show':
                this.setCourseHidden(false);
                break;
            case 'favourite':
                this.setCourseFavourite(true);
                break;
            case 'unfavourite':
                this.setCourseFavourite(false);
                break;
            default:
                break;
        }

    }

    /**
     * Hide/Unhide the course from the course list.
     *
     * @param hide True to hide and false to show.
     */
    protected async setCourseHidden(hide: boolean): Promise<void> {
        this.showSpinner = true;

        // We should use null to unset the preference.
        try {
            await CoreUserPreferences.setPreferenceOnline(
                `block_myoverview_hidden_course_${this.course.id}`,
                hide ? '1' : undefined,
            );

            this.course.hidden = hide;

            (<CoreEnrolledCourseDataWithExtraInfoAndOptions> this.course).hidden = hide;
            CoreEvents.trigger(CORE_COURSES_MY_COURSES_UPDATED_EVENT, {
                courseId: this.course.id,
                course: this.course,
                action: CoreCoursesMyCoursesUpdatedEventAction.STATE_CHANGED,
                state: CORE_COURSES_STATE_HIDDEN,
                value: hide,
            }, CoreSites.getCurrentSiteId());

        } catch (error) {
            if (!this.isDestroyed) {
                CoreAlerts.showError(error, { default: 'Error changing course visibility.' });
            }
        } finally {
            this.showSpinner = false;
        }
    }

    /**
     * Favourite/Unfavourite the course from the course list.
     *
     * @param favourite True to favourite and false to unfavourite.
     */
    protected async setCourseFavourite(favourite: boolean): Promise<void> {
        this.showSpinner = true;

        try {
            await CoreCourses.setFavouriteCourse(this.course.id, favourite);

            this.course.isfavourite = favourite;
            CoreEvents.trigger(CORE_COURSES_MY_COURSES_UPDATED_EVENT, {
                courseId: this.course.id,
                course: this.course,
                action: CoreCoursesMyCoursesUpdatedEventAction.STATE_CHANGED,
                state: CORE_COURSES_STATE_FAVOURITE,
                value: favourite,
            }, CoreSites.getCurrentSiteId());

        } catch (error) {
            if (!this.isDestroyed) {
                CoreAlerts.showError(error, { default: 'Error changing course favourite attribute.' });
            }
        } finally {
            this.showSpinner = false;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.courseStatusObserver?.off();
        this.progressObserver.off();
    }

}

/**
 * Enrolment icons to show on the list with a label.
 */
export type CoreCoursesEnrolmentIcons = {
    label: string;
    icon: string;
};
