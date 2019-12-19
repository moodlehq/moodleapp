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
import { NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModWorkshopProvider } from '../../providers/workshop';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';

/**
 * Component that displays workshop submission.
 */
@Component({
    selector: 'addon-mod-workshop-submission',
    templateUrl: 'addon-mod-workshop-submission.html',
})
export class AddonModWorkshopSubmissionComponent implements OnInit {
    @Input() submission: any;
    @Input() module: any;
    @Input() workshop: any;
    @Input() access: any;
    @Input() courseId: number;
    @Input() assessment?: any;
    @Input() summary?: boolean;

    component = AddonModWorkshopProvider.COMPONENT;
    componentId: number;
    userId: number;
    loaded = false;
    offline = false;
    viewDetails = false;
    profile: any;
    showGrade: any;
    evaluateByProfile: any;

    constructor(private workshopOffline: AddonModWorkshopOfflineProvider, private workshopHelper: AddonModWorkshopHelperProvider,
            private navCtrl: NavController, private userProvider: CoreUserProvider, sitesProvider: CoreSitesProvider) {
        this.userId = sitesProvider.getCurrentSiteUserId();
        this.showGrade = this.workshopHelper.showGrade;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.componentId = this.module.instance;
        this.userId = this.submission.authorid || this.submission.userid || this.userId;
        this.submission.title = this.submission.title || this.submission.submissiontitle;
        this.submission.timemodified = this.submission.timemodified || this.submission.submissionmodified;
        this.submission.id = this.submission.id || this.submission.submissionid;

        if (this.workshop.phase == AddonModWorkshopProvider.PHASE_ASSESSMENT) {
            if (this.submission.reviewedby && this.submission.reviewedby.length) {
                this.submission.reviewedbycount = this.submission.reviewedby.reduce((a, b) => {
                    return a + (b.grade ? 1 : 0);
                }, 0);
            }

            if (this.submission.reviewerof && this.submission.reviewerof.length) {
                this.submission.reviewerofcount = this.submission.reviewerof.reduce((a, b) => {
                    return a + (b.grade ? 1 : 0);
                }, 0);
            }
        }

        const promises = [];

        this.offline = (this.submission && this.submission.offline) || (this.assessment && this.assessment.offline);

        if (this.submission.id) {
            promises.push(this.workshopOffline.getEvaluateSubmission(this.workshop.id, this.submission.id)
                    .then((offlineSubmission) => {
                this.submission.submissiongradeover = offlineSubmission.gradeover;
                this.offline = true;
            }).catch(() => {
                // Ignore errors.
            }));
        }

        if (this.userId) {
            promises.push(this.userProvider.getProfile(this.userId, this.courseId, true).then((profile) => {
                this.profile = profile;
            }));
        }

        this.viewDetails = !this.summary && this.workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED &&
            this.navCtrl.getActive().name !== 'AddonModWorkshopSubmissionPage';

        if (this.viewDetails && this.submission.gradeoverby) {
            promises.push(this.userProvider.getProfile(this.submission.gradeoverby, this.courseId, true).then((profile) => {
                this.evaluateByProfile = profile;
            }));
        }

        Promise.all(promises).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Navigate to the submission.
     */
    gotoSubmission(): void {
        if (this.submission.timemodified) {
            const params = {
                module: this.module,
                workshop: this.workshop,
                access: this.access,
                courseId: this.courseId,
                profile: this.profile,
                submission: this.submission,
                assessment: this.assessment,
            };

            this.navCtrl.push('AddonModWorkshopSubmissionPage', params);
        }
    }
}
