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
    viewMode: 'grouped' | 'timeline' | 'table' = 'grouped';
    gradeDistributionData: number[] = [];
    gradeDistributionLabels: string[] = [];
    groupedCategories: any[] = [];
    timelineData: any[] = [];

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
                case 'courses':
                    this.swipeManager = new CoreGradesCourseCoursesSwipeManager(
                        CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []),
                    );
                    break;
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
        console.log('[Grades] ngAfterViewInit started');
        this.withinSplitView = !!this.element.nativeElement.parentElement?.closest('core-split-view');

        // Check if viewing as parent/mentee
        await this.checkParentContext();

        await this.swipeManager?.start();
        await this.fetchInitialGrades();

        this.loaded = true;
        console.log('[Grades] Component loaded, viewMode:', this.viewMode);
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
     */
    private async checkParentContext(): Promise<void> {
        try {
            // Check if user is a parent
            this.isParentUser = await CoreUserParent.isParentUser();
            
            if (!this.isParentUser) {
                return;
            }
            
            // Check if a mentee is selected
            const selectedMenteeId = await CoreUserParent.getSelectedMentee();
            
            if (selectedMenteeId && this.userId === CoreSites.getCurrentSiteUserId()) {
                // Only override userId if we're viewing our own grades (not another user's)
                const canView = await CoreUserParent.canViewUserData(selectedMenteeId);
                
                if (canView) {
                    this.userId = selectedMenteeId;
                    this.viewingAsMentee = true;
                    
                    // Get mentee details for display
                    const mentees = await CoreUserParent.getMentees();
                    this.selectedMentee = mentees.find(m => m.id === selectedMenteeId);
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
        console.log('[Grades Course] fetchGrades called for course:', this.courseId, 'user:', this.userId);
        
        const table = await CoreGrades.getCourseGradesTable(this.courseId, this.userId);
        console.log('[Grades Course] Raw table data:', {
            courseid: table.courseid,
            userid: table.userid,
            userfullname: table.userfullname,
            maxdepth: table.maxdepth,
            tabledataLength: table.tabledata?.length || 0,
            firstRow: table.tabledata?.[0]
        });
        
        const formattedTable = await CoreGradesHelper.formatGradesTable(table);
        console.log('[Grades Course] Formatted table:', {
            columnsCount: formattedTable.columns.length,
            columns: formattedTable.columns.map(c => c.name),
            rowsCount: formattedTable.rows.length,
            firstRow: formattedTable.rows[0],
            itemTypes: formattedTable.rows.map(r => r.itemtype),
            rowsWithoutItemType: formattedTable.rows.filter(r => !r.itemtype).length
        });

        this.title = this.swipeManager?.getPageTitle()
            ?? formattedTable.rows[0]?.gradeitem
            ?? Translate.instant('core.grades.grades');
        this.columns = formattedTable.columns;
        
        // Filter and reorder rows to fix empty category totals
        this.rows = this.filterAndReorderRows(formattedTable.rows);
        
        this.rowsOnView = this.getRowsOnHeight();
        this.totalColumnsSpan = formattedTable.columns.reduce((total, column) => total + column.colspan, 0);
        
        console.log('[Grades Course] Final state:', {
            title: this.title,
            columnsCount: this.columns.length,
            rowsCount: this.rows.length,
            rowsOnView: this.rowsOnView,
            totalColumnsSpan: this.totalColumnsSpan
        });

        this.logView();
        
        // Process data for visualizations
        if (this.rows && this.rows.length > 0) {
            console.log('[Grades] Processing data - found', this.rows.length, 'rows');
            this.processGradesData();
        } else {
            console.log('[Grades] WARNING: No rows to process!');
        }
    }

    /**
     * Filter and reorder rows to remove empty category totals and improve layout.
     *
     * @param rows Original rows from the formatted table.
     * @returns Filtered and reordered rows.
     */
    protected filterAndReorderRows(rows: CoreGradesFormattedTableRow[]): CoreGradesFormattedTableRow[] {
        const filteredRows: CoreGradesFormattedTableRow[] = [];
        const categoryTotals: CoreGradesFormattedTableRow[] = [];
        let courseTotal: CoreGradesFormattedTableRow | null = null;
        
        // First pass: categorize rows
        rows.forEach(row => {
            const gradeItemName = row.gradeitem?.toLowerCase() || '';
            const hasGrade = row.grade && row.grade !== '-' && row.grade !== '';
            
            if (row.itemtype === 'courseitem' || gradeItemName.includes('course total')) {
                // This is the course total
                courseTotal = row;
            } else if (row.itemtype === 'categoryitem' || (row.itemtype === 'category' && gradeItemName.includes('total'))) {
                // This is a category total - only keep if it has a grade
                if (hasGrade) {
                    categoryTotals.push(row);
                }
            } else if (row.itemtype === 'category' && !gradeItemName.includes('total')) {
                // This is a category header without grade - skip it
                console.log('[Grades] Skipping empty category header:', row.gradeitem);
            } else {
                // Regular grade item
                filteredRows.push(row);
            }
        });
        
        // Second pass: build final ordered list
        const finalRows: CoreGradesFormattedTableRow[] = [];
        
        // Add all regular grade items first
        finalRows.push(...filteredRows);
        
        // Add category totals that have grades
        if (categoryTotals.length > 0) {
            // Add a separator
            finalRows.push({
                itemtype: 'leader',
                gradeitem: '',
                grade: '',
                rowclass: 'leader',
                id: -1,
                colspan: 1,
                rowspan: 1
            } as CoreGradesFormattedTableRow);
            
            // Add category totals
            finalRows.push(...categoryTotals);
        }
        
        // Add course total at the end if it exists
        if (courseTotal) {
            // Add a separator
            finalRows.push({
                itemtype: 'leader',
                gradeitem: '',
                grade: '',
                rowclass: 'leader',
                id: -2,
                colspan: 1,
                rowspan: 1
            } as CoreGradesFormattedTableRow);
            
            finalRows.push(courseTotal);
        }
        
        console.log('[Grades] Filtered rows:', {
            original: rows.length,
            filtered: finalRows.length,
            regularItems: filteredRows.length,
            categoryTotals: categoryTotals.length,
            courseTotal: courseTotal ? 1 : 0
        });
        
        return finalRows;
    }

    /**
     * Function to get the number of rows that can be shown on the screen.
     *
     * @returns The number of rows.
     */
    protected getRowsOnHeight(): number {
        const rowHeight = 44;
        const result = Math.floor(window.innerHeight / rowHeight);
        console.log('[Grades Course] getRowsOnHeight:', {
            windowHeight: window.innerHeight,
            rowHeight: rowHeight,
            calculatedRows: result
        });
        return result;
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
        console.log('[Grades] Processing grades data for visualizations');
        console.log('[Grades] Total rows:', this.rows.length);
        console.log('[Grades] First 5 rows full data:', this.rows.slice(0, 5).map(r => ({
            ...r,
            gradeitem: r.gradeitem?.substring(0, 50) // Truncate for logging
        })));
        console.log('[Grades] Row types:', this.rows.map(r => ({ 
            itemtype: r.itemtype, 
            gradeitem: r.gradeitem?.substring(0, 50), 
            grade: r.grade,
            percentage: r.percentage,
            range: r.range
        })));
        
        // Group grades by category
        this.groupGradesByCategory();
        
        // Create timeline data
        this.createTimelineData();
        
        // Calculate grade distribution
        this.calculateGradeDistribution();
        
        console.log('[Grades] Grouped categories:', this.groupedCategories);
        console.log('[Grades] Timeline data:', this.timelineData);
        console.log('[Grades] Distribution data:', {
            labels: this.gradeDistributionLabels,
            data: this.gradeDistributionData
        });
    }
    
    /**
     * Group grades by category.
     */
    protected groupGradesByCategory(): void {
        const categories: { [key: string]: any } = {};
        
        console.log('[Grades] Starting category grouping...');
        
        // First, create a default category for all items
        categories['Course Items'] = {
            name: 'Course Items',
            type: 'category',
            items: [],
            weight: 100,
            grade: '-',
            maxGrade: '100',
            percentage: 0,
            expanded: true,
            totalItems: 0,
            completedItems: 0,
            completionPercentage: 0,
        };
        
        this.rows.forEach((row, index) => {
            console.log(`[Grades] Processing row ${index}:`, {
                itemtype: row.itemtype,
                gradeitem: row.gradeitem?.substring(0, 50),
                grade: row.grade,
                weight: row.weight,
                percentage: row.percentage,
                range: row.range
            });
            
            const gradeItemName = row.gradeitem?.toLowerCase() || '';
            
            // Skip totals in the item list
            if (gradeItemName.includes('total')) {
                return;
            }
            
            // This is a grade item - add it to our default category
            const item = {
                name: CoreText.cleanTags(row.gradeitem || ''),
                grade: row.grade || '-',
                percentage: row.percentage,
                weight: row.weight,
                icon: row.icon,
                image: row.image,
                iconAlt: row.iconAlt,
                gradeDate: this.extractGradeDate(row),
                gradeIcon: row.gradeIcon,
            };
            
            categories['Course Items'].items.push(item);
            categories['Course Items'].totalItems++;
            if (row.grade && row.grade !== '-' && row.grade !== '0') {
                categories['Course Items'].completedItems++;
            }
        });
        
        // Calculate completion percentages
        Object.values(categories).forEach(category => {
            category.completionPercentage = category.totalItems > 0 
                ? Math.round((category.completedItems / category.totalItems) * 100) 
                : 0;
            category.itemCount = category.items.length;
        });
        
        this.groupedCategories = Object.values(categories);
    }
    
    /**
     * Create timeline data from grades.
     */
    protected createTimelineData(): void {
        const timelineItems: any[] = [];
        
        this.rows.forEach(row => {
            if ((row.itemtype === 'mod' || row.itemtype === 'manual') && row.grade && row.grade !== '-') {
                const gradeDate = this.extractGradeDate(row);
                if (gradeDate) {
                    timelineItems.push({
                        name: CoreText.cleanTags(row.gradeitem || ''),
                        grade: row.grade,
                        percentage: row.percentage,
                        icon: row.icon,
                        itemtype: row.itemtype,
                        gradedDate: gradeDate,
                    });
                }
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
    }
    
    /**
     * Calculate grade distribution for charts.
     */
    protected calculateGradeDistribution(): void {
        const distribution: { [key: string]: number } = {
            'A (90-100%)': 0,
            'B (80-89%)': 0,
            'C (70-79%)': 0,
            'D (60-69%)': 0,
            'F (0-59%)': 0,
        };
        
        this.rows.forEach(row => {
            // Skip totals
            const gradeItemName = row.gradeitem?.toLowerCase() || '';
            if (gradeItemName.includes('total')) {
                return;
            }
            
            if (row.percentage && row.grade && row.grade !== '-') {
                const percentage = this.extractPercentage(row.percentage);
                if (percentage >= 90) distribution['A (90-100%)']++;
                else if (percentage >= 80) distribution['B (80-89%)']++;
                else if (percentage >= 70) distribution['C (70-79%)']++;
                else if (percentage >= 60) distribution['D (60-69%)']++;
                else if (percentage > 0) distribution['F (0-59%)']++;
            }
        });
        
        this.gradeDistributionLabels = Object.keys(distribution);
        this.gradeDistributionData = Object.values(distribution);
    }
    
    // Helper methods for template
    getCourseTotal(): string {
        console.log('[Grades] Looking for course total...');
        console.log('[Grades] Category/total rows:', this.rows.filter(row => 
            row.itemtype === 'category' || row.itemtype === 'categoryitem' || row.itemtype === 'courseitem'
        ).map(row => ({
            itemtype: row.itemtype,
            gradeitem: row.gradeitem,
            grade: row.grade
        })));
        const totalRow = this.rows.find(row => {
            // Look for course total by itemtype or content
            return row.itemtype === 'courseitem' || 
                   (row.gradeitem?.toLowerCase().includes('course total'));
        });
        console.log('[Grades] Course total row:', totalRow);
        
        // If the total is not calculated (shows '-'), calculate it from graded items
        if (totalRow && (totalRow.grade === '-' || !totalRow.grade)) {
            const gradedSum = this.calculateGradedItemsSum();
            console.log('[Grades] Calculated sum from graded items:', gradedSum);
            return gradedSum.toFixed(2);
        }
        
        return totalRow?.grade || '0';
    }
    
    getCourseMaxGrade(): string {
        const totalRow = this.rows.find(row => {
            return row.itemtype === 'courseitem' || 
                   (row.gradeitem?.toLowerCase().includes('course total'));
        });
        const maxGrade = this.extractMaxGrade(totalRow?.range || '0-100');
        console.log('[Grades] Course max grade:', maxGrade, 'from range:', totalRow?.range);
        return maxGrade;
    }
    
    getCoursePercentage(): string {
        const totalRow = this.rows.find(row => {
            return row.itemtype === 'courseitem' || 
                   (row.gradeitem?.toLowerCase().includes('course total'));
        });
        console.log('[Grades] Course percentage:', totalRow?.percentage);
        
        // If percentage is not calculated, calculate it
        if (totalRow && (totalRow.percentage === '0%' || totalRow.percentage === '-' || !totalRow.percentage)) {
            const total = parseFloat(this.getCourseTotal());
            const maxGrade = parseFloat(this.getCourseMaxGrade());
            if (maxGrade > 0) {
                const calculatedPercentage = (total / maxGrade) * 100;
                return calculatedPercentage.toFixed(2) + '%';
            }
        }
        
        // Return the percentage value, which already includes the % sign
        return totalRow?.percentage || '0%';
    }
    
    getCoursePercentageNumber(): number {
        const percentage = this.extractPercentage(this.getCoursePercentage());
        console.log('[Grades] Course percentage number:', percentage);
        return percentage;
    }
    
    /**
     * Calculate the sum of all graded items (excluding totals).
     */
    protected calculateGradedItemsSum(): number {
        let sum = 0;
        this.rows.forEach(row => {
            const gradeItemName = row.gradeitem?.toLowerCase() || '';
            // Skip totals and non-graded items
            if (gradeItemName.includes('total') || !row.grade || row.grade === '-') {
                return;
            }
            
            // Parse the grade value
            const gradeValue = parseFloat(row.grade);
            if (!isNaN(gradeValue)) {
                sum += gradeValue;
                console.log('[Grades] Adding grade:', row.gradeitem, '=', gradeValue, 'Total so far:', sum);
            }
        });
        return sum;
    }
    
    getCompletedItems(): number {
        return this.rows.filter(row => 
            (row.itemtype === 'mod' || row.itemtype === 'manual') && 
            row.grade && row.grade !== '-'
        ).length;
    }
    
    getTotalGradedItems(): number {
        return this.rows.filter(row => 
            row.itemtype === 'mod' || row.itemtype === 'manual'
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
    
    hasGradeDistribution(): boolean {
        const hasData = this.gradeDistributionData.length > 0;
        console.log('[Grades] hasGradeDistribution:', hasData, 'data:', this.gradeDistributionData);
        return hasData;
    }
    
    hasPerformanceTrends(): boolean {
        // Simplified - would need historical data
        console.log('[Grades] hasPerformanceTrends: false (no historical data)');
        return false;
    }
    
    getGradeDistributionLegend(): any[] {
        const colors = ['#ADEBB3', '#B3EBF2', '#FFFD96', '#FFDAC1', '#FFB5A7'];
        return this.gradeDistributionLabels.map((label, index) => ({
            label,
            count: this.gradeDistributionData[index],
            color: colors[index],
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
        // View mode changed
        console.log('[Grades] View mode changed to:', this.viewMode);
    }
    
    getGroupedGrades(): any[] {
        console.log('[Grades] getGroupedGrades called, returning:', this.groupedCategories);
        return this.groupedCategories;
    }
    
    toggleCategory(category: any): void {
        console.log('[Grades] Toggling category:', category.name, 'from', category.expanded, 'to', !category.expanded);
        category.expanded = !category.expanded;
    }
    
    getTimelineMonths(): any[] {
        console.log('[Grades] getTimelineMonths called, returning:', this.timelineData);
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
        if (percentage >= 90) return 'grade-a';
        if (percentage >= 80) return 'grade-b';
        if (percentage >= 70) return 'grade-c';
        if (percentage >= 60) return 'grade-d';
        return 'grade-f';
    }
    
    getGradeBadgeClass(item: any): string {
        const percentage = this.extractPercentage(item.percentage || '0');
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
        // Would need to be in the actual data
        // For now, generate random dates for demo
        return Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000;
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
