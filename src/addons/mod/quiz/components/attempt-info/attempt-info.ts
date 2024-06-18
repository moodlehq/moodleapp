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

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AddonModQuizAttempt, AddonModQuizQuizData } from '../../services/quiz-helper';
import { AddonModQuiz, AddonModQuizWSAdditionalData } from '../../services/quiz';
import { ADDON_MOD_QUIZ_COMPONENT, AddonModQuizAttemptStates } from '../../constants';
import { CoreTime } from '@singletons/time';
import { Translate } from '@singletons';
import { CoreDomUtils } from '@services/utils/dom';
import { isSafeNumber } from '@/core/utils/types';

/**
 * Component that displays an attempt info.
 */
@Component({
    selector: 'addon-mod-quiz-attempt-info',
    templateUrl: 'attempt-info.html',
})
export class AddonModQuizAttemptInfoComponent implements OnChanges {

    @Input({ required: true }) quiz!: AddonModQuizQuizData;
    @Input({ required: true }) attempt!: AddonModQuizAttempt;
    @Input() additionalData?: AddonModQuizWSAdditionalData[]; // Additional data to display for the attempt.

    isFinished = false;
    readableMark = '';
    readableGrade = '';
    timeTaken?: string;
    overTime?: string;
    gradeItemMarks: { name: string; grade: string }[] = [];
    component = ADDON_MOD_QUIZ_COMPONENT;

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes.additionalData) {
            this.additionalData?.forEach((data) => {
                // Remove help links from additional data.
                data.content = CoreDomUtils.removeElementFromHtml(data.content, '.helptooltip, [data-toggle="popover"]');
            });
        }

        if (!changes.attempt) {
            return;
        }

        this.isFinished = this.attempt.state === AddonModQuizAttemptStates.FINISHED;
        if (!this.isFinished) {
            return;
        }

        const timeTaken = (this.attempt.timefinish || 0) - (this.attempt.timestart || 0);
        if (timeTaken > 0) {
            // Format time taken.
            this.timeTaken = CoreTime.formatTime(timeTaken);

            // Calculate overdue time.
            if (this.quiz.timelimit && timeTaken > this.quiz.timelimit + 60) {
                this.overTime = CoreTime.formatTime(timeTaken - this.quiz.timelimit);
            }
        } else {
            this.timeTaken = undefined;
        }

        // Treat grade item marks.
        if (this.attempt.sumgrades === null || !this.attempt.gradeitemmarks) {
            this.gradeItemMarks = [];
        } else {
            this.gradeItemMarks = this.attempt.gradeitemmarks.map((gradeItemMark) => ({
                name: gradeItemMark.name,
                grade: Translate.instant('addon.mod_quiz.outof', { $a: {
                    grade: '<strong>' + AddonModQuiz.formatGrade(gradeItemMark.grade, this.quiz?.decimalpoints) + '</strong>',
                    maxgrade: AddonModQuiz.formatGrade(gradeItemMark.maxgrade, this.quiz?.decimalpoints),
                } }),
            }));
        }

        if (!this.quiz.showAttemptsGrades) {
            return;
        }

        // Treat grade and mark.
        if (!isSafeNumber(this.attempt.rescaledGrade)) {
            this.readableGrade = Translate.instant('addon.mod_quiz.notyetgraded');

            return;
        }

        if (this.quiz.showAttemptsMarks) {
            this.readableMark = Translate.instant('addon.mod_quiz.outofshort', { $a: {
                grade: AddonModQuiz.formatGrade(this.attempt.sumgrades, this.quiz.decimalpoints),
                maxgrade: AddonModQuiz.formatGrade(this.quiz.sumgrades, this.quiz.decimalpoints),
            } });
        }

        const gradeObject: Record<string, unknown> = {
            grade: '<strong>' + AddonModQuiz.formatGrade(this.attempt.rescaledGrade, this.quiz.decimalpoints) + '</strong>',
            maxgrade: AddonModQuiz.formatGrade(this.quiz.grade, this.quiz.decimalpoints),
        };

        if (this.quiz.grade != 100) {
            const percentage = (this.attempt.sumgrades ?? 0) * 100 / (this.quiz.sumgrades ?? 1);
            gradeObject.percent = '<strong>' + AddonModQuiz.formatGrade(percentage, this.quiz.decimalpoints) + '</strong>';
            this.readableGrade = Translate.instant('addon.mod_quiz.outofpercent', { $a: gradeObject });
        } else {
            this.readableGrade = Translate.instant('addon.mod_quiz.outof', { $a: gradeObject });
        }
    }

}
