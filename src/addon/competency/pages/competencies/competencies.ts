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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonCompetencyProvider } from '../../providers/competency';

/**
 * Page that displays the list of competencies of a learning plan.
 */
@IonicPage({ segment: 'addon-competency-competencies' })
@Component({
    selector: 'page-addon-competency-competencies',
    templateUrl: 'competencies.html',
})
export class AddonCompetencyCompetenciesPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    protected planId: number;
    protected courseId: number;
    protected competencyId: number;
    protected userId: number;

    competenciesLoaded = false;
    competencies = [];
    title: string;

    constructor(navParams: NavParams, private translate: TranslateService, private domUtils: CoreDomUtilsProvider,
            private competencyProvider: AddonCompetencyProvider) {
        this.planId = navParams.get('planId');
        this.courseId = navParams.get('courseId');
        this.competencyId = navParams.get('competencyId');
        this.userId = navParams.get('userId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.competencyId) {
            // There is a competency to load.
            this.openCompetency(this.competencyId);
        }

        this.fetchCompetencies().then(() => {
            if (!this.competencyId && this.splitviewCtrl.isOn() && this.competencies.length > 0) {
                // Take first and load it.
                this.openCompetency(this.competencies[0].id);
            }
        }).finally(() => {
            this.competenciesLoaded = true;
        });
    }

    /**
     * Fetches the competencies and updates the view.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected fetchCompetencies(): Promise<void> {
        let promise;

        if (this.planId) {
            promise = this.competencyProvider.getLearningPlan(this.planId);
        } else if (this.courseId) {
            promise = this.competencyProvider.getCourseCompetencies(this.courseId, this.userId);
        } else {
            promise = Promise.reject(null);
        }

        return promise.then((response) => {
            if (response.competencycount <= 0) {
                return Promise.reject(this.translate.instant('addon.competency.errornocompetenciesfound'));
            }

            if (this.planId) {
                this.title = response.plan.name;
                this.userId = response.plan.userid;
            } else {
                this.title = this.translate.instant('addon.competency.coursecompetencies');
            }
            this.competencies = response.competencies;
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting competencies data.');
        });
    }

    /**
     * Opens a competency.
     *
     * @param {number} competencyId
     */
    openCompetency(competencyId: number): void {
        this.competencyId = competencyId;
        let params;
        if (this.planId) {
            params = {competencyId, planId: this.planId};
        } else {
            params = {competencyId, courseId: this.courseId, userId: this.userId};
        }
        this.splitviewCtrl.push('AddonCompetencyCompetencyPage', params);
    }

    /**
     * Refreshes the competencies.
     *
     * @param {any} refresher Refresher.
     */
    refreshCompetencies(refresher: any): void {
        let promise;
        if (this.planId) {
            promise = this.competencyProvider.invalidateLearningPlan(this.planId);
        } else {
            promise = this.competencyProvider.invalidateCourseCompetencies(this.courseId, this.userId);
        }

        return promise.finally(() => {
            this.fetchCompetencies().finally(() => {
                refresher.complete();
            });
        });
    }
}
