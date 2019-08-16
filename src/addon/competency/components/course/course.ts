// (C) Copyright 2015 Martin Dougiamas
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

import { Component, ViewChild, Input } from '@angular/core';
import { Content, NavController } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonCompetencyProvider } from '../../providers/competency';
import { AddonCompetencyHelperProvider } from '../../providers/helper';

/**
 * Component that displays the competencies of a course.
 */
@Component({
    selector: 'addon-competency-course',
    templateUrl: 'addon-competency-course.html',
})
export class AddonCompetencyCourseComponent {
    @ViewChild(Content) content: Content;

    @Input() courseId: number;
    @Input() userId: number;

    competenciesLoaded = false;
    competencies: any;
    user: any;

    constructor(private navCtrl: NavController, private appProvider: CoreAppProvider, private domUtils: CoreDomUtilsProvider,
            private competencyProvider: AddonCompetencyProvider, private helperProvider: AddonCompetencyHelperProvider) {
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.fetchCourseCompetencies().finally(() => {
            this.competenciesLoaded = true;
        });
    }

    /**
     * Fetches the competencies and updates the view.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected fetchCourseCompetencies(): Promise<void> {
        return this.competencyProvider.getCourseCompetencies(this.courseId, this.userId).then((competencies) => {
            this.competencies = competencies;

            // Get the user profile image.
            this.helperProvider.getProfile(this.userId).then((user) => {
                this.user = user;
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting course competencies data.');
        });
    }

    /**
     * Opens a competency.
     *
     * @param {number} competencyId
     */
    openCompetency(competencyId: number): void {
        if (this.appProvider.isWide()) {
            this.navCtrl.push('AddonCompetencyCompetenciesPage', {competencyId, courseId: this.courseId, userId: this.userId});
        } else {
            this.navCtrl.push('AddonCompetencyCompetencyPage', {competencyId, courseId: this.courseId, userId: this.userId});
        }
    }

    /**
     * Opens the summary of a competency.
     *
     * @param {number} competencyId
     */
    openCompetencySummary(competencyId: number): void {
        this.navCtrl.push('AddonCompetencyCompetencySummaryPage', {competencyId});
    }

    /**
     * Refreshes the competencies.
     *
     * @param {any} refresher Refresher.
     */
    refreshCourseCompetencies(refresher: any): void {
        this.competencyProvider.invalidateCourseCompetencies(this.courseId, this.userId).finally(() => {
            this.fetchCourseCompetencies().finally(() => {
                refresher.complete();
            });
        });
    }
}
