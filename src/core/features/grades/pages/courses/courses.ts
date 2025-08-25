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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';

import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGradesCoursesSource } from '@features/grades/classes/grades-courses-source';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreCourses } from '@features/courses/services/courses';

/**
 * Page that displays courses grades (main menu option).
 */
@Component({
    selector: 'page-core-grades-courses',
    templateUrl: 'courses.html',
    styleUrls: ['courses.scss'],
})
export class CoreGradesCoursesPage implements OnDestroy, AfterViewInit {

    courses: CoreGradesCoursesManager;
    isParentView = false;
    mentees: any[] = [];
    selectedMenteeId?: number;
    menteeCourses: { [menteeId: number]: any[] } = {};
    parentDataLoaded = false;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []);

        this.courses = new CoreGradesCoursesManager(source, CoreGradesCoursesPage);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        // Check if user is a parent
        this.isParentView = await CoreUserParent.isParentUser();
        
        if (this.isParentView) {
            // Get mentees for parent view
            this.mentees = await CoreUserParent.getMentees();
            this.selectedMenteeId = await CoreUserParent.getSelectedMentee() || undefined;
            
            console.log('[Grades] Parent view detected with', this.mentees.length, 'mentees');
        }

        await this.fetchInitialCourses();

        // Only start the courses manager if not in parent view
        if (!this.isParentView) {
            this.courses.start(this.splitView);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        if (!this.isParentView) {
            this.courses.destroy();
        }
    }

    /**
     * Refresh courses.
     *
     * @param refresher Refresher.
     */
    async refreshCourses(refresher: HTMLIonRefresherElement): Promise<void> {
        if (this.isParentView) {
            // Invalidate cache for all mentees
            const site = CoreSites.getCurrentSite();
            if (site) {
                for (const mentee of this.mentees) {
                    const cacheKey = 'mmGrades:coursesgrades:mentee:' + mentee.id;
                    await CoreUtils.ignoreErrors(site.invalidateWsCacheForKey(cacheKey));
                }
            }
            await this.fetchAllMenteeCourses();
        } else {
            await CoreUtils.ignoreErrors(CoreGrades.invalidateCoursesGradesData());
            await CoreUtils.ignoreErrors(this.courses.reload());
        }

        refresher?.complete();
    }

    /**
     * Obtain the initial list of courses.
     */
    private async fetchInitialCourses(): Promise<void> {
        try {
            if (this.isParentView && this.mentees.length > 0) {
                // For parent view, fetch courses for each mentee
                await this.fetchAllMenteeCourses();
                this.parentDataLoaded = true;
            } else {
                await this.courses.load();
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading courses');
        }
    }

    /**
     * Fetch courses with grades for all mentees.
     */
    private async fetchAllMenteeCourses(): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return;
        }

        // Clear existing data
        this.menteeCourses = {};

        // Fetch courses for each mentee
        const promises = this.mentees.map(async (mentee) => {
            try {
                // Check if the custom WS is available
                const hasCustomWS = await site.wsAvailable('local_aspireparent_get_mentee_course_grades');
                
                if (hasCustomWS) {
                    console.log('[Grades] Fetching course grades for mentee:', mentee.id);
                    const response = await site.read<{ grades: any[] }>('local_aspireparent_get_mentee_course_grades', {
                        menteeid: mentee.id
                    });
                    
                    if (response.grades) {
                        // Get course details for each grade
                        const courseIds = response.grades.map(g => g.courseid);
                        const courses = await CoreCourses.getCoursesByField('ids', courseIds.join(','), site.getId());
                        
                        // Merge grade data with course data
                        const coursesWithGrades = response.grades.map(grade => {
                            const course = courses.find(c => c.id === grade.courseid);
                            return {
                                ...course,
                                courseid: grade.courseid,
                                courseFullName: course?.fullname || 'Unknown Course',
                                grade: grade.grade,
                                rawgrade: grade.rawgrade,
                                rank: grade.rank
                            };
                        });
                        
                        this.menteeCourses[mentee.id] = coursesWithGrades;
                        console.log(`[Grades] Found ${coursesWithGrades.length} courses for mentee ${mentee.id}`);
                    }
                } else {
                    console.warn('[Grades] Custom WS not available, using fallback');
                    // Fallback: get mentee courses and then grades
                    const courses = await CoreCourses.getUserCourses(false, site.getId());
                    this.menteeCourses[mentee.id] = courses.map(course => ({
                        ...course,
                        courseid: course.id,
                        courseFullName: course.fullname,
                        grade: '-',
                        rawgrade: ''
                    }));
                }
            } catch (error) {
                console.error('[Grades] Error fetching courses for mentee', mentee.id, error);
                this.menteeCourses[mentee.id] = [];
            }
        });

        await Promise.all(promises);
    }

    /**
     * Get courses for a specific mentee.
     *
     * @param menteeId The mentee user ID.
     * @returns List of courses with grades for the mentee.
     */
    getCoursesForMentee(menteeId: number): any[] {
        return this.menteeCourses[menteeId] || [];
    }

    /**
     * Select a course for a specific mentee.
     *
     * @param course The course to select.
     * @param menteeId The mentee user ID.
     */
    async selectCourseForMentee(course: any, menteeId: number): Promise<void> {
        // Set the selected mentee before navigating
        await CoreUserParent.setSelectedMentee(menteeId);
        
        // Navigate to the course grades
        this.courses.select(course);
    }

}

/**
 * Helper class to manage courses.
 */
class CoreGradesCoursesManager extends CoreListItemsManager {

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CoreGrades.logCoursesGradesView();

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'gradereport_overview_view_grade_report',
            name: Translate.instant('core.grades.grades'),
            data: { courseId: CoreSites.getCurrentSiteHomeId(), category: 'grades' },
            url: '/grade/report/overview/index.php',
        });
    }

}
