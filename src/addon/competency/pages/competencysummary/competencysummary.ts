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

import { Component, Optional } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonCompetencyProvider, AddonCompetencySummary } from '../../providers/competency';

/**
 * Page that displays a learning plan.
 */
@IonicPage({ segment: 'addon-competency-competency-summary' })
@Component({
    selector: 'page-addon-competency-competency-summary',
    templateUrl: 'competencysummary.html',
})
export class AddonCompetencyCompetencySummaryPage {
    competencyLoaded = false;
    competencyId: number;
    competency: AddonCompetencySummary;
    contextLevel: string;
    contextInstanceId: number;

    constructor(private navCtrl: NavController, navParams: NavParams, private domUtils: CoreDomUtilsProvider,
            @Optional() private svComponent: CoreSplitViewComponent, private competencyProvider: AddonCompetencyProvider) {
        this.competencyId = navParams.get('competencyId');
        this.contextLevel = navParams.get('contextLevel');
        this.contextInstanceId = navParams.get('contextInstanceId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchCompetency().then(() => {
            const name = this.competency.competency && this.competency.competency.shortname;

            this.competencyProvider.logCompetencyView(this.competencyId, name).catch(() => {
                // Ignore errors.
            });
        }).finally(() => {
            this.competencyLoaded = true;
        });
    }

    /**
     * Fetches the competency summary and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected fetchCompetency(): Promise<void> {
        return this.competencyProvider.getCompetencySummary(this.competencyId).then((result) => {
            if (!this.contextLevel || typeof this.contextInstanceId == 'undefined') {
                // Context not specified, use user context.
                this.contextLevel = 'user';
                this.contextInstanceId = result.usercompetency.userid;
            }

            this.competency = result.competency;
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Error getting competency summary data.');
        });
    }

    /**
     * Refreshes the competency summary.
     *
     * @param refresher Refresher.
     */
    refreshCompetency(refresher: any): void {
        this.competencyProvider.invalidateCompetencySummary(this.competencyId).finally(() => {
            this.fetchCompetency().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId
     */
    openCompetencySummary(competencyId: number): void {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push('AddonCompetencyCompetencySummaryPage', {
            competencyId,
            contextLevel: this.contextLevel,
            contextInstanceId: this.contextInstanceId
        });
    }
}
