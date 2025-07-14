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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreNavigator } from '@services/navigator';
import { AddonCompetencyPlanFormatted, AddonCompetencyPlansSource } from '@addons/competency/classes/competency-plans-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the list of learning plans.
 */
@Component({
    selector: 'page-addon-competency-planlist',
    templateUrl: 'planlist.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonCompetencyPlanListPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    plans: CoreListItemsManager<AddonCompetencyPlanFormatted, AddonCompetencyPlansSource>;

    protected logView: () => void;

    constructor() {
        const userId = CoreNavigator.getRouteNumberParam('userId') ?? CoreSites.getCurrentSiteUserId();
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(AddonCompetencyPlansSource, [userId]);

        this.plans = new CoreListItemsManager(source, AddonCompetencyPlanListPage);

        this.logView = CoreTime.once(async () => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'tool_lp_data_for_plans_page',
                name: Translate.instant('addon.competency.userplans'),
                data: { userid: userId },
                url: `/admin/tool/lp/plans.php?userid=${userId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchLearningPlans();

        this.plans.start(this.splitView);
    }

    /**
     * Fetches the learning plans and updates the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchLearningPlans(): Promise<void> {
        try {
            await this.plans.load();

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting learning plans data.' });
        }
    }

    /**
     * Refreshes the learning plans.
     *
     * @param refresher Refresher.
     */
    async refreshLearningPlans(refresher: HTMLIonRefresherElement): Promise<void> {
        await this.plans.getSource().invalidateCache();

        this.plans.getSource().setDirty(true);
        this.fetchLearningPlans().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.plans.destroy();
    }

}
