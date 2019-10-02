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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';

/**
 * Component that displays workshop assessment.
 */
@Component({
    selector: 'addon-mod-workshop-assessment',
    templateUrl: 'addon-mod-workshop-assessment.html',
})
export class AddonModWorkshopAssessmentComponent implements OnInit {
    @Input() assessment: any;
    @Input() summary?: boolean;
    @Input() courseId: number;
    @Input() submission: any;
    @Input() module?: any;
    @Input() workshop: any;
    @Input() access: any;

    canViewAssessment = false;
    canSelfAssess = false;
    profile: any;
    showGrade: any;
    offline = false;
    loaded = false;

    protected currentUserId: number;
    protected assessmentId: number;

    constructor(private workshopOffline: AddonModWorkshopOfflineProvider, private workshopHelper: AddonModWorkshopHelperProvider,
            private navCtrl: NavController, private userProvider: CoreUserProvider, private domUtils: CoreDomUtilsProvider,
            sitesProvider: CoreSitesProvider) {
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.showGrade = this.workshopHelper.showGrade;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const canAssess = this.access && this.access.assessingallowed,
            userId = this.assessment.userid || this.assessment.reviewerid,
            promises = [];

        this.assessmentId = this.assessment.assessmentid || this.assessment.id;
        this.canViewAssessment = this.assessment.grade;
        this.canSelfAssess = canAssess && userId == this.currentUserId;

        if (userId) {
            promises.push(this.userProvider.getProfile(userId, this.courseId, true).then((profile) => {
                this.profile = profile;
            }));
        }

        let assessOffline;
        if (userId == this.currentUserId) {
            assessOffline = this.workshopOffline.getAssessment(this.workshop.id, this.assessmentId) .then((offlineAssess) => {
                this.offline = true;
                this.assessment.weight = offlineAssess.inputdata.weight;
            });
        } else {
            assessOffline = this.workshopOffline.getEvaluateAssessment(this.workshop.id, this.assessmentId)
                    .then((offlineAssess) => {
                this.offline = true;
                this.assessment.gradinggradeover = offlineAssess.gradinggradeover;
                this.assessment.weight = offlineAssess.weight;
            });
        }

        promises.push(assessOffline.catch(() => {
            this.offline = false;
            // Ignore errors.
        }));

        Promise.all(promises).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Navigate to the assessment.
     */
    gotoAssessment(): void {
        if (!this.canSelfAssess && this.canViewAssessment) {
            const params = {
                assessment: this.assessment,
                submission: this.submission,
                profile: this.profile,
                courseId: this.courseId,
                assessmentId: this.assessmentId
            };

            if (!this.submission) {
                const modal = this.domUtils.showModalLoading('core.sending', true);

                this.workshopHelper.getSubmissionById(this.workshop.id, this.assessment.submissionid)
                        .then((submissionData) => {

                    params.submission = submissionData;
                    this.navCtrl.push('AddonModWorkshopAssessmentPage', params);
                }).catch((message) => {
                    this.domUtils.showErrorModalDefault(message, 'Cannot load submission');
                }).finally(() => {
                    modal.dismiss();
                });
            } else {
                this.navCtrl.push('AddonModWorkshopAssessmentPage', params);
            }
        }
    }

    /**
     * Navigate to my own assessment.
     */
    gotoOwnAssessment(): void {
        if (this.canSelfAssess) {
            const params = {
                module: this.module,
                workshop: this.workshop,
                access: this.access,
                courseId: this.courseId,
                profile: this.profile,
                submission: this.submission,
                assessment: this.assessment
            };

            this.navCtrl.push('AddonModWorkshopSubmissionPage', params);
        }
    }
}
