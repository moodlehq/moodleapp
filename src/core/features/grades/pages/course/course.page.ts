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

import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreGrades } from '@features/grades/services/grades';
import {
    CoreGradesFormattedTableColumn,
    CoreGradesFormattedTableRow,
    CoreGradesGradeOverviewWithCourseData,
    CoreGradesHelper,
} from '@features/grades/services/grades-helper';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { Translate } from '@singletons';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreUserParticipantsSource } from '@features/user/classes/participants-source';
import { CoreUserData, CoreUserParticipant } from '@features/user/services/user';
import { CoreGradesCoursesSource } from '@features/grades/classes/grades-courses-source';
import { CoreDom } from '@singletons/dom';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreText } from '@singletons/text';

/**
 * Page that displays a course grades.
 */
@Component({
    selector: 'page-core-grades-course',
    templateUrl: 'course.html',
    styleUrls: ['course.scss'],
})
export class CoreGradesCoursePage implements AfterViewInit, OnDestroy {

    courseId!: number;
    userId!: number;
    gradeId?: number;
    expandLabel!: string;
    collapseLabel!: string;
    title?: string;
    swipeManager?: CoreGradesCourseSwipeManager;
    columns: CoreGradesFormattedTableColumn[] = [];
    rows: CoreGradesFormattedTableRow[] = [];
    rowsOnView = 0;
    totalColumnsSpan?: number;
    withinSplitView?: boolean;
    loaded = false;
    
    // Parent viewing properties
    isParentUser = false;
    viewingAsMentee = false;
    selectedMentee?: CoreUserProfile;
    
    // New properties for enhanced view
    viewMode: 'grouped' | 'timeline' | 'table' = 'table';
    gradeDistributionData: number[] = [];
    gradeDistributionLabels: string[] = [];
    groupedCategories: any[] = [];
    timelineData: any[] = [];
    hideHeader = false;
    distributionExpanded = false;

    // Store server's course total for accurate display
    protected serverCourseTotal: CoreGradesFormattedTableRow | null = null;

    protected useLegacyLayout?: boolean; // Whether to use the layout before 4.1.
    protected logView: () => void;

