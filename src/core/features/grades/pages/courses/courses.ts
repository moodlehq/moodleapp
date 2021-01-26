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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesHelper, CoreGradesGradeOverviewWithCourseData } from '@features/grades/services/grades-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreUtils } from '@services/utils/utils';
import { ActivatedRoute } from '@angular/router';

/**
 * Page that displays courses grades (main menu option).
 */
@Component({
    selector: 'page-core-grades-courses',
    templateUrl: 'courses.html',
})
export class CoreGradesCoursesPage implements OnInit, OnDestroy {

    grades?: CoreGradesGradeOverviewWithCourseData[];
    gradesLoaded = false;
    activeCourseId?: number;
    layoutSubscription?: Subscription;

    constructor(private route: ActivatedRoute) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.layoutSubscription = CoreScreen.instance.layoutObservable.subscribe(() => this.updateActiveCourse());
        this.updateActiveCourse();

        await this.fetchGrades();

        if (!CoreScreen.instance.isMobile && !this.activeCourseId && this.grades && this.grades.length > 0) {
            this.openCourse(this.grades[0].courseid);
        }

        // Add log in Moodle.
        await CoreUtils.instance.ignoreErrors(CoreGrades.instance.logCoursesGradesView());
    }

    /**
     * @inheritdoc
     */
    ionViewWillEnter(): void {
        this.updateActiveCourse();
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
    async fetchGrades(): Promise<void> {
        try {
            const grades = await CoreGrades.instance.getCoursesGrades();
            const gradesWithCourseData = await CoreGradesHelper.instance.getGradesCourseData(grades);

            this.grades = gradesWithCourseData;
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading grades');

            this.grades = [];
        } finally {
            this.gradesLoaded = true;
        }
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    async refreshGrades(refresher: IonRefresher): Promise<void> {
        await CoreUtils.instance.ignoreErrors(CoreGrades.instance.invalidateCoursesGradesData());
        await CoreUtils.instance.ignoreErrors(this.fetchGrades());

        refresher.complete();
    }

    /**
     * Navigate to the grades of the selected course.
     *
     * @param courseId Course Id where to navigate.
     */
    async openCourse(courseId: number): Promise<void> {
        const path = this.activeCourseId ? `../${courseId}` : courseId.toString();

        await CoreNavigator.instance.navigate(path);

        this.updateActiveCourse(courseId);
    }

    /**
     * Update active course.
     *
     * @param activeCourseId Active course id.
     */
    private updateActiveCourse(activeCourseId?: number): void {
        if (CoreScreen.instance.isMobile) {
            delete this.activeCourseId;

            return;
        }

        this.activeCourseId = activeCourseId ?? this.guessActiveCourse();
    }

    /**
     * Guess active course looking at the current route.
     *
     * @return Active course id.
     */
    private guessActiveCourse(): number | undefined {
        const courseId = parseInt(this.route.snapshot?.firstChild?.params.courseId);

        return isNaN(courseId) ? undefined : courseId;
    }

}
