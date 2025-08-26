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
        
        // Check if user is a parent
        this.isParentView = await CoreUserParent.isParentUser();
        console.log('[Grades] isParentView:', this.isParentView);
        
        // Always get mentees if user is a parent (even in forced student view)
        const isActuallyParent = await CoreUserParent.isParentUser();
        if (isActuallyParent) {
            this.mentees = await CoreUserParent.getMentees();
            this.selectedMenteeId = await CoreUserParent.getSelectedMentee() || undefined;
            console.log('[Grades] Parent user detected with', this.mentees.length, 'mentees');
        }
        
        if (this.isParentView) {
            console.log('[Grades] Parent view detected with', this.mentees.length, 'mentees');
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
                    console.log('[Grades] Fetching course grades for mentee:', mentee.id);
                    console.log('[Grades] Using local_aspireparent_get_mentee_course_grades');
                    
                    const response = await site.read<{ grades: any[] }>('local_aspireparent_get_mentee_course_grades', {
                        menteeid: mentee.id
                    });
                    
                    console.log('[Grades] Response from WS:', response);
                    console.log('[Grades] Number of grades received:', response.grades?.length || 0);
                    
                    if (response.grades && response.grades.length > 0) {
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
                        console.log(`[Grades] Found ${coursesWithGrades.length} courses with grades for mentee ${mentee.id}`);
                        console.log('[Grades] First course with grade:', coursesWithGrades[0]);
                    } else {
                        console.log('[Grades] No grades returned for mentee:', mentee.id);
                        // Try to at least get the courses without grades
                        try {
                            const hasCustomCoursesWS = await site.wsAvailable('local_aspireparent_get_mentee_courses');
                            
                            if (hasCustomCoursesWS) {
                                console.log('[Grades] Fetching courses without grades for mentee');
                                const coursesResponse = await site.read<{ courses: any[] }>('local_aspireparent_get_mentee_courses', {
                                    menteeid: mentee.id
                                });
                                
                                if (coursesResponse.courses && coursesResponse.courses.length > 0) {
                                    this.menteeCourses[mentee.id] = coursesResponse.courses.map(course => ({
                                        ...course,
                                        id: course.id,
                                        courseid: course.id,
                                        courseFullName: course.fullname,
                                        fullname: course.fullname,
                                        grade: '-',
                                        rawgrade: ''
                                    }));
                                    console.log(`[Grades] Found ${coursesResponse.courses.length} courses for mentee (without grades)`);
                                } else {
                                    this.menteeCourses[mentee.id] = [];
                                }
                            } else {
                                this.menteeCourses[mentee.id] = [];
                            }
                        } catch (coursesError) {
                            console.error('[Grades] Error fetching courses without grades:', coursesError);
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
                            const response = await site.read<{ courses: any[] }>('local_aspireparent_get_mentee_courses', {
                                menteeid: mentee.id
                            });
                            
                            if (response.courses) {
                                this.menteeCourses[mentee.id] = response.courses.map(course => ({
                                    ...course,
                                    id: course.id,
                                    courseid: course.id,
                                    courseFullName: course.fullname,
                                    fullname: course.fullname,
                                    grade: '-',
                                    rawgrade: ''
                                }));
                                console.log(`[Grades] Found ${response.courses.length} courses for mentee ${mentee.id} (no grades)`);
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
        const courses = this.menteeCourses[menteeId] || [];
        console.log(`[Grades] getCoursesForMentee(${menteeId}) returning ${courses.length} courses`);
        if (courses.length > 0) {
            console.log('[Grades] First course for mentee:', courses[0]);
        }
        return courses;
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
        const coursesToGroup = this.menteeCoursesForStudentView || this.courses.items || [];
        console.log('[Grades] Number of courses to group:', coursesToGroup.length);
        console.log('[Grades] Using mentee courses:', !!this.menteeCoursesForStudentView);
        
        this.coursesGroupedByCategory = {};
        this.categoryIds = [];
        this.categoryTree = [];
        
        if (coursesToGroup.length === 0) {
            console.log('[Grades] No courses to group, exiting');
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