    constructor(
        protected route: ActivatedRoute,
        protected element: ElementRef<HTMLElement>,
    ) {
        this.logView = CoreTime.once(() => this.performLogView());

        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId', { route });
            this.userId = CoreNavigator.getRouteNumberParam('userId', { route }) ?? CoreSites.getCurrentSiteUserId();
            this.gradeId = CoreNavigator.getRouteNumberParam('gradeId', { route });

            this.expandLabel = Translate.instant('core.expand');
            this.collapseLabel = Translate.instant('core.collapse');
            this.useLegacyLayout = !CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('4.1');

            switch (route.snapshot?.data.swipeManagerSource ?? route.snapshot?.parent?.data.swipeManagerSource) {
                case 'courses': {
                    const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []);
                    // Log current items for debugging - these might be stale if user switched children
                    const currentItems = source.getItems();
                    console.log('[Course Page] Swipe source items:', currentItems?.map((c: any) => c.courseid));
                    // Don't reset here - the courses page should have done it
                    // Just create the swipe manager with current source
                    this.swipeManager = new CoreGradesCourseCoursesSwipeManager(source);
                    break;
                }
                case 'participants': {
                    const search = CoreNavigator.getRouteParam('search');

                    this.swipeManager = new CoreGradesCourseParticipantsSwipeManager(
                        CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreUserParticipantsSource, [this.courseId, search]),
                    );
                }
                    break;
            }
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }
    }

    get showSummary(): boolean {
        return CoreScreen.isMobile || !!this.withinSplitView;
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.withinSplitView = !!this.element.nativeElement.parentElement?.closest('core-split-view');

        // Check if we're coming from the course page (URL contains /course/ followed by number and /grades)
        const currentUrl = window.location.href;
        // Hide header when accessed from course page with URL pattern like /main/home/course/4/grades
        this.hideHeader = /\/course\/\d+\/grades/.test(currentUrl);

        // Check if viewing as parent/mentee
        await this.checkParentContext();

        await this.swipeManager?.start();
        await this.fetchInitialGrades();

        this.loaded = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.swipeManager?.destroy();
    }

    /**
     * Get aria label for row.
     *
     * @param row Row.
     * @returns Aria label, if applicable.
     */
    rowAriaLabel(row: CoreGradesFormattedTableRow): string | undefined {
        if (!row.expandable || !this.showSummary) {
            return;
        }

        const actionLabel = row.expanded ? this.collapseLabel : this.expandLabel;

        return `${actionLabel} ${row.ariaLabel}`;
    }

    /**
     * Toggle whether a row is expanded or collapsed.
     *
     * @param row Row.
     * @param expand If defined, force expand or collapse.
     */
    toggleRow(row: CoreGradesFormattedTableRow, expand?: boolean): void {
        if (!this.rows || !this.columns) {
            return;
        }

        row.expanded = expand ?? !row.expanded;

        let colspan: number = this.columns.length + (row.colspan ?? 0);

        if (this.useLegacyLayout) {
            colspan--;
        }

        for (let i = this.rows.indexOf(row) - 1; i >= 0; i--) {
            const previousRow = this.rows[i];

            if (
                !previousRow.rowspan ||
                !previousRow.colspan ||
                previousRow.colspan !== colspan ||
                (!this.useLegacyLayout && previousRow.itemtype !== 'leader') ||
                (this.useLegacyLayout && previousRow.expandable)
            ) {
                continue;
            }

            colspan++;
            previousRow.rowspan += row.expanded ? 1 : -1;
        }
    }

    /**
     * Refresh grades.
     *
     * @param refresher Refresher.
     */
    async refreshGrades(refresher: HTMLIonRefresherElement): Promise<void> {
        await CoreUtils.ignoreErrors(CoreGrades.invalidateCourseGradesData(this.courseId, this.userId));
        await CoreUtils.ignoreErrors(this.fetchGrades());

        refresher?.complete();
    }

    /**
     * Check if viewing as parent and update context accordingly.
     * Note: We don't override userId here - we trust the current authentication.
     * The userId is already set from the route or current site user.
     */
    private async checkParentContext(): Promise<void> {
        try {
            // Check if user is a parent (for UI purposes only)
            this.isParentUser = await CoreUserParent.isParentUser();

            // Check if viewing as a mentee
            const selectedMenteeId = await CoreUserParent.getSelectedMentee();
            const currentSiteUserId = CoreSites.getCurrentSiteUserId();

            if (selectedMenteeId && currentSiteUserId === selectedMenteeId) {
                this.viewingAsMentee = true;

                // Get mentee details for display
                try {
                    const mentees = await CoreUserParent.getMentees();
                    this.selectedMentee = mentees.find(m => m.id === selectedMenteeId);
                } catch {
                    // Ignore error getting mentee details
                }
            }
        } catch (error) {
            console.error('Error checking parent context:', error);
        }
    }

    /**
     * Obtain the initial table of grades.
     */
    private async fetchInitialGrades(): Promise<void> {
        try {
            await this.fetchGrades();

            if (this.gradeId && this.rows) {
                const row = this.rows.find((row) => row.id == this.gradeId);

                if (row) {
                    this.toggleRow(row, true);

                    CoreDom.scrollToElement(
                        this.element.nativeElement,
                        '#grade-' + row.id,
                    );
                    this.gradeId = undefined;
                }
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading course');

            this.columns = [];
            this.rows = [];
            this.rowsOnView = 0;
        }
    }

    /**
     * Update the table of grades.
     */
    private async fetchGrades(): Promise<void> {
        let table;
        try {
            table = await CoreGrades.getCourseGradesTable(this.courseId, this.userId);
        } catch (error: any) {
            // Check if this is an access error (likely wrong child's course)
            const errorMessage = error?.message || '';
            if (errorMessage.toLowerCase().includes('not accessible') ||
                errorMessage.toLowerCase().includes('access denied')) {
                // The course might belong to a different child
                // Navigate back to courses list
                console.warn('[Course Page] Course not accessible for current user, navigating back');
                CoreDomUtils.showErrorModal('This course is not accessible. You may need to select a different child or navigate to the grades list.');
                CoreNavigator.back();

                return;
            }
            throw error;
        }
        const formattedTable = await CoreGradesHelper.formatGradesTable(table);

        this.title = this.swipeManager?.getPageTitle()
            ?? formattedTable.rows[0]?.gradeitem
            ?? Translate.instant('core.grades.grades');
        this.columns = formattedTable.columns;

        // Filter and reorder rows to fix empty category totals
        this.rows = this.filterAndReorderRows(formattedTable.rows);

        this.rowsOnView = this.getRowsOnHeight();
        this.totalColumnsSpan = formattedTable.columns.reduce((total, column) => total + column.colspan, 0);

        this.logView();

        // Process data for visualizations
        if (this.rows && this.rows.length > 0) {
            this.processGradesData();
        }
    }

    /**
     * Filter and reorder rows to remove empty category totals and improve layout.
     *
     * @param rows Original rows from the formatted table.
     * @returns Filtered and reordered rows.
     */
    protected filterAndReorderRows(rows: CoreGradesFormattedTableRow[]): CoreGradesFormattedTableRow[] {
        // Find and store course total for header display
        rows.forEach(row => {
            const gradeItemName = row.gradeitem?.toLowerCase() || '';
            const gradeItemClean = CoreText.cleanTags(row.gradeitem || '').toLowerCase();

            // Check various ways the course total might appear
            const isCourseItem = row.itemtype === 'courseitem';
            const hasCourseTotal = gradeItemName.includes('course total') || gradeItemClean.includes('course total');

            if (isCourseItem || hasCourseTotal) {
                this.serverCourseTotal = row;
            }
        });

        // Return all rows without filtering - let the server decide what to show
        return rows;
    }

    /**
     * Function to get the number of rows that can be shown on the screen.
     *
     * @returns The number of rows.
     */
    protected getRowsOnHeight(): number {
        const rowHeight = 44;

        return Math.floor(window.innerHeight / rowHeight);
    }

    /**
     * Function to load more rows.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    loadMore(infiniteComplete?: () => void): void {
        this.rowsOnView += this.getRowsOnHeight();
        infiniteComplete && infiniteComplete();
    }

    /**
     * Log view.
     */
    protected async performLogView(): Promise<void> {
        await CoreUtils.ignoreErrors(CoreGrades.logCourseGradesView(this.courseId, this.userId));

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'gradereport_user_view_grade_report',
            name: this.title ?? '',
            data: { id: this.courseId, userid: this.userId, category: 'grades' },
            url: `/grade/report/user/index.php?id=${this.courseId}` +
                (this.userId !== CoreSites.getCurrentSiteUserId() ? `&userid=${this.userId}` : ''),
        });
    }
    
    /**
     * Process grades data for visualizations.
     */
    protected processGradesData(): void {
        // Initialize arrays if not already done
        if (!this.groupedCategories) {
            this.groupedCategories = [];
        }
        if (!this.timelineData) {
            this.timelineData = [];
        }

        // Group grades by category
        this.groupGradesByCategory();

        // Create timeline data
        this.createTimelineData();

        // Calculate grade distribution
        this.calculateGradeDistribution();
    }
    
    /**
     * Group grades by category using actual categories from server data.
     */
    protected groupGradesByCategory(): void {
        const categories: { [key: string]: any } = {};
        let currentCategory = 'Course';

        // Process rows in order - category rows define the current category
        this.rows.forEach((row) => {
            const gradeItemName = row.gradeitem?.toLowerCase() || '';

            // Skip leader/spacer rows
            if (row.itemtype === 'leader' || !row.gradeitem) {
                return;
            }

            // Category header - start new category
            if (row.itemtype === 'category' && !gradeItemName.includes('total')) {
                currentCategory = CoreText.cleanTags(row.gradeitem || 'Course');
                if (!categories[currentCategory]) {
                    categories[currentCategory] = {
                        name: currentCategory,
                        type: 'category',
                        items: [],
                        expanded: true,
                        totalItems: 0,
                    };
                }

                return;
            }

            // Skip category totals and course total for items list
            if (row.itemtype === 'courseitem' || row.itemtype === 'categoryitem') {
                return;
            }

            // Skip items without a grade value (- or empty means ungraded)
            if (!row.grade || row.grade === '-' || row.grade.trim() === '') {
                return;
            }

            // Ensure current category exists
            if (!categories[currentCategory]) {
                categories[currentCategory] = {
                    name: currentCategory,
                    type: 'category',
                    items: [],
                    expanded: true,
                    totalItems: 0,
                };
            }

            const item = {
                name: CoreText.cleanTags(row.gradeitem || ''),
                grade: row.grade,
                percentage: row.percentage,
                weight: row.weight,
                range: row.range,
                icon: row.icon,
                image: row.image,
                iconAlt: row.iconAlt,
                gradeDate: this.extractGradeDate(row),
                gradeIcon: row.gradeIcon,
            };

            categories[currentCategory].items.push(item);
            categories[currentCategory].totalItems++;
        });

        // Update item counts
        Object.values(categories).forEach(category => {
            category.itemCount = category.items.length;
        });

        // Filter out empty categories
        this.groupedCategories = Object.values(categories).filter(cat => cat.items.length > 0);
    }
    
    /**
     * Create timeline data from grades.
     */
    protected createTimelineData(): void {
        const timelineItems: any[] = [];

        this.rows.forEach((row, index) => {
            // Skip totals, categories, and leader items
            if (row.itemtype === 'courseitem' || row.itemtype === 'categoryitem' ||
                row.itemtype === 'category' || row.itemtype === 'leader') {
                return;
            }

            // Skip items without grades (but keep 0 grades)
            if (!row.grade || row.grade === '-' || row.grade === '') {
                return;
            }

            // Skip items without a name
            if (!row.gradeitem || row.gradeitem.trim() === '') {
                return;
            }

            // Include only graded items
            if (row.itemtype === 'mod' || row.itemtype === 'manual' || row.gradeitem) {
                // For now, create a date based on row position (newest first)
                // In real implementation, this would come from the grade data
                const daysAgo = index * 3; // Space items 3 days apart
                const gradeDate = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);

                // Format grade value
                let formattedGrade = row.grade || '-';
                if (formattedGrade !== '-') {
                    const gradeNum = parseFloat(formattedGrade);
                    if (!isNaN(gradeNum)) {
                        formattedGrade = this.formatGradeValue(gradeNum);
                    }
                }

                // Extract percentage without % sign
                let percentageValue = row.percentage;
                if (percentageValue && typeof percentageValue === 'string') {
                    const percentNum = this.extractPercentage(percentageValue);
                    percentageValue = this.formatGradeValue(percentNum) + '%';
                }

                timelineItems.push({
                    name: CoreText.cleanTags(row.gradeitem || ''),
                    grade: formattedGrade || '-',
                    percentage: percentageValue || '-',
                    icon: row.icon || 'document-outline',
                    itemtype: row.itemtype,
                    gradedDate: gradeDate,
                });
            }
        });

        // Sort by date descending
        timelineItems.sort((a, b) => b.gradedDate - a.gradedDate);

        // Group by month
        const months: { [key: string]: any } = {};
        timelineItems.forEach(item => {
            const monthKey = new Date(item.gradedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            if (!months[monthKey]) {
                months[monthKey] = {
                    name: monthKey,
                    items: [],
                };
            }
            months[monthKey].items.push(item);
        });

        this.timelineData = Object.values(months);

        // If no items, create a placeholder
        if (this.timelineData.length === 0) {
            this.timelineData = [{
                name: 'No Graded Items',
                items: [{
                    name: 'No assignments have been graded yet',
                    grade: '-',
                    percentage: '-',
                    icon: 'information-circle-outline',
                    itemtype: 'placeholder',
                    gradedDate: Date.now()
                }]
            }];
        }
    }
    
    /**
     * Calculate grade distribution for charts using school attainment scale.
     */
    protected calculateGradeDistribution(): void {
        const distribution: { [key: string]: number } = {
            'HA (95-100%)': 0,      // High attainer
            'MEP (80-94.99%)': 0,   // More than expected progress
            'EP (60-79.99%)': 0,    // Expected progress
            'LEP (50-59.99%)': 0,   // Less than expected progress
            'LA (<50%)': 0,         // Low attainer
        };

        this.rows.forEach(row => {
            // Skip totals
            const gradeItemName = row.gradeitem?.toLowerCase() || '';
            if (gradeItemName.includes('total')) {
                return;
            }

            if (row.percentage && row.grade && row.grade !== '-') {
                const percentage = this.extractPercentage(row.percentage);
                if (percentage >= 95) distribution['HA (95-100%)']++;
                else if (percentage >= 80) distribution['MEP (80-94.99%)']++;
                else if (percentage >= 60) distribution['EP (60-79.99%)']++;
                else if (percentage >= 50) distribution['LEP (50-59.99%)']++;
                else if (percentage >= 0) distribution['LA (<50%)']++;
            }
        });

        this.gradeDistributionLabels = Object.keys(distribution);
        this.gradeDistributionData = Object.values(distribution);
    }
    
    // Helper methods for template

    /**
     * Check if we have valid server course total data to display.
     */
    hasValidCourseTotal(): boolean {
        return !!(this.serverCourseTotal?.grade &&
                  this.serverCourseTotal.grade !== '-' &&
                  this.serverCourseTotal.grade.trim() !== '');
    }

    getCourseTotal(): string {
        // Only return server data - no fallback
        if (this.serverCourseTotal?.grade && this.serverCourseTotal.grade !== '-') {
            const gradeNum = parseFloat(this.serverCourseTotal.grade);
            if (!isNaN(gradeNum)) {
                return this.formatGradeValue(gradeNum);
            }
            return this.serverCourseTotal.grade;
        }
        return '-';
    }

    getCourseMaxGrade(): string {
        // Only return server data - no fallback
        if (this.serverCourseTotal?.range) {
            const maxGrade = this.extractMaxGrade(this.serverCourseTotal.range);
            const maxGradeNum = parseFloat(maxGrade);
            if (!isNaN(maxGradeNum)) {
                return maxGradeNum % 1 === 0 ? maxGradeNum.toString() : maxGradeNum.toFixed(2);
            }
            return maxGrade;
        }
        return '100';
    }

    getCoursePercentage(): string {
        // Only return server data - no fallback
        if (this.serverCourseTotal?.percentage && this.serverCourseTotal.percentage !== '-') {
            const percentNum = this.extractPercentage(this.serverCourseTotal.percentage);
            if (percentNum > 0) {
                return percentNum.toFixed(2) + '%';
            }
            return this.serverCourseTotal.percentage;
        }
        return '-';
    }

    getCoursePercentageNumber(): number {
        return this.extractPercentage(this.getCoursePercentage());
    }
    
    getCompletedItems(): number {
        return this.rows.filter(row => 
            (row.itemtype === 'mod' || row.itemtype === 'manual') && 
            row.grade && row.grade !== '-'
        ).length;
    }
    
    getTotalGradedItems(): number {
        // Since we filter out ungraded items, this returns the count of visible graded items
        // This will match getCompletedItems() since all visible items have grades
        return this.rows.filter(row =>
            (row.itemtype === 'mod' || row.itemtype === 'manual') &&
            row.grade && row.grade !== '-'
        ).length;
    }
    
    getClassRank(): number | null {
        const totalRow = this.rows.find(row => row.itemtype === 'category' && row.gradeitem?.includes('Course total'));
        return totalRow?.rank ? parseInt(totalRow.rank, 10) : null;
    }
    
    getTotalStudents(): number {
        // This would need to be fetched from the API
        return 30; // Placeholder
    }

    /**
     * Get the first word of the mentee's first name for display.
     *
     * @returns The first word of the first name.
     */
    getMenteeFirstWord(): string {
        if (!this.selectedMentee) {
            return '';
        }

        // Try to get firstname, otherwise fallback to fullname
        const name = this.selectedMentee.firstname || this.selectedMentee.fullname || '';

        // Extract the first word (split by space and take first part)
        return name.trim().split(/\s+/)[0] || '';
    }

    hasGradeDistribution(): boolean {
        return this.gradeDistributionData.length > 0;
    }

    hasPerformanceTrends(): boolean {
        // Simplified - would need historical data
        return false;
    }
    
    getGradeDistributionLegend(): any[] {
        // School attainment scale with full details
        const scaleInfo = [
            { abbrev: 'HA', description: 'High attainer', range: '95-100%', color: '#00B050', textColor: '#FFFFFF' },
            { abbrev: 'MEP', description: 'More than expected progress', range: '80-94.99%', color: '#92D050', textColor: '#1A4E00' },
            { abbrev: 'EP', description: 'Expected progress', range: '60-79.99%', color: '#FFFF00', textColor: '#5D5D00' },
            { abbrev: 'LEP', description: 'Less than expected progress', range: '50-59.99%', color: '#FFC000', textColor: '#5D3000' },
            { abbrev: 'LA', description: 'Low attainer', range: '<50%', color: '#FF0000', textColor: '#FFFFFF' },
        ];

        const totalItems = this.gradeDistributionData.reduce((sum, count) => sum + count, 0) || 1;

        return scaleInfo.map((info, index) => ({
            ...info,
            label: `${info.abbrev} (${info.range})`,
            count: this.gradeDistributionData[index] || 0,
            percentage: ((this.gradeDistributionData[index] || 0) / totalItems) * 100,
        }));
    }
    
    getImprovingCategories(): any[] {
        // Would need historical data
        return [];
    }
    
    getDecliningCategories(): any[] {
        // Would need historical data
        return [];
    }
    
    getStableCategories(): any[] {
        // Would need historical data
        return [];
    }
    
    onViewModeChange(): void {
        // View mode changed - no action needed
    }

    getGroupedGrades(): any[] {
        return this.groupedCategories;
    }

    toggleCategory(category: any): void {
        category.expanded = !category.expanded;
    }

    getTimelineMonths(): any[] {
        return this.timelineData;
    }
    
    getCategoryIcon(category: any): string {
        const iconMap: { [key: string]: string } = {
            'category': 'folder-outline',
            'assignments': 'document-text-outline',
            'quizzes': 'help-circle-outline',
            'forums': 'chatbubbles-outline',
        };
        return iconMap[category.type] || 'folder-outline';
    }
    
    getGradeClass(percentage: number): string {
        // Match school attainment scale
        if (percentage >= 95) return 'grade-ha';   // High attainer
        if (percentage >= 80) return 'grade-mep';  // More than expected progress
        if (percentage >= 60) return 'grade-ep';   // Expected progress
        if (percentage >= 50) return 'grade-lep';  // Less than expected progress
        return 'grade-la';                         // Low attainer
    }
    
    getGradeBadgeClass(item: any): string {
        const percentage = this.extractPercentage(item.percentage || '0');
        return this.getGradeClass(percentage);
    }

    getRowGradeClass(row: any): string {
        const percentage = this.extractPercentage(row.percentage || '0');
        return this.getGradeClass(percentage);
    }
    
    // Utility methods
    protected extractPercentage(percentageStr: string): number {
        const match = percentageStr.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }
    
    protected extractMaxGrade(rangeStr: string): string {
        const parts = rangeStr.split('-');
        return parts.length > 1 ? parts[1].trim() : '100';
    }
    
    protected extractGradeDate(row: any): number | null {
        // Try to extract date from various sources
        // Check if there's a timemodified field
        if (row.timemodified) {
            return row.timemodified * 1000; // Convert from seconds to milliseconds
        }
        
        // Check if there's a dategraded field
        if (row.dategraded) {
            return row.dategraded * 1000;
        }
        
        // Check if there's a timecreated field
        if (row.timecreated) {
            return row.timecreated * 1000;
        }
        
        // If no date available, return null
        return null;
    }
    
    /**
     * Format grade value to remove unnecessary decimals
     * @param value The numeric grade value
     * @returns Formatted string with up to 2 decimal places
     */
    protected formatGradeValue(value: number): string {
        // If it's a whole number, show without decimals
        if (value % 1 === 0) {
            return value.toString();
        }
        // Otherwise, show up to 2 decimal places, removing trailing zeros
        return parseFloat(value.toFixed(2)).toString();
    }
    
    protected findCategoryForItem(item: any): string {
        // Look backwards through rows to find the parent category
        const itemIndex = this.rows.indexOf(item);
        if (itemIndex === -1) return 'General';
        
        for (let i = itemIndex - 1; i >= 0; i--) {
            if (this.rows[i].itemtype === 'category') {
                return CoreText.cleanTags(this.rows[i].gradeitem || 'General');
            }
        }
        
        return 'General';
    }

}

