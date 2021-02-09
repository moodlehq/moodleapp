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

import { ActivatedRoute, ActivatedRouteSnapshot, Params } from '@angular/router';
import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreGrades } from '@features/grades/services/grades';
import {
    CoreGradesFormattedTable,
    CoreGradesFormattedTableColumn,
    CoreGradesFormattedTableRow,
    CoreGradesFormattedTableRowFilled,
    CoreGradesHelper,
} from '@features/grades/services/grades-helper';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreObject } from '@singletons/object';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';

/**
 * Page that displays a course grades.
 */
@Component({
    selector: 'page-core-grades-course',
    templateUrl: 'course.html',
    styleUrls: ['course.scss'],
})
export class CoreGradesCoursePage implements AfterViewInit, OnDestroy {

    grades: CoreGradesCourseManager;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor(route: ActivatedRoute) {
        const courseId = parseInt(route.snapshot.params.courseId);
        const userId = parseInt(route.snapshot.queryParams.userId ?? CoreSites.instance.getCurrentSiteUserId());

        this.grades = new CoreGradesCourseManager(CoreGradesCoursePage, courseId, userId);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchInitialGrades();

        this.grades.watchSplitViewOutlet(this.splitView);
        this.grades.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.grades.destroy();
    }

    /**
     * Refresh grades.
     *
     * @param refresher Refresher.
     */
    async refreshGrades(refresher: IonRefresher): Promise<void> {
        const { courseId, userId } = this.grades;

        await CoreUtils.instance.ignoreErrors(CoreGrades.instance.invalidateCourseGradesData(courseId, userId));
        await CoreUtils.instance.ignoreErrors(this.fetchGrades());

        refresher?.complete();
    }

    /**
     * Obtain the initial table of grades.
     */
    private async fetchInitialGrades(): Promise<void> {
        try {
            await this.fetchGrades();
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading course');

            this.grades.setTable({ columns: [], rows: [] });
        }
    }

    /**
     * Update the table of grades.
     */
    private async fetchGrades(): Promise<void> {
        const table = await CoreGrades.instance.getCourseGradesTable(this.grades.courseId!, this.grades.userId);
        const formattedTable = await CoreGradesHelper.instance.formatGradesTable(table);

        this.grades.setTable(formattedTable);
    }

}

/**
 * Helper to manage the table of grades.
 */
class CoreGradesCourseManager extends CorePageItemsListManager<CoreGradesFormattedTableRowFilled> {

    courseId: number;
    userId: number;
    columns?: CoreGradesFormattedTableColumn[];
    rows?: CoreGradesFormattedTableRow[];

    constructor(pageComponent: unknown, courseId: number, userId: number) {
        super(pageComponent);

        this.courseId = courseId;
        this.userId = userId;
    }

    /**
     * Set grades table.
     *
     * @param table Grades table.
     */
    setTable(table: CoreGradesFormattedTable): void {
        this.columns = table.columns;
        this.rows = table.rows;

        this.setItems(table.rows.filter(this.isFilledRow));
    }

    /**
     * @inheritdoc
     */
    protected getDefaultItem(): CoreGradesFormattedTableRowFilled | null {
        return null;
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(row: CoreGradesFormattedTableRowFilled): string {
        return row.id.toString();
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(): Params {
        return CoreObject.withoutEmpty({ userId: this.userId });
    }

    /**
     * @inheritdoc
     */
    protected getSelectedItemPath(route: ActivatedRouteSnapshot): string | null {
        return route.params.gradeId ?? null;
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CoreGrades.instance.logCourseGradesView(this.courseId!, this.userId!);
    }

    /**
     * Check whether the given row is filled or not.
     *
     * @param row Grades table row.
     * @return Whether the given row is filled or not.
     */
    private isFilledRow(row: CoreGradesFormattedTableRow): row is CoreGradesFormattedTableRowFilled {
        return 'id' in row;
    }

}
