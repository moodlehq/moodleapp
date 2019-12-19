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

import { Component, Input, OnInit } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonCourseCompletionProvider, AddonCourseCompletionCourseCompletionStatus } from '../../providers/coursecompletion';

/**
 * Component that displays the course completion report.
 */
@Component({
    selector: 'addon-course-completion-report',
    templateUrl: 'addon-course-completion-report.html',
})
export class AddonCourseCompletionReportComponent implements OnInit {
    @Input() courseId: number;
    @Input() userId: number;

    completionLoaded = false;
    completion: AddonCourseCompletionCourseCompletionStatus;
    showSelfComplete: boolean;
    tracked = true; // Whether completion is tracked.
    statusText: string;

    constructor(
        private sitesProvider: CoreSitesProvider,
        private domUtils: CoreDomUtilsProvider,
        private courseCompletionProvider: AddonCourseCompletionProvider) {}

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.userId) {
            this.userId = this.sitesProvider.getCurrentSiteUserId();
        }

        this.fetchCompletion().finally(() => {
            this.completionLoaded = true;
        });
    }

    /**
     * Fetch compleiton data.
     *
     * @return Promise resolved when done.
     */
    protected fetchCompletion(): Promise<any> {
        return this.courseCompletionProvider.getCompletion(this.courseId, this.userId).then((completion) => {

            this.statusText = this.courseCompletionProvider.getCompletedStatusText(completion);

            this.completion = completion;
            this.showSelfComplete = this.courseCompletionProvider.canMarkSelfCompleted(this.userId, completion);
            this.tracked = true;
        }).catch((error) => {
            if (error && error.errorcode == 'notenroled') {
                // Not enrolled error, probably a teacher.
                this.tracked = false;
            } else {
                this.domUtils.showErrorModalDefault(error, 'addon.coursecompletion.couldnotloadreport', true);
            }
        });
    }

    /**
     * Refresh completion data on PTR.
     *
     * @param refresher Refresher instance.
     */
    refreshCompletion(refresher?: any): void {
        this.courseCompletionProvider.invalidateCourseCompletion(this.courseId, this.userId).finally(() => {
            this.fetchCompletion().finally(() => {
                refresher && refresher.complete();
            });
        });
    }

    /**
     * Mark course as completed.
     */
    completeCourse(): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.courseCompletionProvider.markCourseAsSelfCompleted(this.courseId).then(() => {
            return this.refreshCompletion();
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            modal.dismiss();
        });
    }
}
