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

import { Component, OnDestroy, AfterViewInit, viewChild } from '@angular/core';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGroupInfo } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@static/events';
import {
    AddonModAssignSubmissionForList,
    AddonModAssignSubmissionsSource,
} from '../../classes/submissions-source';
import { AddonModAssignAssign } from '../../services/assign';
import {
    AddonModAssignManualSyncData,
    AddonModAssignAutoSyncData,
} from '../../services/assign-sync';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_ASSIGN_AUTO_SYNCED,
    ADDON_MOD_ASSIGN_GRADED_EVENT,
    ADDON_MOD_ASSIGN_MANUAL_SYNCED,
    ADDON_MOD_ASSIGN_MODNAME,
    AddonModAssignListFilterName,
} from '../../constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a list of submissions of an assignment.
 */
@Component({
    selector: 'page-addon-mod-assign-submission-list',
    templateUrl: 'submission-list.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModAssignSubmissionListPage implements AfterViewInit, OnDestroy {

    readonly splitView = viewChild.required(CoreSplitViewComponent);

    title = '';
    submissions!: CoreListItemsManager<AddonModAssignSubmissionForList, AddonModAssignSubmissionsSource>; // List of submissions

    protected gradedObserver: CoreEventObserver; // Observer to refresh data when a grade changes.
    protected syncObserver: CoreEventObserver; // Observer to refresh data when the async is synchronized.
    protected sourceUnsubscribe?: () => void;

    constructor() {
        // Update data if some grade changes.
        this.gradedObserver = CoreEvents.on(
            ADDON_MOD_ASSIGN_GRADED_EVENT,
            (data) => {
                if (
                    this.submissions.loaded &&
                    this.submissions.getSource().assign &&
                    data.assignmentId == this.submissions.getSource().assign?.id &&
                    data.userId == CoreSites.getCurrentSiteUserId()
                ) {
                    // Grade changed, refresh the data.
                    this.refreshAllData(true);
                }
            },
            CoreSites.getCurrentSiteId(),
        );

        // Refresh data if this assign is synchronized.
        const events = [ADDON_MOD_ASSIGN_AUTO_SYNCED, ADDON_MOD_ASSIGN_MANUAL_SYNCED];
        this.syncObserver = CoreEvents.onMultiple<AddonModAssignAutoSyncData | AddonModAssignManualSyncData>(
            events,
            (data) => {
                if (!this.submissions.loaded || ('context' in data && data.context == 'submission-list')) {
                    return;
                }

                this.refreshAllData(false);
            },
            CoreSites.getCurrentSiteId(),
        );

        try {
            const moduleId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const groupId = CoreNavigator.getRouteNumberParam('groupId') || 0;
            const selectedStatus = CoreNavigator.getRouteParam<AddonModAssignListFilterName>('status');
            const submissionsSource = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonModAssignSubmissionsSource,
                [courseId, moduleId, selectedStatus],
            );

            submissionsSource.groupId = groupId;
            this.sourceUnsubscribe = submissionsSource.addListener({
                onItemsUpdated: () => {
                    this.title = this.submissions.getSource().assign?.name || this.title;
                },
            });

            this.submissions = new CoreListItemsManager(
                submissionsSource,
                AddonModAssignSubmissionListPage,
            );
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }
    }

    get assign(): AddonModAssignAssign | undefined {
        return this.submissions.getSource().assign;
    }

    get groupInfo(): CoreGroupInfo {
        return this.submissions.getSource().groupInfo;
    }

    get moduleId(): number {
        return this.submissions.getSource().moduleId;
    }

    get courseId(): number {
        return this.submissions.getSource().courseId;
    }

    get groupId(): number {
        return this.submissions.getSource().groupId;
    }

    set groupId(value: number) {
        this.submissions.getSource().groupId = value;
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        const selectedStatus = this.submissions.getSource().selectedStatus;
        this.title = Translate.instant(
            selectedStatus
                ? (
                    selectedStatus === AddonModAssignListFilterName.NEED_GRADING
                        ? 'addon.mod_assign.numberofsubmissionsneedgrading'
                        : `addon.mod_assign.submissionstatus_${selectedStatus}`
                )
                : 'addon.mod_assign.numberofparticipants',
        );

        this.fetchAssignment(true).finally(() => {
            this.submissions.start(this.splitView());
        });
    }

    /**
     * Fetch assignment data.
     *
     * @param sync Whether to try to synchronize data.
     * @returns Promise resolved when done.
     */
    protected async fetchAssignment(sync = false): Promise<void> {
        try {
            await this.submissions.getSource().loadAssignment(sync);

            if (!this.assign) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'mod_assign_get_submissions',
                name: Translate.instant('addon.mod_assign.subpagetitle', {
                    contextname: this.assign.name,
                    subpage: Translate.instant('addon.mod_assign.grading'),
                }),
                data: { assignid: this.assign.id, category: ADDON_MOD_ASSIGN_MODNAME },
                url: `/mod/assign/view.php?id=${this.assign.cmid}&action=grading`,
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting assigment data.' });
        }
    }

    /**
     * Refresh all the data.
     *
     * @param sync Whether to try to synchronize data.
     * @returns Promise resolved when done.
     */
    protected async refreshAllData(sync?: boolean): Promise<void> {
        try {
            await this.submissions.getSource().invalidateCache();
        } finally {
            this.fetchAssignment(sync);
        }
    }

    /**
     * Refresh the list.
     *
     * @param refresher Refresher.
     */
    refreshList(refresher?: HTMLIonRefresherElement): void {
        this.refreshAllData(true).finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Reload submissions list.
     */
    async reloadSubmissions(): Promise<void> {
        await this.submissions.reload();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.gradedObserver?.off();
        this.syncObserver?.off();
        this.submissions.destroy();
        this.sourceUnsubscribe && this.sourceUnsubscribe();
    }

}