/**
 * Swipe manager helper methods.
 */
interface CoreGradesCourseSwipeManager extends CoreSwipeNavigationItemsManager {

    /**
     * Get title to use in the current page.
     */
    getPageTitle(): string | undefined;

}

/**
 * Swipe manager for courses grades.
 */
class CoreGradesCourseCoursesSwipeManager extends CoreSwipeNavigationItemsManager<CoreGradesGradeOverviewWithCourseData>
    implements CoreGradesCourseSwipeManager {

    constructor(source: CoreGradesCoursesSource) {
        super(source);
    }

    /**
     * @inheritdoc
     */
    getPageTitle(): string | undefined {
        const selectedItem = this.getSelectedItem();

        return selectedItem?.courseFullName;
    }

}

/**
 * Swipe manager for participants grades.
 */
class CoreGradesCourseParticipantsSwipeManager extends CoreSwipeNavigationItemsManager<CoreUserParticipant | CoreUserData>
    implements CoreGradesCourseSwipeManager {

    constructor(source: CoreUserParticipantsSource) {
        super(source);
    }

    /**
     * @inheritdoc
     */
    getPageTitle(): string | undefined {
        const selectedItem = this.getSelectedItem();

        return selectedItem?.fullname;
    }

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        return CoreNavigator.getRouteParams(route).userId;
    }

}
