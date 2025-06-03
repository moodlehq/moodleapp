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

import { Component, Optional, OnInit } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import {
    AddonModChoice,
    AddonModChoiceChoice,
    AddonModChoiceOption,
    AddonModChoiceResult,
} from '../../services/choice';
import { AddonModChoiceOffline } from '../../services/choice-offline';
import {
    AddonModChoiceAutoSyncData,
    AddonModChoiceSync,
    AddonModChoiceSyncResult,
} from '../../services/choice-sync';
import {
    ADDON_MOD_CHOICE_AUTO_SYNCED,
    ADDON_MOD_CHOICE_COMPONENT_LEGACY,
    ADDON_MOD_CHOICE_PUBLISH_ANONYMOUS,
    AddonModChoiceShowResults,
} from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreGroupInfo, CoreGroups } from '@services/groups';

/**
 * Component that displays a choice.
 */
@Component({
    selector: 'addon-mod-choice-index',
    templateUrl: 'addon-mod-choice-index.html',
    styleUrl: 'index.scss',
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModChoiceIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = ADDON_MOD_CHOICE_COMPONENT_LEGACY;
    pluginName = 'choice';

    choice?: AddonModChoiceChoice;
    options: AddonModChoiceOption[] = [];
    selectedOption: {id: number} = { id: -1 };
    showPreview = false;
    showResultsMessage = false;
    canEdit = false;
    canDelete = false;
    canSeeResults = false;
    showResultsLoading = true;
    data: number[] = [];
    labels: string[] = [];
    results: AddonModChoiceResultFormatted[] = [];
    publishInfo?: string; // Message explaining the user what will happen with his choices.

    groupsSupported = false;
    groupId = 0;
    groupInfo?: CoreGroupInfo;

    protected userId?: number;
    protected syncEventName = ADDON_MOD_CHOICE_AUTO_SYNCED;
    protected hasAnsweredOnline = false;
    protected now = CoreTime.timestamp();

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModChoiceIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.userId = CoreSites.getCurrentSiteUserId();

        try {
            await this.loadContent(false, true);
        } finally {
            this.showResultsLoading = false;
        }
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModChoice.invalidateChoiceData(this.courseId));

        if (this.choice) {
            promises.push(AddonModChoice.invalidateOptions(this.choice.id));
            promises.push(AddonModChoice.invalidateResults(this.choice.id));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModChoiceAutoSyncData): boolean {
        if (this.choice && syncEventData.choiceId == this.choice.id && syncEventData.userId == this.userId) {
            this.content?.scrollToTop();

            return true;
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        this.now = CoreTime.timestamp();

        this.choice = await AddonModChoice.getChoice(this.courseId, this.module.id);

        if (sync) {
            // Try to synchronize the choice.
            const updated = await this.syncActivity(showErrors);

            if (updated) {
                // Responses were sent, update the choice.
                this.choice = await AddonModChoice.getChoice(this.courseId, this.module.id);
            }
        }

        this.description = this.choice.intro;

        this.dataRetrieved.emit(this.choice);

        // Check if there are responses stored in offline.
        this.hasOffline = await AddonModChoiceOffline.hasResponse(this.choice.id);

        // We need fetchOptions to finish before calling fetchResults because it needs hasAnsweredOnline variable.
        await this.fetchOptions(this.choice);

        await this.fetchGroupsAndResults(this.choice);
    }

    /**
     * Convenience function to get choice options.
     *
     * @param choice Choice data.
     * @returns Promise resolved when done.
     */
    protected async fetchOptions(choice: AddonModChoiceChoice): Promise<void> {
        let options = await AddonModChoice.getOptions(choice.id, { cmId: this.module.id });

        // Check if the user has answered (synced) to allow show results.
        this.hasAnsweredOnline = options.some((option) => option.checked);

        if (this.hasOffline) {
            options = await this.getOfflineResponses(choice, options);
        }

        const isOpen = AddonModChoice.choiceHasBeenOpened(choice, this.now) &&
            !AddonModChoice.choiceHasBeenClosed(choice, this.now);

        this.selectedOption = { id: -1 }; // Single choice model.
        const hasAnswered = options.some((option) => {
            if (!option.checked) {
                return false;
            }

            if (!choice.allowmultiple) {
                this.selectedOption.id = option.id;
            }

            return true;
        });

        this.canEdit = isOpen && (!!choice.allowupdate || !hasAnswered);
        this.canDelete = isOpen && !!choice.allowupdate && hasAnswered;
        this.options = options;

        this.setPublishInfo(choice, hasAnswered);
    }

    /**
     * Set publish info message.
     *
     * @param choice Choice data.
     */
    protected setPublishInfo(choice: AddonModChoiceChoice, hasAnswered: boolean): void {
        const choiceOpen = !AddonModChoice.choiceHasBeenOpened(choice, this.now) &&
            !AddonModChoice.choiceHasBeenClosed(choice, this.now);

        if ((!choice.allowupdate && hasAnswered) || !choiceOpen) {
            this.showPreview = false;
            this.showResultsMessage = true;
            this.publishInfo = '';

            return;
        }

        this.showResultsMessage = false;
        this.showPreview = !!choice.showpreview;

        // Calculate the publish info message.
        switch (choice.showresults) {
            case AddonModChoiceShowResults.SHOWRESULTS_NOT:
                this.publishInfo = 'addon.mod_choice.publishinfonever';
                break;

            case AddonModChoiceShowResults.SHOWRESULTS_AFTER_ANSWER:
                if (choice.publish === ADDON_MOD_CHOICE_PUBLISH_ANONYMOUS) {
                    this.publishInfo = 'addon.mod_choice.publishinfoanonafter';
                } else {
                    this.publishInfo = 'addon.mod_choice.publishinfofullafter';
                }
                break;

            case AddonModChoiceShowResults.SHOWRESULTS_AFTER_CLOSE:
                if (choice.publish === ADDON_MOD_CHOICE_PUBLISH_ANONYMOUS) {
                    this.publishInfo = 'addon.mod_choice.publishinfoanonclose';
                } else {
                    this.publishInfo = 'addon.mod_choice.publishinfofullclose';
                }
                break;

            default:
                // No need to inform the user since it's obvious that the results are being published.
                this.publishInfo = '';
        }
    }

    /**
     * Get offline responses.
     *
     * @param choice Choice.
     * @param options Online options.
     * @returns Promise resolved with the options.
     */
    protected async getOfflineResponses(
        choice: AddonModChoiceChoice,
        options: AddonModChoiceOption[],
    ): Promise<AddonModChoiceOption[]> {
        const response = await AddonModChoiceOffline.getResponse(choice.id);

        const optionsMap: {[id: number]: AddonModChoiceOption} = {};
        options.forEach((option) => {
            optionsMap[option.id] = option;
        });

        // Update options with the offline data.
        if (response.deleting) {
            // Uncheck selected options.
            if (response.responses.length > 0) {
                // Uncheck all options selected in responses.
                response.responses.forEach((selected) => {
                    if (optionsMap[selected] && optionsMap[selected].checked) {
                        optionsMap[selected].checked = false;
                        optionsMap[selected].countanswers--;
                    }
                });
            } else {
                // On empty responses, uncheck all selected.
                Object.keys(optionsMap).forEach((key) => {
                    if (optionsMap[key].checked) {
                        optionsMap[key].checked = false;
                        optionsMap[key].countanswers--;
                    }
                });
            }
        } else {
            // Uncheck all options to check again the offlines'.
            Object.keys(optionsMap).forEach((key) => {
                if (optionsMap[key].checked) {
                    optionsMap[key].checked = false;
                    optionsMap[key].countanswers--;
                }
            });
            // Then check selected ones.
            response.responses.forEach((selected) => {
                if (optionsMap[selected]) {
                    optionsMap[selected].checked = true;
                    optionsMap[selected].countanswers++;
                }
            });
        }

        // Convert it again to array.
        return Object.keys(optionsMap).map((key) => optionsMap[key]);
    }

    /**
     * Fetch group info if needed and choice results.
     *
     * @param choice Choice instance.
     */
    protected async fetchGroupsAndResults(choice: AddonModChoiceChoice): Promise<void> {
        if (!AddonModChoice.choiceHasBeenOpened(choice, this.now)) {
            // Cannot see results yet.
            this.canSeeResults = false;

            return;
        }

        this.groupsSupported = await AddonModChoice.areGroupsSupported();
        if (this.groupsSupported) {
            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.module.id, false);

            this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);
        }

        await this.fetchResults(choice);
    }

    /**
     * Convenience function to get choice results.
     *
     * @param choice Choice.
     */
    protected async fetchResults(choice: AddonModChoiceChoice): Promise<void> {
        if (!AddonModChoice.choiceHasBeenOpened(choice, this.now)) {
            // Cannot see results yet.
            this.canSeeResults = false;

            return;
        }

        const results = await AddonModChoice.getResults(choice.id, {
            cmId: this.module.id,
            groupId: this.groupId,
        });

        let hasVotes = false;
        this.data = [];
        this.labels = [];

        this.results = results.map<AddonModChoiceResultFormatted>((result) => {
            if (result.numberofuser > 0) {
                hasVotes = true;
            }
            this.data.push(result.numberofuser);
            this.labels.push(result.text);

            return Object.assign(result, { percentageamountfixed: result.percentageamount.toFixed(1) });
        });

        this.canSeeResults = hasVotes || AddonModChoice.canStudentSeeResults(choice, this.hasAnsweredOnline, this.now);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.choice) {
            return; // Shouldn't happen.
        }

        await AddonModChoice.logView(this.choice.id);

        this.analyticsLogEvent('mod_choice_view_choice');
    }

    /**
     * Return true if the user has selected at least one option.
     *
     * @returns True if the user has responded.
     */
    canSave(): boolean {
        if (!this.choice) {
            return false;
        }

        if (this.choice.allowmultiple) {
            return this.options.some((option) => option.checked);
        } else {
            return this.selectedOption.id !== -1;
        }
    }

    /**
     * Save options selected.
     */
    async save(): Promise<void> {
        if (!this.choice) {
            return;
        }

        // Only show confirm if choice doesn't allow update.
        if (!this.choice.allowupdate) {
            await CoreAlerts.confirm(Translate.instant('core.areyousure'));
        }

        const responses: number[] = [];
        if (this.choice.allowmultiple) {
            this.options.forEach((option) => {
                if (option.checked) {
                    responses.push(option.id);
                }
            });
        } else {
            responses.push(this.selectedOption.id);
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const online = await AddonModChoice.submitResponse(this.choice.id, this.choice.name, this.courseId, responses);

            this.content?.scrollToTop();

            if (online) {
                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: this.moduleName });
                // Check completion since it could be configured to complete once the user answers the choice.
                this.checkCompletion();
            }

            this.analyticsLogEvent('mod_choice_view_choice', { data: { notify: 'choicesaved' } });

            await this.dataUpdated(online);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_choice.cannotsubmit') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Delete options selected.
     */
    async delete(): Promise<void> {
        if (!this.choice) {
            return;
        }

        try {
            await CoreAlerts.confirmDelete(Translate.instant('core.areyousure'));
        } catch {
            // User cancelled.
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await AddonModChoice.deleteResponses(this.choice.id, this.choice.name, this.courseId);

            this.content?.scrollToTop();

            this.analyticsLogEvent('mod_choice_view_choice', { data: { action: 'delchoice' } });

            // Refresh the data. Don't call dataUpdated because deleting an answer doesn't mark the choice as outdated.
            await this.refreshContent(false);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_choice.cannotsubmit') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Function to call when some data has changed. It will refresh/prefetch data.
     *
     * @param online Whether the data was sent to server or stored in offline.
     * @returns Promise resolved when done.
     */
    protected async dataUpdated(online: boolean): Promise<void> {
        if (!online || !this.isPrefetched()) {
            // Not downloaded, just refresh the data.
            return this.refreshContent(false);
        }

        try {
            // The choice is downloaded, update the data.
            await AddonModChoiceSync.prefetchModuleAfterUpdate(this.module, this.courseId);

            // Update the view.
            this.showLoadingAndFetch(false, false);
        } catch {
            // Prefetch failed, refresh the data.
            return this.refreshContent(false);
        }
    }

    /**
     * Toggle list of users in a result visible.
     *
     * @param result Result to expand.
     */
    toggle(result: AddonModChoiceResultFormatted): void {
        result.expanded = !result.expanded;
    }

    /**
     * @inheritdoc
     */
    protected sync(): Promise<AddonModChoiceSyncResult> {
        if (!this.choice) {
            throw new CoreError('Cannot sync without a choice.');
        }

        return AddonModChoiceSync.syncChoice(this.choice.id, this.userId);
    }

    /**
     * Group changed, reload some data.
     *
     * @returns Promise resolved when done.
     */
    async groupChanged(): Promise<void> {
        if (!this.choice) {
            return;
        }

        this.showResultsLoading = true;

        try {
            await this.fetchResults(this.choice);
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.showResultsLoading = false;
        }
    }

}

/**
 * Choice result with some calculated data.
 */
export type AddonModChoiceResultFormatted = AddonModChoiceResult & {
    percentageamountfixed: string; // Percentage of users answers with fixed decimals.
    expanded?: boolean;
};
