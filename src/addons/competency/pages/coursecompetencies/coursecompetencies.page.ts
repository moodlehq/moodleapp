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

import { Component, OnInit } from '@angular/core';
import { AddonCompetencyDataForCourseCompetenciesPageWSResponse, AddonCompetency } from '@addons/competency/services/competency';
import { AddonCompetencyHelper } from '@addons/competency/services/competency-helper';
import { CoreUserProfile } from '@features/user/services/user';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { AddonCompetencyMainMenuHandlerService } from '@addons/competency/services/handlers/mainmenu';
import { ContextLevel } from '@/core/constants';

/**
 * Page that displays the list of competencies of a course.
 */
@Component({
    selector: 'page-addon-competency-coursecompetencies',
    templateUrl: 'coursecompetencies.html',
})
export class AddonCompetencyCourseCompetenciesPage implements OnInit {

    competenciesLoaded = false;
    competencies?: AddonCompetencyDataForCourseCompetenciesPageWSResponse;
    user?: CoreUserProfile;
    courseId!: number;

    protected userId!: number;

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.userId = CoreNavigator.getRouteNumberParam('userId')!;

        this.fetchCourseCompetencies().finally(() => {
            this.competenciesLoaded = true;
        });
    }

    /**
     * Fetches the competencies and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchCourseCompetencies(): Promise<void> {
        try {
            this.competencies = await AddonCompetency.getCourseCompetencies(this.courseId, this.userId);

            // Get the user profile image.
            this.user = await AddonCompetencyHelper.getProfile(this.userId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting course competencies data.');
        }
    }

    /**
     * Opens a competency.
     *
     * @param competencyId
     */
    openCompetency(competencyId: number): void {
        CoreNavigator.navigateToSitePath(
            '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/competencies/' + competencyId,
            {
                params: { courseId: this.courseId, userId: this.userId },
            },
        );
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId
     */
    openCompetencySummary(competencyId: number): void {
        CoreNavigator.navigateToSitePath('/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/summary/' + competencyId, {
            params: {
                contextLevel: ContextLevel.COURSE,
                contextInstanceId: this.courseId,
            } });
    }

    /**
     * Refreshes the competencies.
     *
     * @param refresher Refresher.
     */
    refreshCourseCompetencies(refresher?: IonRefresher): void {
        AddonCompetency.invalidateCourseCompetencies(this.courseId, this.userId).finally(() => {
            this.fetchCourseCompetencies().finally(() => {
                refresher?.complete();
            });
        });
    }

}
