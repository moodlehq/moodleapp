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
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesFormattedTable, CoreGradesHelper } from '@features/grades/services/grades-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreScreen } from '@services/screen';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreObject } from '@singletons/object';

/**
 * Page that displays a course grades.
 */
@Component({
    selector: 'page-core-grades-course',
    templateUrl: 'course.html',
    styleUrls: ['course.scss'],
})
export class CoreGradesCoursePage implements OnInit, OnDestroy {

    courseId: number;
    userId: number;
    gradesTable?: CoreGradesFormattedTable;
    gradesTableLoaded = false;
    activeGradeId?: number;
    layoutSubscription?: Subscription;

    @ViewChild(CoreSplitViewComponent) splitView?: CoreSplitViewComponent;

    constructor(private route: ActivatedRoute) {
        this.courseId = route.snapshot.params.courseId;
        this.userId = route.snapshot.queryParams.userId ?? CoreSites.instance.getCurrentSiteUserId();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.layoutSubscription = CoreScreen.instance.layoutObservable.subscribe(() => this.updateActiveGrade());

        await this.fetchGradesTable();

        // Add log in Moodle.
        await CoreUtils.instance.ignoreErrors(CoreGrades.instance.logCourseGradesView(this.courseId, this.userId));
    }

    /**
     * @inheritdoc
     */
    ionViewWillEnter(): void {
        this.updateActiveGrade();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.layoutSubscription?.unsubscribe();
    }

    /**
     * Fetch all the data required for the view.
     */
    async fetchGradesTable(): Promise<void> {
        try {
            const table = await CoreGrades.instance.getCourseGradesTable(this.courseId, this.userId);

            this.gradesTable = CoreGradesHelper.instance.formatGradesTable(table);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading grades');

            this.gradesTable = { rows: [], columns: [] };
        } finally {
            this.gradesTableLoaded = true;
        }
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    async refreshGradesTable(refresher: IonRefresher): Promise<void> {
        await CoreUtils.instance.ignoreErrors(CoreGrades.instance.invalidateCourseGradesData(this.courseId, this.userId));
        await CoreUtils.instance.ignoreErrors(this.fetchGradesTable());

        refresher.complete();
    }

    /**
     * Navigate to the grade of the selected item.
     *
     * @param gradeId Grade item ID where to navigate.
     */
    async gotoGrade(gradeId: number): Promise<void> {
        const path = this.activeGradeId ? `../${gradeId}` : gradeId.toString();

        await CoreNavigator.instance.navigate(path, {
            params: CoreObject.withoutEmpty({ userId: this.userId }),
        });

        this.updateActiveGrade(gradeId);
    }

    /**
     * Update active grade.
     *
     * @param activeGradeId Active grade id.
     */
    private updateActiveGrade(activeGradeId?: number): void {
        if (CoreScreen.instance.isMobile || this.splitView?.isNested) {
            delete this.activeGradeId;

            return;
        }

        this.activeGradeId = activeGradeId ?? this.guessActiveGrade();
    }

    /**
     * Guess active grade looking at the current route.
     *
     * @return Active grade id.
     */
    private guessActiveGrade(): number | undefined {
        const gradeId = parseInt(this.route.snapshot?.firstChild?.params.gradeId);

        return isNaN(gradeId) ? undefined : gradeId;
    }

}
