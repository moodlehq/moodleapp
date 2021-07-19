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
import { ContextLevel } from '@/core/constants';
import { AddonCompetencySummary, AddonCompetency } from '@addons/competency/services/competency';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { AddonCompetencyMainMenuHandlerService } from '@addons/competency/services/handlers/mainmenu';

/**
 * Page that displays the competency summary.
 */
@Component({
    selector: 'page-addon-competency-competency-summary',
    templateUrl: 'competencysummary.html',
})
export class AddonCompetencyCompetencySummaryPage implements OnInit {

    competencyLoaded = false;
    competencyId!: number;
    competency?: AddonCompetencySummary;
    contextLevel?: ContextLevel;
    contextInstanceId?: number;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.competencyId = CoreNavigator.getRouteNumberParam('competencyId')!;
        this.contextLevel = CoreNavigator.getRouteParam<ContextLevel>('contextLevel');
        this.contextInstanceId = CoreNavigator.getRouteNumberParam('contextInstanceId');

        try {
            await this.fetchCompetency();
            const name = this.competency!.competency && this.competency!.competency.shortname;

            CoreUtils.ignoreErrors(AddonCompetency.logCompetencyView(this.competencyId, name));
        } finally {
            this.competencyLoaded = true;
        }
    }

    /**
     * Fetches the competency summary and updates the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchCompetency(): Promise<void> {
        try {
            const result = await AddonCompetency.getCompetencySummary(this.competencyId);
            if (!this.contextLevel || typeof this.contextInstanceId == 'undefined') {
                // Context not specified, use user context.
                this.contextLevel = ContextLevel.USER;
                this.contextInstanceId = result.usercompetency!.userid;
            }

            this.competency = result.competency;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting competency summary data.');
        }
    }

    /**
     * Refreshes the competency summary.
     *
     * @param refresher Refresher.
     */
    refreshCompetency(refresher: IonRefresher): void {
        AddonCompetency.invalidateCompetencySummary(this.competencyId).finally(() => {
            this.fetchCompetency().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Opens the summary of a competency.
     *
     * @param competencyId
     */
    openCompetencySummary(competencyId: number): void {
        CoreNavigator.navigateToSitePath(
            '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/summary/' + competencyId,
            {
                params: { contextLevel: this.contextLevel, contextInstanceId: this.contextInstanceId },
            },
        );
    }

}
