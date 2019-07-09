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

import { Component, OnInit } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModLessonProvider } from '../../providers/lesson';
import { AddonModLessonHelperProvider } from '../../providers/helper';

/**
 * Page that displays a retake made by a certain user.
 */
@IonicPage({ segment: 'addon-mod-lesson-user-retake' })
@Component({
    selector: 'page-addon-mod-lesson-user-retake',
    templateUrl: 'user-retake.html',
})
export class AddonModLessonUserRetakePage implements OnInit {

    component = AddonModLessonProvider.COMPONENT;
    lesson: any; // The lesson the retake belongs to.
    courseId: number; // Course ID the lesson belongs to.
    selectedRetake: number; // The retake to see.
    student: any; // Data about the student and his retakes.
    retake: any; // Data about the retake.
    loaded: boolean; // Whether the data has been loaded.

    protected lessonId: number; // The lesson ID the retake belongs to.
    protected userId: number; // User ID to see the retakes.
    protected retakeNumber: number; // Number of the initial retake to see.
    protected previousSelectedRetake: number; // To be able to detect the previous selected retake when it has changed.

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, protected textUtils: CoreTextUtilsProvider,
            protected translate: TranslateService, protected domUtils: CoreDomUtilsProvider,
            protected userProvider: CoreUserProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected lessonProvider: AddonModLessonProvider, protected lessonHelper: AddonModLessonHelperProvider,
            protected utils: CoreUtilsProvider) {

        this.lessonId = navParams.get('lessonId');
        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSiteUserId();
        this.retakeNumber = navParams.get('retake');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Fetch the data.
        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Change the retake displayed.
     *
     * @param {number} retakeNumber The new retake number.
     */
    changeRetake(retakeNumber: number): void {
        this.loaded = false;

        this.setRetake(retakeNumber).catch((error) => {
            this.selectedRetake = this.previousSelectedRetake;
            this.domUtils.showErrorModal(this.utils.addDataNotDownloadedError(error, 'Error getting attempt.'));
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    doRefresh(refresher: any): void {
        this.refreshData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Get lesson and retake data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        return this.lessonProvider.getLessonById(this.courseId, this.lessonId).then((lessonData) => {
            this.lesson = lessonData;

            // Get the retakes overview for all participants.
            return this.lessonProvider.getRetakesOverview(this.lesson.id);
        }).then((data) => {
            // Search the student.
            let student;

            if (data && data.students) {
                for (let i = 0; i < data.students.length; i++) {
                    if (data.students[i].id == this.userId) {
                        student = data.students[i];
                        break;
                    }
                }
            }

            if (!student) {
                // Student not found.
                return Promise.reject(this.translate.instant('addon.mod_lesson.cannotfinduser'));
            }

            if (!student.attempts || !student.attempts.length) {
                // No retakes.
                return Promise.reject(this.translate.instant('addon.mod_lesson.cannotfindattempt'));
            }

            student.bestgrade = this.textUtils.roundToDecimals(student.bestgrade, 2);
            student.attempts.forEach((retake) => {
                if (!this.selectedRetake && this.retakeNumber == retake.try) {
                    // The retake specified as parameter exists. Use it.
                    this.selectedRetake = this.retakeNumber;
                }

                retake.label = this.lessonHelper.getRetakeLabel(retake);
            });

            if (!this.selectedRetake) {
                // Retake number not specified or not valid, use the last retake.
                this.selectedRetake = student.attempts[student.attempts.length - 1].try;
            }

            // Get the profile image of the user.
           return this.userProvider.getProfile(student.id, this.courseId, true).then((user) => {
                student.profileimageurl = user.profileimageurl;

                return student;
            }).catch(() => {
                // Error getting profile, resolve promise without adding any extra data.
                return student;
            });
        }).then((student) => {
            this.student = student;

            return this.setRetake(this.selectedRetake);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting data.', true);
        });
    }

    /**
     * Refreshes data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected refreshData(): Promise<any> {
        const promises = [];

        promises.push(this.lessonProvider.invalidateLessonData(this.courseId));
        if (this.lesson) {
            promises.push(this.lessonProvider.invalidateRetakesOverview(this.lesson.id));
            promises.push(this.lessonProvider.invalidateUserRetakesForUser(this.lesson.id, this.userId));
        }

        return Promise.all(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchData();
        });
    }

    /**
     * Set the retake to view and load its data.
     *
     * @param {number}retakeNumber Retake number to set.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected setRetake(retakeNumber: number): Promise<any> {
        this.selectedRetake = retakeNumber;

        return this.lessonProvider.getUserRetake(this.lessonId, retakeNumber, this.userId).then((data) => {

            if (data && data.completed != -1) {
                // Completed.
                data.userstats.grade = this.textUtils.roundToDecimals(data.userstats.grade, 2);
                data.userstats.timetakenReadable = this.timeUtils.formatTime(data.userstats.timetotake);
            }

            if (data && data.answerpages) {
                // Format pages data.
                data.answerpages.forEach((page) => {
                    if (this.lessonProvider.answerPageIsContent(page)) {
                        page.isContent = true;

                        if (page.answerdata && page.answerdata.answers) {
                            page.answerdata.answers.forEach((answer) => {
                                // Content pages only have 1 valid field in the answer array.
                                answer[0] = this.lessonHelper.getContentPageAnswerDataFromHtml(answer[0]);
                            });
                        }
                    } else if (this.lessonProvider.answerPageIsQuestion(page)) {
                        page.isQuestion = true;

                        if (page.answerdata && page.answerdata.answers) {
                            page.answerdata.answers.forEach((answer) => {
                                // Only the first field of the answer array requires to be parsed.
                                answer[0] = this.lessonHelper.getQuestionPageAnswerDataFromHtml(answer[0]);
                            });
                        }
                    }
                });
            }

            this.retake = data;
            this.previousSelectedRetake = this.selectedRetake;
        });
    }
}
