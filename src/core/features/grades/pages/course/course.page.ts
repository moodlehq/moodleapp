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

import { ActivatedRoute } from '@angular/router';
import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreGrades } from '@features/grades/services/grades';
import {
    CoreGradesFormattedTableColumn,
    CoreGradesFormattedTableRow,
    CoreGradesHelper,
} from '@features/grades/services/grades-helper';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { Translate } from '@singletons';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreGradesCoursesSource } from '@features/grades/classes/grades-courses-source';
import { CoreDom } from '@singletons/dom';

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
    courses?: CoreSwipeNavigationItemsManager;
    columns: CoreGradesFormattedTableColumn[] = [];
    rows: CoreGradesFormattedTableRow[] = [];
    rowsOnView = 0;
    totalColumnsSpan?: number;
    withinSplitView?: boolean;

    protected useLegacyLayout?: boolean; // Whether to use the layout before 4.1.
    protected fetchSuccess = false;

    constructor(
        protected route: ActivatedRoute,
        protected element: ElementRef<HTMLElement>,
    ) {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId', { route });
            this.userId = CoreNavigator.getRouteNumberParam('userId', { route }) ?? CoreSites.getCurrentSiteUserId();
            this.gradeId = CoreNavigator.getRouteNumberParam('gradeId', { route });

            this.expandLabel = Translate.instant('core.expand');
            this.collapseLabel = Translate.instant('core.collapse');
            this.useLegacyLayout = !CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('4.1');

            if (route.snapshot.data.swipeEnabled ?? true) {
                const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreGradesCoursesSource, []);

                this.courses = new CoreSwipeNavigationItemsManager(source);
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

        await this.courses?.start();
        await this.fetchInitialGrades();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.courses?.destroy();
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
    async refreshGrades(refresher: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(CoreGrades.invalidateCourseGradesData(this.courseId, this.userId));
        await CoreUtils.ignoreErrors(this.fetchGrades());

        refresher?.complete();
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
        const table = await CoreGrades.getCourseGradesTable(this.courseId, this.userId);
        const formattedTable = CoreGradesHelper.formatGradesTable(table);

        this.title = formattedTable.rows[0]?.gradeitem ?? Translate.instant('core.grades.grades');
        this.columns = formattedTable.columns;
        this.rows = formattedTable.rows;
        this.rowsOnView = this.getRowsOnHeight();
        this.totalColumnsSpan = formattedTable.columns.reduce((total, column) => total + column.colspan, 0);

        if (!this.fetchSuccess) {
            this.fetchSuccess = true;
            await CoreGrades.logCourseGradesView(this.courseId, this.userId);
        }
    }

    /**
     * Function to get the number of rows that can be shown on the screen.
     *
     * @returns The number of rows.
     */
    protected getRowsOnHeight(): number {
        return Math.floor(window.innerHeight / 44);
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

}
