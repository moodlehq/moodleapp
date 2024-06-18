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
import { AddonModWorkshopSubmissionPage } from '../../pages/submission/submission';
import {
    AddonModWorkshopData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
} from '../../services/workshop';
import {
    AddonModWorkshopHelper,
    AddonModWorkshopSubmissionAssessmentWithFormData,
    AddonModWorkshopSubmissionDataWithOfflineData,
} from '../../services/workshop-helper';
import { AddonModWorkshopOffline } from '../../services/workshop-offline';
import { ADDON_MOD_WORKSHOP_COMPONENT, ADDON_MOD_WORKSHOP_PAGE_NAME, AddonModWorkshopPhase } from '@addons/mod/workshop/constants';

/**
 * Component that displays workshop submission.
 */
@Component({
    selector: 'addon-mod-workshop-submission',
    templateUrl: 'addon-mod-workshop-submission.html',
    styleUrls: ['submission.scss'],
})
export class AddonModWorkshopSubmissionComponent implements OnInit {

    @Input({ required: true }) submission!: AddonModWorkshopSubmissionDataWithOfflineData;
    @Input({ required: true }) module!: CoreCourseModuleData;
    @Input({ required: true }) workshop!: AddonModWorkshopData;
    @Input({ required: true }) access!: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    @Input({ required: true }) courseId!: number;
    @Input() assessment?: AddonModWorkshopSubmissionAssessmentWithFormData;
    @Input() summary = false;

    component = ADDON_MOD_WORKSHOP_COMPONENT;
    componentId?: number;
    userId: number;
    loaded = false;
    offline = false;
    viewDetails = false;
    profile?: CoreUserProfile;
    showGrade: (grade?: number|string) => boolean;
    evaluateByProfile?: CoreUserProfile;

    constructor() {
        this.userId = CoreSites.getCurrentSiteUserId();
        this.showGrade = AddonModWorkshopHelper.showGrade;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.componentId = this.module.instance;
        this.userId = this.submission.authorid || this.userId;

        const promises: Promise<void>[] = [];

        this.offline = !!this.submission?.offline || !!this.assessment?.offline;

        if (this.submission.id) {
            promises.push(AddonModWorkshopOffline.getEvaluateSubmission(this.workshop.id, this.submission.id)
                .then((offlineSubmission) => {
                    this.submission.gradeover = parseInt(offlineSubmission.gradeover, 10);
                    this.offline = true;

                    return;
                }).catch(() => {
                    // Ignore errors.
                }));
        }

        if (this.userId) {
            promises.push(CoreUser.getProfile(this.userId, this.courseId, true).then((profile) => {
                this.profile = profile;

                return;
            }));
        }

        this.viewDetails = !this.summary && this.workshop.phase == AddonModWorkshopPhase.PHASE_CLOSED &&
            CoreNavigator.getCurrentRoute().component != AddonModWorkshopSubmissionPage;

        if (this.viewDetails && this.submission.gradeoverby) {
            promises.push(CoreUser.getProfile(this.submission.gradeoverby, this.courseId, true).then((profile) => {
                this.evaluateByProfile = profile;

                return;
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
            const params: Params = {
                module: this.module,
                workshop: this.workshop,
                access: this.access,
                profile: this.profile,
                submission: this.submission,
                assessment: this.assessment,
            };

            CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_WORKSHOP_PAGE_NAME}/${this.courseId}/${this.module.id}/${this.submission.id}`,
                { params },
            );

        }
    }

}
