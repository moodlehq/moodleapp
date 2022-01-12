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
import { AfterViewInit, Component, ElementRef } from '@angular/core';
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

/**
 * Page that displays a course grades.
 */
@Component({
    selector: 'page-core-grades-course',
    templateUrl: 'course.html',
    styleUrls: ['course.scss'],
})
export class CoreGradesCoursePage implements AfterViewInit {

    courseId!: number;
    userId!: number;
    expandLabel!: string;
    collapseLabel!: string;
    columns?: CoreGradesFormattedTableColumn[];
    rows?: CoreGradesFormattedTableRow[];
    totalColumnsSpan?: number;
    withinSplitView?: boolean;

    constructor(protected route: ActivatedRoute, protected element: ElementRef<HTMLElement>) {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId', { route });
            this.userId = CoreNavigator.getRouteNumberParam('userId', { route }) ?? CoreSites.getCurrentSiteUserId();
            this.expandLabel = Translate.instant('core.expand');
            this.collapseLabel = Translate.instant('core.collapse');
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

        await this.fetchInitialGrades();
        await CoreGrades.logCourseGradesView(this.courseId, this.userId);
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
     */
    toggleRow(row: CoreGradesFormattedTableRow): void {
        if (!this.rows || !this.columns) {
            return;
        }

        row.expanded = !row.expanded;

        let colspan: number = this.columns.length + (row.colspan ?? 0) - 1;
        for (let i = this.rows.indexOf(row) - 1; i >= 0; i--) {
            const previousRow = this.rows[i];

            if (previousRow.expandable || !previousRow.colspan || !previousRow.rowspan || previousRow.colspan !== colspan) {
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
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading course');

            this.columns = [];
            this.rows = [];
        }
    }

    /**
     * Update the table of grades.
     */
    private async fetchGrades(): Promise<void> {
        const table = await CoreGrades.getCourseGradesTable(this.courseId, this.userId);
        const formattedTable = await CoreGradesHelper.formatGradesTable(table);

        this.columns = formattedTable.columns;
        this.rows = formattedTable.rows;
        this.totalColumnsSpan = formattedTable.columns.reduce((total, column) => total + column.colspan, 0);
    }

}
