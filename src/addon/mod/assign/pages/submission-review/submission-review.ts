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

import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModAssignProvider } from '../../providers/assign';
import { AddonModAssignSubmissionComponent } from '../../components/submission/submission';

/**
 * Page that displays a submission.
 */
@IonicPage({ segment: 'addon-mod-assign-submission-review' })
@Component({
    selector: 'page-addon-mod-assign-submission-review',
    templateUrl: 'submission-review.html',
})
export class AddonModAssignSubmissionReviewPage implements OnInit {
    @ViewChild(AddonModAssignSubmissionComponent) submissionComponent: AddonModAssignSubmissionComponent;

    title: string; // Title to display.
    moduleId: number; // Module ID the submission belongs to.
    courseId: number; // Course ID the assignment belongs to.
    submitId: number; //  User that did the submission.
    blindId: number; // Blinded user ID (if it's blinded).
    showGrade: boolean; // Whether to display the grade at start.
    loaded: boolean; // Whether data has been loaded.
    canSaveGrades: boolean; // Whether the user can save grades.

    protected assign: any; // The assignment the submission belongs to.
    protected blindMarking: boolean; // Whether it uses blind marking.
    protected forceLeave = false; // To allow leaving the page without checking for changes.

    constructor(navParams: NavParams, protected navCtrl: NavController, protected courseProvider: CoreCourseProvider,
            protected appProvider: CoreAppProvider, protected assignProvider: AddonModAssignProvider,
            protected domUtils: CoreDomUtilsProvider) {

        this.moduleId = navParams.get('moduleId');
        this.courseId = navParams.get('courseId');
        this.submitId = navParams.get('submitId');
        this.blindId = navParams.get('blindId');
        this.showGrade = !!navParams.get('showGrade');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchSubmission().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (!this.submissionComponent || this.forceLeave) {
            return true;
        }

        // Check if data has changed.
        return this.submissionComponent.canLeave();
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.submissionComponent && this.submissionComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.submissionComponent && this.submissionComponent.ionViewDidLeave();
    }

    /**
     * Get the submission.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchSubmission(): Promise<any> {
        return this.assignProvider.getAssignment(this.courseId, this.moduleId).then((assignment) => {
            this.assign = assignment;
            this.title = this.assign.name;

            this.blindMarking = this.assign.blindmarking && !this.assign.revealidentities;

            return this.courseProvider.getModuleBasicGradeInfo(this.moduleId).then((gradeInfo) => {
                if (gradeInfo) {
                    // Grades can be saved if simple grading.
                    if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] &&
                            typeof gradeInfo.advancedgrading[0].method != 'undefined') {

                        const method = gradeInfo.advancedgrading[0].method || 'simple';
                        this.canSaveGrades = method == 'simple';
                    } else {
                        this.canSaveGrades = true;
                    }
                }
            });
        });
    }

    /**
     * Refresh all the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected refreshAllData(): Promise<any> {
        const promises = [];

        promises.push(this.assignProvider.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(this.assignProvider.invalidateSubmissionData(this.assign.id));
            promises.push(this.assignProvider.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(this.assignProvider.invalidateSubmissionStatusData(this.assign.id, this.submitId, undefined,
                this.blindMarking));
        }

        return Promise.all(promises).finally(() => {
            this.submissionComponent && this.submissionComponent.invalidateAndRefresh();

            return this.fetchSubmission();
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshSubmission(refresher: any): void {
        this.refreshAllData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Submit a grade and feedback.
     */
    submitGrade(): void {
        if (this.submissionComponent) {
            this.submissionComponent.submitGrade().then(() => {
                // Grade submitted, leave the view if not in tablet.
                if (!this.appProvider.isWide()) {
                    this.forceLeave = true;
                    this.navCtrl.pop();
                }
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.error', true);
            });
        }
    }
}
