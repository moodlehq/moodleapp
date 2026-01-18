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
import { CoreGradesGradeOverviewWithCourseData } from '@features/grades/services/grades-helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreSites } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreCourses, CoreCategoryData } from '@features/courses/services/courses';

/**
 * Category node for hierarchical display
 */
interface CategoryNode {
    id: number;
    name: string;
    parent: number;
    depth: number;
    path: string;
    coursecount?: number;
    courses: CoreGradesGradeOverviewWithCourseData[];
    children: CategoryNode[];
    expanded?: boolean;
}

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
    menteeCoursesForStudentView?: any[];
    
    // Category grouping
    coursesGroupedByCategory: { [categoryId: number]: { name: string; courses: CoreGradesGradeOverviewWithCourseData[] } } = {};
    categoryIds: number[] = [];
    
    // Hierarchical category structure
    categoryTree: CategoryNode[] = [];
    expandedCategories: { [categoryId: number]: boolean } = {};
    categoriesData: { [id: number]: any } = {};

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []);

        this.courses = new CoreGradesCoursesManager(source, CoreGradesCoursesPage);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        // CRITICAL: Reset the source to clear stale items and force fresh data load
        // This handles switching between children where stale course data could persist
        // Using reset() instead of setDirty() to CLEAR the items array immediately
        const source = this.courses.getSource();
        const oldItems = source.getItems();
        console.log('[Courses Page] Resetting source, clearing', oldItems?.length || 0, 'old items:', oldItems?.map((c: any) => c.courseid));
        source.reset();  // This clears items AND marks as needing reload

        // Check if we're using a mentee token (parent viewing as child)
        const site = CoreSites.getCurrentSite();
        let isUsingMenteeToken = false;
        if (site) {
            try {
                const originalToken = await site.getLocalSiteConfig<string>(`CoreUserParent:originalToken:${site.getId()}`);
                isUsingMenteeToken = !!originalToken && originalToken !== '';
                console.log('[Courses Page] Is using mentee token:', isUsingMenteeToken, 'Site user ID:', site.getUserId());
            } catch {
                // Error checking mentee token
            }
        }

        // If using mentee token, we're in "student view" but as a parent viewing their child
        if (isUsingMenteeToken) {
            // We're a parent viewing as their child, show student view
            this.isParentView = false;
        } else {
            // Check if user is a parent
            this.isParentView = await CoreUserParent.isParentUser();

            // Get mentees if user is a parent
            if (this.isParentView) {
                this.mentees = await CoreUserParent.getMentees();
                this.selectedMenteeId = await CoreUserParent.getSelectedMentee() || undefined;
            }
        }

        await this.fetchInitialCourses();

        // Only start the courses manager if not in parent view
        if (!this.isParentView) {
            // Check if this is a parent forced into student view
            const isActuallyParent = await CoreUserParent.isParentUser();
            if (isActuallyParent && this.mentees.length > 0) {
                // Fetch mentee courses even in student view
                await this.fetchAllMenteeCourses();
                this.parentDataLoaded = true;
            }

            this.courses.start(this.splitView);

            // Listen to the source for when items are loaded
            this.courses.getSource().addListener({
                onItemsUpdated: () => {
                    this.groupCoursesByCategory();
                },
            });

            // Initial grouping if items are already loaded
            if (this.courses.loaded) {
                this.groupCoursesByCategory();
            }

            // If parent in student view and we have mentee courses, manually trigger grouping
            if (isActuallyParent && this.selectedMenteeId && this.menteeCourses[this.selectedMenteeId]) {
                const menteeCourses = this.menteeCourses[this.selectedMenteeId];

                // Store mentee courses for grouping
                this.menteeCoursesForStudentView = menteeCourses;

                // Trigger grouping with mentee courses
                this.groupCoursesByCategory();
            }
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
                // Use reload() instead of load() to ensure fresh data is fetched.
                // This is critical when switching between children - the source is a singleton
                // and might have stale items from the previous child.
                await this.courses.reload();
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
                // Use the working mentee course grades WS
                const hasCustomWS = await site.wsAvailable('local_aspireparent_get_mentee_course_grades');

                if (hasCustomWS) {
                    const response = await site.read<{ grades: any[] }>('local_aspireparent_get_mentee_course_grades', {
                        menteeid: Number(mentee.id),
                    });

                    if (response && response.grades && response.grades.length > 0) {
                        // Get course details for each grade
                        const courseIds = response.grades.map(g => g.courseid);
                        const courses = await CoreCourses.getCoursesByField('ids', courseIds.join(','), site.getId());

                        // Merge grade data with course data
                        const coursesWithGrades = response.grades.map(grade => {
                            const course = courses.find(c => c.id === grade.courseid);

                            return {
                                ...course,
                                id: grade.courseid,
                                courseid: grade.courseid,
                                courseFullName: course?.fullname || 'Unknown Course',
                                fullname: course?.fullname || 'Unknown Course',
                                grade: grade.grade || '-',
                                rawgrade: grade.rawgrade || '',
                                rank: grade.rank,
                            };
                        });

                        this.menteeCourses[mentee.id] = coursesWithGrades;
                    } else {
                        // Fallback: Get mentee's courses and fetch grades individually
                        await this.fetchMenteeCoursesWithIndividualGrades(site, mentee);
                    }
                } else {
                    // Fallback: get all mentee courses without grades
                    await this.fetchMenteeCoursesWithoutGrades(site, mentee);
                }
            } catch {
                this.menteeCourses[mentee.id] = [];
            }
        });

        await Promise.all(promises);
    }

    /**
     * Fallback: fetch mentee courses and get grades individually.
     */
    private async fetchMenteeCoursesWithIndividualGrades(site: CoreSite, mentee: any): Promise<void> {
        try {
            let courses: any[] = [];
            const hasCustomCoursesWS = await site.wsAvailable('local_aspireparent_get_mentee_courses');

            if (hasCustomCoursesWS) {
                const response = await site.read<any>('local_aspireparent_get_mentee_courses', {
                    userid: Number(mentee.id),
                    returnusercount: false,
                    moodlewssettingfileurl: true,
                    moodlewssettingfilter: true,
                });
                courses = response || [];
            } else {
                courses = await CoreCourses.getUserCourses(false, site.getId()) as any[];
            }

            if (courses.length > 0) {
                const coursesWithGrades: any[] = [];
                for (const course of courses) {
                    const courseWithGrade = {
                        ...course,
                        id: course.id,
                        courseid: course.id,
                        courseFullName: course.fullname,
                        fullname: course.fullname,
                        grade: '-',
                        rawgrade: '',
                    };

                    // Try to get grade for this course
                    try {
                        const hasGradesWS = await site.wsAvailable('local_aspireparent_get_mentee_grades');
                        if (hasGradesWS) {
                            const gradeResponse = await site.read<any>('local_aspireparent_get_mentee_grades', {
                                courseid: course.id,
                                userid: mentee.id,
                            });

                            if (gradeResponse?.usergrades?.[0]?.gradeitems) {
                                const gradeItems = gradeResponse.usergrades[0].gradeitems;
                                const courseTotal = gradeItems.find((item: any) => item.itemtype === 'course');

                                if (courseTotal) {
                                    if (courseTotal.gradeformatted) {
                                        courseWithGrade.grade = courseTotal.gradeformatted;
                                        courseWithGrade.rawgrade = String(courseTotal.graderaw || '');
                                    } else if (courseTotal.percentageformatted) {
                                        courseWithGrade.grade = courseTotal.percentageformatted;
                                        courseWithGrade.rawgrade = String(courseTotal.graderaw || '');
                                    } else if (courseTotal.graderaw !== null && courseTotal.graderaw !== undefined) {
                                        const gradeValue = parseFloat(courseTotal.graderaw);
                                        if (!isNaN(gradeValue)) {
                                            if (courseTotal.grademax && courseTotal.grademin !== undefined) {
                                                const percentage = ((gradeValue - courseTotal.grademin) /
                                                    (courseTotal.grademax - courseTotal.grademin)) * 100;
                                                courseWithGrade.grade = percentage.toFixed(2) + '%';
                                            } else {
                                                courseWithGrade.grade = gradeValue.toFixed(2);
                                            }
                                            courseWithGrade.rawgrade = String(gradeValue);
                                        }
                                    }
                                }
                            }
                        }
                    } catch {
                        // Could not get grade for this course
                    }

                    coursesWithGrades.push(courseWithGrade);
                }

                this.menteeCourses[mentee.id] = coursesWithGrades;
            } else {
                this.menteeCourses[mentee.id] = [];
            }
        } catch {
            this.menteeCourses[mentee.id] = [];
        }
    }

    /**
     * Fallback: fetch mentee courses without grades.
     */
    private async fetchMenteeCoursesWithoutGrades(site: CoreSite, mentee: any): Promise<void> {
        try {
            const hasCustomCoursesWS = await site.wsAvailable('local_aspireparent_get_mentee_courses');

            if (hasCustomCoursesWS) {
                const response = await site.read<any>('local_aspireparent_get_mentee_courses', {
                    userid: Number(mentee.id),
                    returnusercount: false,
                    moodlewssettingfileurl: true,
                    moodlewssettingfilter: true,
                });

                if (response && Array.isArray(response)) {
                    this.menteeCourses[mentee.id] = response.map(course => ({
                        ...course,
                        id: course.id,
                        courseid: course.id,
                        courseFullName: course.fullname,
                        fullname: course.fullname,
                        grade: '-',
                        rawgrade: '',
                    }));
                }
            } else {
                // Ultimate fallback
                const courses = await CoreCourses.getUserCourses(false, site.getId());
                this.menteeCourses[mentee.id] = courses.map(course => ({
                    ...course,
                    courseid: course.id,
                    courseFullName: course.fullname,
                    grade: '-',
                    rawgrade: '',
                }));
            }
        } catch {
            this.menteeCourses[mentee.id] = [];
        }
    }

    /**
     * Get courses for a specific mentee.
     *
     * @param menteeId The mentee user ID.
     * @returns List of courses with grades for the mentee.
     */
    getCoursesForMentee(menteeId: number): any[] {
        const allCourses = this.menteeCourses[menteeId] || [];

        if (!this.parentDataLoaded) {
            return [];
        }

        // Filter to only show courses with grades (not "-")
        return allCourses.filter(course => course.grade && course.grade !== '-');
    }

    /**
     * Check if any mentee has courses.
     *
     * @returns True if any mentee has courses.
     */
    hasAnyCourses(): boolean {
        for (const menteeId of Object.keys(this.menteeCourses)) {
            if (this.menteeCourses[+menteeId] && this.menteeCourses[+menteeId].length > 0) {
                return true;
            }
        }
        return false;
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
    
    /**
     * Group courses by category hierarchically.
     */
    protected async groupCoursesByCategory(): Promise<void> {
        // Use mentee courses if available (for parent in student view)
        const allCourses = this.menteeCoursesForStudentView || this.courses.items || [];

        // Filter to only show courses with grades (not "-")
        const coursesToGroup = allCourses.filter((course: any) => course.grade && course.grade !== '-');

        this.coursesGroupedByCategory = {};
        this.categoryIds = [];
        this.categoryTree = [];

        if (coursesToGroup.length === 0) {
            return;
        }

        try {
            // First, get full course information with category data
            const courseIds = coursesToGroup.map((item: CoreGradesGradeOverviewWithCourseData) => item.courseid);
            const coursesData = await CoreCourses.getCoursesByField('ids', courseIds.join(','));

            // Create a map for quick lookup
            const courseMap: { [id: number]: any } = {};
            const categoryIdsSet = new Set<number>();

            coursesData.forEach(course => {
                courseMap[course.id] = course;
                if (course.categoryid) {
                    categoryIdsSet.add(course.categoryid);
                }
            });

            // Fetch all categories data
            const categories = await CoreCourses.getCategories(0, true);

            categories.forEach(cat => {
                this.categoriesData[cat.id] = cat;
            });

            // Build the category tree
            const categoryNodes: { [id: number]: CategoryNode } = {};

            // First pass: create all nodes
            categories.forEach(cat => {
                if (categoryIdsSet.has(cat.id) || cat.coursecount > 0) {
                    categoryNodes[cat.id] = {
                        id: cat.id,
                        name: cat.name,
                        parent: cat.parent,
                        depth: cat.depth,
                        path: cat.path,
                        coursecount: cat.coursecount,
                        courses: [],
                        children: [],
                        expanded: false,
                    };
                }
            });

            // Add uncategorized node if needed
            categoryNodes[0] = {
                id: 0,
                name: 'Uncategorized',
                parent: 0,
                depth: 0,
                path: '/0',
                courses: [],
                children: [],
                expanded: false,
            };

            // Assign courses to their categories
            coursesToGroup.forEach((gradeItem: CoreGradesGradeOverviewWithCourseData) => {
                const courseInfo = courseMap[gradeItem.courseid];
                const categoryId = courseInfo?.categoryid || 0;

                if (categoryNodes[categoryId]) {
                    categoryNodes[categoryId].courses.push(gradeItem);
                } else {
                    // Put in uncategorized
                    categoryNodes[0].courses.push(gradeItem);
                }
            });

            // Second pass: build hierarchy
            Object.values(categoryNodes).forEach(node => {
                if (node.parent === 0 || !categoryNodes[node.parent]) {
                    // Top level category
                    this.categoryTree.push(node);
                } else {
                    // Child category
                    categoryNodes[node.parent].children.push(node);
                }
            });

            // Sort categories by name at each level
            const sortCategories = (nodes: CategoryNode[]) => {
                nodes.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
                nodes.forEach(node => {
                    if (node.children.length > 0) {
                        sortCategories(node.children);
                    }
                });
            };

            sortCategories(this.categoryTree);

            // Filter out empty categories (no courses and no children with courses)
            this.categoryTree = this.filterEmptyCategories(this.categoryTree);

            // Auto-expand categories with courses
            this.autoExpandCategories(this.categoryTree);
        } catch {
            // Fallback: flat list
            this.categoryTree = [{
                id: 0,
                name: 'All Courses',
                parent: 0,
                depth: 0,
                path: '/0',
                courses: coursesToGroup as CoreGradesGradeOverviewWithCourseData[],
                children: [],
                expanded: true,
            }];
        }
    }

    /**
     * Recursively filter out empty categories (no courses and no non-empty children).
     */
    protected filterEmptyCategories(nodes: CategoryNode[]): CategoryNode[] {
        return nodes.filter(node => {
            // First, recursively filter children
            if (node.children.length > 0) {
                node.children = this.filterEmptyCategories(node.children);
            }

            // Keep this node if it has courses OR has non-empty children
            const hasCourses = node.courses.length > 0;
            const hasNonEmptyChildren = node.children.length > 0;

            return hasCourses || hasNonEmptyChildren;
        });
    }

    protected autoExpandCategories(nodes: CategoryNode[]): void {
        nodes.forEach(node => {
            if (node.courses.length > 0 || node.children.some(child => child.courses.length > 0)) {
                node.expanded = true;
                this.expandedCategories[node.id] = true;
            }
            if (node.children.length > 0) {
                this.autoExpandCategories(node.children);
            }
        });
    }
    
    /**
     * Toggle category expansion
     */
    toggleCategory(categoryId: number): void {
        this.expandedCategories[categoryId] = !this.expandedCategories[categoryId];
        const updateNode = (nodes: CategoryNode[]) => {
            nodes.forEach(node => {
                if (node.id === categoryId) {
                    node.expanded = this.expandedCategories[categoryId];
                }
                if (node.children.length > 0) {
                    updateNode(node.children);
                }
            });
        };
        updateNode(this.categoryTree);
    }

    /**
     * Get total count of courses with grades.
     */
    getTotalCourseCount(): number {
        const countCourses = (nodes: CategoryNode[]): number => {
            return nodes.reduce((total, node) => {
                return total + node.courses.length + countCourses(node.children);
            }, 0);
        };
        return countCourses(this.categoryTree);
    }

    /**
     * Get overall average grade across all courses.
     */
    getOverallAverage(): number | null {
        const allCourses = this.menteeCoursesForStudentView || this.courses.items || [];
        const coursesWithGrades = allCourses.filter((course: any) => {
            if (!course.grade || course.grade === '-') return false;
            const gradeStr = String(course.grade).replace('%', '').trim();
            return !isNaN(parseFloat(gradeStr));
        });

        if (coursesWithGrades.length === 0) return null;

        const total = coursesWithGrades.reduce((sum: number, course: any) => {
            const gradeStr = String(course.grade).replace('%', '').trim();
            return sum + parseFloat(gradeStr);
        }, 0);

        return total / coursesWithGrades.length;
    }

    /**
     * Get subject icon based on course name.
     */
    getSubjectIcon(courseName: string): string {
        const name = courseName.toLowerCase();
        if (name.includes('math') || name.includes('رياضيات')) return 'calculator-outline';
        if (name.includes('arabic') || name.includes('عربي')) return 'language-outline';
        if (name.includes('english')) return 'text-outline';
        if (name.includes('science') || name.includes('علوم')) return 'flask-outline';
        if (name.includes('reading')) return 'book-outline';
        if (name.includes('german') || name.includes('french') || name.includes('spanish')) return 'globe-outline';
        if (name.includes('religion') || name.includes('دين')) return 'heart-outline';
        if (name.includes('art') || name.includes('فن')) return 'color-palette-outline';
        if (name.includes('music') || name.includes('موسيقى')) return 'musical-notes-outline';
        if (name.includes('pe') || name.includes('physical') || name.includes('sport')) return 'fitness-outline';
        if (name.includes('computer') || name.includes('ict') || name.includes('حاسب')) return 'desktop-outline';
        if (name.includes('history') || name.includes('تاريخ')) return 'time-outline';
        if (name.includes('geography') || name.includes('جغرافيا')) return 'earth-outline';
        return 'school-outline';
    }

    /**
     * Get grade color class based on percentage.
     */
    getGradeColorClass(grade: string): string {
        if (!grade || grade === '-') return 'grade-none';
        const gradeStr = String(grade).replace('%', '').trim();
        const gradeNum = parseFloat(gradeStr);
        if (isNaN(gradeNum)) return 'grade-none';
        if (gradeNum >= 90) return 'grade-excellent';
        if (gradeNum >= 80) return 'grade-good';
        if (gradeNum >= 70) return 'grade-average';
        if (gradeNum >= 60) return 'grade-below';
        return 'grade-poor';
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
