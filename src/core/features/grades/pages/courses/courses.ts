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
        console.log('[Grades] Constructor called');
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []);

        this.courses = new CoreGradesCoursesManager(source, CoreGradesCoursesPage);
        console.log('[Grades] Courses manager created:', this.courses);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        console.log('[Grades] ngAfterViewInit called');
        
        // Check if we're using a mentee token (parent viewing as child)
        const site = CoreSites.getCurrentSite();
        let isUsingMenteeToken = false;
        if (site) {
            try {
                const originalToken = await site.getLocalSiteConfig<string>(`CoreUserParent:originalToken:${site.getId()}`);
                isUsingMenteeToken = !!originalToken && originalToken !== '';
                console.log('[Grades] isUsingMenteeToken:', isUsingMenteeToken);
            } catch {
                console.log('[Grades] Error checking mentee token');
            }
        }
        
        // If using mentee token, we're in "student view" but as a parent viewing their child
        if (isUsingMenteeToken) {
            // We're a parent viewing as their child, show student view
            this.isParentView = false;
            console.log('[Grades] Parent viewing as child - showing student view');
        } else {
            // Check if user is a parent
            this.isParentView = await CoreUserParent.isParentUser();
            console.log('[Grades] isParentView:', this.isParentView);
            
            // Get mentees if user is a parent
            if (this.isParentView) {
                this.mentees = await CoreUserParent.getMentees();
                this.selectedMenteeId = await CoreUserParent.getSelectedMentee() || undefined;
                console.log('[Grades] Parent user detected with', this.mentees.length, 'mentees');
            }
        }

        await this.fetchInitialCourses();

        // Only start the courses manager if not in parent view
        if (!this.isParentView) {
            console.log('[Grades] Starting courses manager for student view');
            
            // Check if this is a parent forced into student view
            const isActuallyParent = await CoreUserParent.isParentUser();
            if (isActuallyParent && this.mentees.length > 0) {
                console.log('[Grades] Parent in student view detected, fetching mentee courses');
                // Fetch mentee courses even in student view
                await this.fetchAllMenteeCourses();
                this.parentDataLoaded = true;
            }
            
            this.courses.start(this.splitView);
            
            // Listen to the source for when items are loaded
            this.courses.getSource().addListener({
                onItemsUpdated: (items) => {
                    console.log('[Grades] onItemsUpdated triggered with', items?.length || 0, 'items, calling groupCoursesByCategory');
                    this.groupCoursesByCategory();
                }
            });
            
            // Initial grouping if items are already loaded
            if (this.courses.loaded) {
                console.log('[Grades] Courses already loaded, calling groupCoursesByCategory');
                this.groupCoursesByCategory();
            } else {
                console.log('[Grades] Courses not yet loaded, will group when loaded');
            }
            
            // If parent in student view and we have mentee courses, manually trigger grouping
            if (isActuallyParent && this.selectedMenteeId && this.menteeCourses[this.selectedMenteeId]) {
                console.log('[Grades] Parent in student view with mentee courses');
                const menteeCourses = this.menteeCourses[this.selectedMenteeId];
                console.log('[Grades] Found', menteeCourses.length, 'mentee courses to display');
                
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
        console.log('[Grades] fetchInitialCourses called');
        try {
            if (this.isParentView && this.mentees.length > 0) {
                console.log('[Grades] Fetching courses for parent view');
                // For parent view, fetch courses for each mentee
                await this.fetchAllMenteeCourses();
                this.parentDataLoaded = true;
            } else {
                console.log('[Grades] Loading courses for student view');
                await this.courses.load();
                console.log('[Grades] Courses loaded, loaded status:', this.courses.loaded);
                console.log('[Grades] Number of items:', this.courses.items?.length || 0);
            }
        } catch (error) {
            console.error('[Grades] Error in fetchInitialCourses:', error);
            CoreDomUtils.showErrorModalDefault(error, 'Error loading courses');
        }
    }

    /**
     * Fetch courses with grades for all mentees.
     */
    private async fetchAllMenteeCourses(): Promise<void> {
        console.log('[Grades] fetchAllMenteeCourses called');
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
                    console.log('[Grades] ========================================');
                    console.log('[Grades] Fetching course grades for mentee:', mentee.id, mentee.fullname);
                    console.log('[Grades] Using local_aspireparent_get_mentee_course_grades');
                    console.log('[Grades] Request params:', { menteeid: Number(mentee.id) });

                    const response = await site.read<{ grades: any[] }>('local_aspireparent_get_mentee_course_grades', {
                        menteeid: Number(mentee.id)
                    });

                    console.log('[Grades] Response from WS for mentee', mentee.id, ':', response);
                    console.log('[Grades] Number of grades received for', mentee.fullname, ':', response.grades?.length || 0);
                    if (response.grades && response.grades.length > 0) {
                        console.log('[Grades] First grade course ID:', response.grades[0].courseid);
                        console.log('[Grades] First grade value:', response.grades[0].grade);
                    }
                    
                    if (response && response.grades && response.grades.length > 0) {
                        // Get course details for each grade
                        const courseIds = response.grades.map(g => g.courseid);
                        console.log('[Grades] Fetching course details for IDs:', courseIds);
                        
                        const courses = await CoreCourses.getCoursesByField('ids', courseIds.join(','), site.getId());
                        console.log('[Grades] Retrieved course details:', courses.length);
                        
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
                                rank: grade.rank
                            };
                        });
                        
                        this.menteeCourses[mentee.id] = coursesWithGrades;
                        console.log(`[Grades] ✓ STORED ${coursesWithGrades.length} courses for mentee ID: ${mentee.id} (${mentee.fullname})`);
                        console.log('[Grades] First course stored:', coursesWithGrades[0]?.fullname, 'with grade:', coursesWithGrades[0]?.grade);
                        console.log('[Grades] ========================================');
                    } else {
                        console.log('[Grades] No grades returned for mentee:', mentee.id);
                        console.log('[Grades] Full response:', response);
                        console.log('[Grades] Falling back to getting individual courses');
                        
                        // Fallback: Get mentee's courses and fetch grades individually
                        try {
                            // Get all courses for the mentee - we need to use a custom WS if available
                            let courses: any[] = [];
                            const hasCustomCoursesWS = await site.wsAvailable('local_aspireparent_get_mentee_courses');
                            
                            if (hasCustomCoursesWS) {
                                console.log('[Grades] Using custom WS to get mentee courses');
                                const response = await site.read<any>('local_aspireparent_get_mentee_courses', {
                                    userid: Number(mentee.id),
                                    returnusercount: false,
                                    moodlewssettingfileurl: true,
                                    moodlewssettingfilter: true
                                });
                                courses = response || [];
                            } else {
                                // Fallback to regular courses
                                courses = await CoreCourses.getUserCourses(false, site.getId()) as any[];
                            }
                            console.log('[Grades] Found', courses.length, 'courses for user');
                            
                            if (courses.length > 0) {
                                // For each course, try to get the grade
                                const coursesWithGrades: any[] = [];
                                for (const course of courses) {
                                    const courseWithGrade = {
                                        ...course,
                                        id: course.id,
                                        courseid: course.id,
                                        courseFullName: course.fullname,
                                        fullname: course.fullname,
                                        grade: '-',
                                        rawgrade: ''
                                    };
                                    
                                    // Try to get grade for this course
                                    try {
                                        const hasGradesWS = await site.wsAvailable('local_aspireparent_get_mentee_grades');
                                        if (hasGradesWS) {
                                            const gradeResponse = await site.read<any>('local_aspireparent_get_mentee_grades', {
                                                courseid: course.id,
                                                userid: mentee.id
                                            });
                                            
                                            console.log('[Grades] Grade response for course', course.id, ':', gradeResponse);
                                            
                                            if (gradeResponse?.usergrades?.[0]?.gradeitems) {
                                                const gradeItems = gradeResponse.usergrades[0].gradeitems;
                                                console.log('[Grades] Found', gradeItems.length, 'grade items for course', course.id);
                                                
                                                // Find course total grade
                                                const courseTotal = gradeItems.find((item: any) => item.itemtype === 'course');
                                                
                                                if (courseTotal) {
                                                    console.log('[Grades] Course total found:', courseTotal);
                                                    
                                                    if (courseTotal.gradeformatted) {
                                                        courseWithGrade.grade = courseTotal.gradeformatted;
                                                        courseWithGrade.rawgrade = String(courseTotal.graderaw || '');
                                                    } else if (courseTotal.percentageformatted) {
                                                        courseWithGrade.grade = courseTotal.percentageformatted;
                                                        courseWithGrade.rawgrade = String(courseTotal.graderaw || '');
                                                    } else if (courseTotal.graderaw !== null && courseTotal.graderaw !== undefined) {
                                                        // Format the grade ourselves
                                                        const gradeValue = parseFloat(courseTotal.graderaw);
                                                        if (!isNaN(gradeValue)) {
                                                            if (courseTotal.grademax && courseTotal.grademin !== undefined) {
                                                                const percentage = ((gradeValue - courseTotal.grademin) / (courseTotal.grademax - courseTotal.grademin)) * 100;
                                                                courseWithGrade.grade = percentage.toFixed(2) + '%';
                                                            } else {
                                                                courseWithGrade.grade = gradeValue.toFixed(2);
                                                            }
                                                            courseWithGrade.rawgrade = String(gradeValue);
                                                        }
                                                    }
                                                } else {
                                                    console.log('[Grades] No course total found, checking for any graded items');
                                                    // Maybe there's no course total but individual items have grades
                                                    const gradedItem = gradeItems.find((item: any) => 
                                                        item.graderaw !== null && item.graderaw !== undefined);
                                                    if (gradedItem) {
                                                        console.log('[Grades] Found graded item:', gradedItem);
                                                    }
                                                }
                                            }
                                        }
                                    } catch (gradeError) {
                                        console.log('[Grades] Could not get grade for course', course.id, gradeError);
                                    }
                                    
                                    coursesWithGrades.push(courseWithGrade);
                                }
                                
                                this.menteeCourses[mentee.id] = coursesWithGrades;
                                console.log(`[Grades] Fallback: Found ${coursesWithGrades.length} courses for mentee ${mentee.id}`);
                            } else {
                                this.menteeCourses[mentee.id] = [];
                            }
                        } catch (fallbackError) {
                            console.error('[Grades] Fallback failed:', fallbackError);
                            this.menteeCourses[mentee.id] = [];
                        }
                    }
                } else {
                    console.warn('[Grades] Custom WS not available, using fallback');
                    // Fallback: get all mentee courses
                    try {
                        // Try to get courses for the specific mentee
                        const hasCustomCoursesWS = await site.wsAvailable('local_aspireparent_get_mentee_courses');
                        
                        if (hasCustomCoursesWS) {
                            console.log('[Grades] Using custom WS to get mentee courses');
                            const response = await site.read<any>('local_aspireparent_get_mentee_courses', {
                                userid: Number(mentee.id),
                                returnusercount: false,
                                moodlewssettingfileurl: true,
                                moodlewssettingfilter: true
                            });
                            
                            if (response && Array.isArray(response)) {
                                this.menteeCourses[mentee.id] = response.map(course => ({
                                    ...course,
                                    id: course.id,
                                    courseid: course.id,
                                    courseFullName: course.fullname,
                                    fullname: course.fullname,
                                    grade: '-',
                                    rawgrade: ''
                                }));
                                console.log(`[Grades] Found ${response.length} courses for mentee ${mentee.id} (no grades)`);
                            }
                        } else {
                            // Ultimate fallback
                            const courses = await CoreCourses.getUserCourses(false, site.getId());
                            this.menteeCourses[mentee.id] = courses.map(course => ({
                                ...course,
                                courseid: course.id,
                                courseFullName: course.fullname,
                                grade: '-',
                                rawgrade: ''
                            }));
                        }
                    } catch (fallbackError) {
                        console.error('[Grades] Fallback error:', fallbackError);
                        this.menteeCourses[mentee.id] = [];
                    }
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
        const allCourses = this.menteeCourses[menteeId] || [];
        const mentee = this.mentees.find(m => m.id === menteeId);

        if (!this.parentDataLoaded) {
            console.log(`[Grades] getCoursesForMentee(${menteeId}) called but data not loaded yet`);
            return [];
        }

        console.log(`[Grades] ▶ getCoursesForMentee called for ID: ${menteeId} (${mentee?.fullname || 'Unknown'})`);
        console.log(`[Grades] Available mentee IDs in menteeCourses:`, Object.keys(this.menteeCourses));
        console.log(`[Grades] Total courses before filter: ${allCourses.length}`);

        // Filter to only show courses with grades (not "-")
        const courses = allCourses.filter(course => course.grade && course.grade !== '-');
        console.log(`[Grades] Courses with grades after filter: ${courses.length}`);

        if (courses.length > 0) {
            console.log('[Grades] First course for this mentee:', courses[0]?.fullname, 'grade:', courses[0]?.grade);
            console.log('[Grades] Last course for this mentee:', courses[courses.length - 1]?.fullname, 'grade:', courses[courses.length - 1]?.grade);
        }

        return courses;
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
        console.log('[Grades] Starting hierarchical category grouping');

        // Use mentee courses if available (for parent in student view)
        const allCourses = this.menteeCoursesForStudentView || this.courses.items || [];
        console.log('[Grades] Total courses before filtering:', allCourses.length);
        console.log('[Grades] Using mentee courses:', !!this.menteeCoursesForStudentView);

        // Filter to only show courses with grades (not "-")
        const coursesToGroup = allCourses.filter((course: any) => course.grade && course.grade !== '-');
        console.log('[Grades] Courses with grades to group:', coursesToGroup.length);

        this.coursesGroupedByCategory = {};
        this.categoryIds = [];
        this.categoryTree = [];

        if (coursesToGroup.length === 0) {
            console.log('[Grades] No courses with grades to group, exiting');
            return;
        }
        
        try {
            // First, get full course information with category data
            const courseIds = coursesToGroup.map((item: CoreGradesGradeOverviewWithCourseData) => item.courseid);
            console.log('[Grades] Fetching course data for IDs:', courseIds);
            
            const coursesData = await CoreCourses.getCoursesByField('ids', courseIds.join(','));
            console.log('[Grades] Retrieved course data for', coursesData.length, 'courses');
            
            // Create a map for quick lookup
            const courseMap: { [id: number]: any } = {};
            const categoryIdsSet = new Set<number>();
            
            coursesData.forEach(course => {
                courseMap[course.id] = course;
                if (course.categoryid) {
                    categoryIdsSet.add(course.categoryid);
                }
            });
            
            console.log('[Grades] Found', categoryIdsSet.size, 'unique categories');
            
            // Fetch all categories data
            console.log('[Grades] Fetching all categories from server');
            const categories = await CoreCourses.getCategories(0, true);
            console.log('[Grades] Retrieved', categories.length, 'categories from server');
            
            const categoriesMap: { [id: number]: CoreCategoryData } = {};
            
            categories.forEach(cat => {
                categoriesMap[cat.id] = cat;
                this.categoriesData[cat.id] = cat;
            });
            
            // Build the category tree
            const categoryNodes: { [id: number]: CategoryNode } = {};
            console.log('[Grades] Building category tree structure');
            
            // First pass: create all nodes
            let nodesCreated = 0;
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
                        expanded: false
                    };
                    nodesCreated++;
                }
            });
            console.log('[Grades] Created', nodesCreated, 'category nodes');
            
            // Add uncategorized node if needed
            categoryNodes[0] = {
                id: 0,
                name: 'Uncategorized',
                parent: 0,
                depth: 0,
                path: '/0',
                courses: [],
                children: [],
                expanded: false
            };
            
            // Assign courses to their categories
            console.log('[Grades] Assigning courses to categories');
            let coursesAssigned = 0;
            coursesToGroup.forEach((gradeItem: CoreGradesGradeOverviewWithCourseData) => {
                const courseInfo = courseMap[gradeItem.courseid];
                const categoryId = courseInfo?.categoryid || 0;
                
                if (categoryNodes[categoryId]) {
                    categoryNodes[categoryId].courses.push(gradeItem);
                    coursesAssigned++;
                    console.log('[Grades] Assigned course', gradeItem.courseid, 'to category', categoryId);
                } else {
                    // Put in uncategorized
                    categoryNodes[0].courses.push(gradeItem);
                    coursesAssigned++;
                    console.log('[Grades] Assigned course', gradeItem.courseid, 'to uncategorized');
                }
            });
            console.log('[Grades] Assigned', coursesAssigned, 'courses to categories');
            
            // Second pass: build hierarchy
            console.log('[Grades] Building category hierarchy');
            let topLevelCategories = 0;
            let childCategories = 0;
            Object.values(categoryNodes).forEach(node => {
                if (node.parent === 0 || !categoryNodes[node.parent]) {
                    // Top level category
                    this.categoryTree.push(node);
                    topLevelCategories++;
                } else {
                    // Child category
                    categoryNodes[node.parent].children.push(node);
                    childCategories++;
                }
            });
            console.log('[Grades] Found', topLevelCategories, 'top-level categories and', childCategories, 'child categories');
            
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
            console.log('[Grades] Filtering out empty categories');
            const beforeFilterCount = this.categoryTree.length;
            this.categoryTree = this.filterEmptyCategories(this.categoryTree);
            const afterFilterCount = this.categoryTree.length;
            console.log('[Grades] Filtered out', beforeFilterCount - afterFilterCount, 'empty categories');

            // Auto-expand categories with courses
            this.autoExpandCategories(this.categoryTree);

            console.log('[Grades] Built category tree with', this.categoryTree.length, 'top-level categories');
            console.log('[Grades] Category tree structure:', JSON.stringify(this.categoryTree.map(cat => ({
                id: cat.id,
                name: cat.name,
                courseCount: cat.courses.length,
                childCount: cat.children.length
            })), null, 2));
        } catch (error) {
            console.error('[Grades] Error building category hierarchy:', error);
            // Fallback: flat list
            this.categoryTree = [{
                id: 0,
                name: 'All Courses',
                parent: 0,
                depth: 0,
                path: '/0',
                courses: coursesToGroup as CoreGradesGradeOverviewWithCourseData[],
                children: [],
                expanded: true
            }];
            console.log('[Grades] Using fallback flat list with all courses');
        }
    }
    
    /**
     * Auto-expand categories that contain courses
     */
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

            if (!hasCourses && !hasNonEmptyChildren) {
                console.log('[Grades] Filtering out empty category:', node.name, '(id:', node.id, ')');
            }

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
