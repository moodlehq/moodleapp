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
import { Params } from '@angular/router';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { AddonModWorkshopData, AddonModWorkshopGetWorkshopAccessInformationWSResponse } from '../../services/workshop';
import {
    AddonModWorkshopHelper,
    AddonModWorkshopSubmissionAssessmentWithFormData,
    AddonModWorkshopSubmissionDataWithOfflineData,
} from '../../services/workshop-helper';
import { AddonModWorkshopOffline } from '../../services/workshop-offline';

/**
 * Component that displays workshop assessment.
 */
@Component({
    selector: 'addon-mod-workshop-assessment',
    templateUrl: 'addon-mod-workshop-assessment.html',
})
export class AddonModWorkshopAssessmentComponent implements OnInit {

    @Input() assessment!: AddonModWorkshopSubmissionAssessmentWithFormData;
    @Input() courseId!: number;
    @Input() workshop!: AddonModWorkshopData;
    @Input() access!: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    @Input() submission!: AddonModWorkshopSubmissionDataWithOfflineData;
    @Input() module!: CoreCourseModuleData;

    canViewAssessment = false;
    canSelfAssess = false;
    profile?: CoreUserProfile;
    showGrade: (grade?: string | number) => boolean;
    offline = false;
    loaded = false;

    protected currentUserId: number;
    protected assessmentId?: number;

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.showGrade = AddonModWorkshopHelper.showGrade;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const canAssess = this.access && this.access.assessingallowed;
        const userId = this.assessment.reviewerid;
        const promises: Promise<void>[] = [];

        this.assessmentId = this.assessment.id;
        this.canViewAssessment = !!this.assessment.grade;
        this.canSelfAssess = canAssess && userId == this.currentUserId;

        if (userId) {
            promises.push(CoreUser.getProfile(userId, this.courseId, true).then((profile) => {
                this.profile = profile;

                return;
            }));
        }

        let assessOffline: Promise<void>;
        if (userId == this.currentUserId) {
            assessOffline = AddonModWorkshopOffline.getAssessment(this.workshop.id, this.assessmentId) .then((offlineAssess) => {
                this.offline = true;
                this.assessment.weight = <number>offlineAssess.inputdata.weight;

                return;
            });
        } else {
            assessOffline = AddonModWorkshopOffline.getEvaluateAssessment(this.workshop.id, this.assessmentId)
                .then((offlineAssess) => {
                    this.offline = true;
                    this.assessment.gradinggradeover = offlineAssess.gradinggradeover;
                    this.assessment.weight = <number>offlineAssess.weight;

                    return;

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
    async gotoAssessment(event: Event): Promise<void> {
        if (!this.canSelfAssess && this.canViewAssessment) {
            event.preventDefault();
            event.stopPropagation();

            const params: Params = {
                assessment: this.assessment,
                submission: this.submission,
                profile: this.profile,
            };

            if (!this.submission) {
                const modal = await CoreDomUtils.showModalLoading();

                try {
                    params.submission = await AddonModWorkshopHelper.getSubmissionById(
                        this.workshop.id,
                        this.assessment.submissionid,
                        { cmId: this.workshop.coursemodule },
                    );

                    CoreNavigator.navigate(String(this.assessmentId), { params });
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'Cannot load submission');
                } finally {
                    modal.dismiss();
                }
            } else {
                CoreNavigator.navigate(String(this.assessmentId), { params });
            }
        }
    }

    /**
     * Navigate to my own assessment.
     */
    gotoOwnAssessment(event: Event): void {
        if (!this.canSelfAssess) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const params: Params = {
            module: this.module,
            workshop: this.workshop,
            access: this.access,
            profile: this.profile,
            submission: this.submission,
            assessment: this.assessment,
        };

        CoreNavigator.navigate(String(this.submission.id), params);

    }

}
