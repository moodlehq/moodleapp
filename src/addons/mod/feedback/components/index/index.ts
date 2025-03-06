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

import { Component, Input, Optional, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonModFeedback,
    AddonModFeedbackGetFeedbackAccessInformationWSResponse,
    AddonModFeedbackWSFeedback,
    AddonModFeedbackWSItem,
} from '../../services/feedback';
import { AddonModFeedbackOffline } from '../../services/feedback-offline';
import {
    AddonModFeedbackAutoSyncData,
    AddonModFeedbackSync,
    AddonModFeedbackSyncResult,
} from '../../services/feedback-sync';
import {
    ADDON_MOD_FEEDBACK_AUTO_SYNCED,
    ADDON_MOD_FEEDBACK_COMPONENT,
    ADDON_MOD_FEEDBACK_FORM_SUBMITTED,
    ADDON_MOD_FEEDBACK_PAGE_NAME,
    AddonModFeedbackAnalysisTemplateNames,
    AddonModFeedbackIndexTabName,
    AddonModFeedbackMultichoiceSubtype,
    AddonModFeedbackQuestionType,
} from '../../constants';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreChartType } from '@components/chart/chart';

/**
 * Component that displays a feedback index page.
 */
@Component({
    selector: 'addon-mod-feedback-index',
    templateUrl: 'addon-mod-feedback-index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModFeedbackIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @ViewChild(CoreTabsComponent) tabsComponent?: CoreTabsComponent;

    @Input() selectedTab: AddonModFeedbackIndexTabName = AddonModFeedbackIndexTabName.OVERVIEW;
    @Input() group = 0;

    component = ADDON_MOD_FEEDBACK_COMPONENT;
    pluginName = 'feedback';
    feedback?: AddonModFeedbackWSFeedback;
    goPage?: number;
    items: AddonModFeedbackItem[] = [];
    warning?: string;
    showAnalysis = false;
    tabsReady = false;
    firstSelectedTab?: number;
    access?: AddonModFeedbackGetFeedbackAccessInformationWSResponse;
    completedCount = 0;
    itemsCount = 0;
    groupInfo?: CoreGroupInfo;

    overview = {
        timeopen: 0,
        openTimeReadable: '',
        timeclose: 0,
        closeTimeReadable: '',
    };

    tabs = {
        overview: { name: AddonModFeedbackIndexTabName.OVERVIEW, label: 'addon.mod_feedback.overview', loaded: false },
        analysis: { name: AddonModFeedbackIndexTabName.ANALYSIS, label: 'addon.mod_feedback.analysis', loaded: false },
    };

    protected submitObserver: CoreEventObserver;
    protected syncEventName = ADDON_MOD_FEEDBACK_AUTO_SYNCED;
    protected checkCompletionAfterLog = false;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModLessonIndexComponent', content, courseContentsPage);

        // Listen for form submit events.
        this.submitObserver = CoreEvents.on(ADDON_MOD_FEEDBACK_FORM_SUBMITTED, async (data) => {
            if (!this.feedback || data.feedbackId !== this.feedback.id) {
                return;
            }

            this.tabs.analysis.loaded = false;
            this.tabs.overview.loaded = false;
            this.showLoading = true;

            // Prefetch data if needed.
            if (!data.offline && this.isPrefetched()) {
                await CorePromiseUtils.ignoreErrors(AddonModFeedbackSync.prefetchModuleAfterUpdate(
                    this.module,
                    this.courseId,
                ));
            }

            // Load the right tab.
            if (data.tab !== this.selectedTab) {
                this.tabChanged(data.tab);
            } else {
                this.loadContent(true);
            }
        }, this.siteId);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        try {
            await this.loadContent(false, true);
        } finally {
            this.tabsReady = true;
        }
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.feedback) {
            return; // Shouldn't happen.
        }

        await AddonModFeedback.logView(this.feedback.id);

        this.callAnalyticsLogEvent();
    }

    /**
     * Call analytics.
     */
    protected callAnalyticsLogEvent(): void {
        this.analyticsLogEvent('mod_feedback_view_feedback', {
            url: this.selectedTab === AddonModFeedbackIndexTabName.ANALYSIS
                ? `/mod/feedback/analysis.php?id=${this.module.id}`
                : undefined,
        });
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModFeedback.invalidateFeedbackData(this.courseId));
        if (this.feedback) {
            promises.push(AddonModFeedback.invalidateFeedbackAccessInformationData(this.feedback.id));
            promises.push(AddonModFeedback.invalidateAnalysisData(this.feedback.id));
            promises.push(CoreGroups.invalidateActivityAllowedGroups(this.feedback.coursemodule));
            promises.push(CoreGroups.invalidateActivityGroupMode(this.feedback.coursemodule));
            promises.push(AddonModFeedback.invalidateResumePageData(this.feedback.id));
        }

        this.tabs.analysis.loaded = false;
        this.tabs.overview.loaded = false;

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModFeedbackAutoSyncData): boolean {
        if (syncEventData.feedbackId === this.feedback?.id) {
            // Refresh the data.
            this.content?.scrollToTop();

            return true;
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        try {
            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.module.id);

            await this.fixPageAfterSubmitFileUrls();

            this.description = this.feedback.intro;
            this.dataRetrieved.emit(this.feedback);

            if (sync) {
                // Try to synchronize the feedback.
                await this.syncActivity(showErrors);
            }

            // Check if there are answers stored in offline.
            this.access = await AddonModFeedback.getFeedbackAccessInformation(this.feedback.id, { cmId: this.module.id });

            this.showAnalysis = (this.access.canviewreports || this.access.canviewanalysis) && !this.access.isempty;

            this.tabs.analysis.label = this.access.canviewreports
                ? 'addon.mod_feedback.analysis'
                : 'addon.mod_feedback.completed_feedbacks';

            this.firstSelectedTab = 0;
            if (!this.showAnalysis) {
                this.selectedTab = AddonModFeedbackIndexTabName.OVERVIEW;
            }

            if (this.selectedTab === AddonModFeedbackIndexTabName.ANALYSIS) {
                this.firstSelectedTab = 1;

                return await this.fetchFeedbackAnalysisData();
            }

            await this.fetchFeedbackOverviewData();
        } finally {
            if (this.feedback) {
                // Check if there are responses stored in offline.
                this.hasOffline = await AddonModFeedbackOffline.hasFeedbackOfflineData(this.feedback.id);
            }

            if (this.tabsReady) {
                // Make sure the right tab is selected.
                this.tabsComponent?.selectTab(this.selectedTab ?? AddonModFeedbackIndexTabName.OVERVIEW);
            }
        }
    }

    /**
     * Fix incorrect file URLs in page after submit text.
     *
     * See bug MDL-83474.
     */
    protected async fixPageAfterSubmitFileUrls(): Promise<void> {
        const site = await CoreSites.getSite(this.siteId);

        if (!site.isVersionGreaterEqualThan('4.2')
                || !this.feedback?.page_after_submit
                || !this.feedback.pageaftersubmitfiles) {
            return;
        }

        // Replace file URLs that do not have the /0/ in the path.
        // Subdirectories are not allowed in this file area, so the sets of correct and incorrect URLs will never overlap.
        for (const file of this.feedback.pageaftersubmitfiles) {
            const incorrectUrl = file.fileurl.replace('/page_after_submit/0/', '/page_after_submit/');
            const incorrectUrlRegex = new RegExp(CoreText.escapeForRegex(incorrectUrl), 'g');
            this.feedback.page_after_submit = this.feedback.page_after_submit.replace(incorrectUrlRegex, file.fileurl);
        }
    }

    /**
     * Convenience function to get feedback overview data.
     */
    protected async fetchFeedbackOverviewData(): Promise<void> {
        if (!this.access || !this.feedback) {
            return;
        }

        const promises: Promise<void>[] = [];

        if (this.access.cancomplete && this.access.cansubmit && this.access.isopen) {
            promises.push(AddonModFeedback.getResumePage(this.feedback.id, { cmId: this.module.id }).then((goPage) => {
                this.goPage = goPage > 0 ? goPage : undefined;

                return;
            }));
        }

        if (this.access.canedititems) {
            this.overview.timeopen = (this.feedback.timeopen || 0) * 1000;
            this.overview.openTimeReadable = this.overview.timeopen ? CoreTime.userDate(this.overview.timeopen) : '';
            this.overview.timeclose = (this.feedback.timeclose || 0) * 1000;
            this.overview.closeTimeReadable = this.overview.timeclose ? CoreTime.userDate(this.overview.timeclose) : '';
        }
        if (this.access.canviewanalysis) {
            // Get groups (only for teachers).
            promises.push(this.fetchGroupInfo(this.module.id));
        }

        try {
            await Promise.all(promises);
        } finally {
            this.tabs.overview.loaded = true;
        }
    }

    /**
     * Convenience function to get feedback analysis data.
     *
     * @returns Resolved when done.
     */
    protected async fetchFeedbackAnalysisData(): Promise<void> {
        try {
            if (this.access?.canviewanalysis) {
                // Get groups (only for teachers).
                await this.fetchGroupInfo(this.module.id);
            } else {
                this.tabChanged(AddonModFeedbackIndexTabName.OVERVIEW);
            }
        } finally {
            this.tabs.analysis.loaded = true;
        }
    }

    /**
     * Fetch Group info data.
     *
     * @param cmId Course module ID.
     * @returns Resolved when done.
     */
    protected async fetchGroupInfo(cmId: number): Promise<void> {
        this.groupInfo = await CoreGroups.getActivityGroupInfo(cmId);

        await this.setGroup(CoreGroups.validateGroupId(this.group, this.groupInfo));
    }

    /**
     * Parse the analysis info to show the info correctly formatted.
     *
     * @param item Item to parse.
     * @returns Parsed item.
     */
    protected parseAnalysisInfo(item: AddonModFeedbackItem): AddonModFeedbackItem {
        switch (item.typ) {
            case AddonModFeedbackQuestionType.NUMERIC:
                item.average = item.data.reduce((prev, current) => prev + Number(current), 0) / item.data.length;
                item.templateName = AddonModFeedbackAnalysisTemplateNames.NUMERIC;
                break;

            case AddonModFeedbackQuestionType.INFO:
                item.data = <string[]> item.data.map((dataItem) => {
                    const parsed = <Record<string, string>> CoreText.parseJSON(dataItem);

                    return parsed.show !== undefined ? parsed.show : false;
                }).filter((dataItem) => dataItem); // Filter false entries.

            case AddonModFeedbackQuestionType.TEXTFIELD:
            case AddonModFeedbackQuestionType.TEXTAREA:
                item.templateName = AddonModFeedbackAnalysisTemplateNames.LIST;
                break;

            case AddonModFeedbackQuestionType.MULTICHOICERATED:
            case AddonModFeedbackQuestionType.MULTICHOICE: {
                const parsedData = <Record<string, string | number>[]> item.data.map((dataItem) => {
                    const parsed = <Record<string, string | number>> CoreText.parseJSON(dataItem);

                    return parsed.answertext !== undefined ? parsed : false;
                }).filter((dataItem) => dataItem); // Filter false entries.

                // Format labels.
                item.labels = parsedData.map((dataItem) => {
                    dataItem.quotient = (<number> dataItem.quotient * 100).toFixed(2);
                    let label = '';

                    if (dataItem.value !== undefined) {
                        label = '(' + dataItem.value + ') ';
                    }
                    label += dataItem.answertext;
                    label += Number(dataItem.quotient) > 0 ? ' (' + dataItem.quotient + '%)' : '';

                    return label;
                });

                item.chartData = parsedData.map((dataItem) => Number(dataItem.answercount));

                if (item.typ === AddonModFeedbackQuestionType.MULTICHOICERATED) {
                    item.average = parsedData.reduce((prev, current) => prev + Number(current.avg), 0.0);
                }

                const subtype = item.presentation.charAt(0) as AddonModFeedbackMultichoiceSubtype;

                // Display bar chart if there are no answers to avoid division by 0 error.
                const single = subtype !== AddonModFeedbackMultichoiceSubtype.CHECKBOX && item.chartData.some((count) => count > 0);
                item.chartType = single ? 'doughnut' : 'bar';
                item.templateName = AddonModFeedbackAnalysisTemplateNames.CHART;
                break;
            }

            default:
                break;
        }

        return item;
    }

    /**
     * Function to go to the questions form.
     *
     * @param preview Preview or edit the form.
     */
    gotoAnswerQuestions(preview: boolean = false): void {
        CoreNavigator.navigateToSitePath(
            ADDON_MOD_FEEDBACK_PAGE_NAME + `/${this.courseId}/${this.module.id}/form`,
            {
                params: {
                    preview,
                    fromIndex: true,
                },
            },
        );
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        this.tabsComponent?.ionViewDidEnter();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        this.tabsComponent?.ionViewDidLeave();
    }

    /**
     * Open non respondents page.
     */
    openNonRespondents(): void {
        CoreNavigator.navigateToSitePath(
            ADDON_MOD_FEEDBACK_PAGE_NAME + `/${this.courseId}/${this.module.id}/nonrespondents`,
            {
                params: {
                    group: this.group,
                },
            },
        );
    }

    /**
     * Open attempts page.
     */
    openAttempts(): void {
        if (!this.access || !this.access.canviewreports || this.completedCount <= 0) {
            return;
        }

        CoreNavigator.navigateToSitePath(
            ADDON_MOD_FEEDBACK_PAGE_NAME + `/${this.courseId}/${this.module.id}/attempts`,
            {
                params: {
                    group: this.group,
                },
            },
        );
    }

    /**
     * Tab changed, fetch content again.
     *
     * @param tabName New tab name.
     */
    tabChanged(tabName: AddonModFeedbackIndexTabName): void {
        const tabHasChanged = this.selectedTab !== undefined && this.selectedTab !== tabName;
        this.selectedTab = tabName;

        if (!this.tabs[this.selectedTab].loaded) {
            this.loadContent(false, false, true);
        }

        if (tabHasChanged) {
            this.callAnalyticsLogEvent();
        }
    }

    /**
     * Set group to see the analysis.
     *
     * @param groupId Group ID.
     */
    async setGroup(groupId: number): Promise<void> {
        if (!this.feedback) {
            return;
        }

        this.group = groupId;

        const analysis = await AddonModFeedback.getAnalysis(this.feedback.id, { groupId, cmId: this.module.id });

        this.completedCount = analysis.completedcount;
        this.itemsCount = analysis.itemscount;

        if (this.selectedTab === AddonModFeedbackIndexTabName.ANALYSIS) {
            let num = 1;

            this.items = <AddonModFeedbackItem[]> analysis.itemsdata.map((itemData) => {
                const item: AddonModFeedbackItem = Object.assign(itemData.item, {
                    data: itemData.data,
                    num: num++,
                });

                // Move data inside item.
                if (item.data && item.data.length) {
                    return this.parseAnalysisInfo(item);
                }

                return false;
            }).filter((item) => item);

            this.warning = '';
            if (analysis.warnings?.length) {
                const warning = analysis.warnings.find((warning) => warning.warningcode == 'insufficientresponsesforthisgroup');
                this.warning = warning?.message;
            }
        }
    }

    /**
     * @inheritdoc
     */
    protected sync(): Promise<AddonModFeedbackSyncResult> {
        if (!this.feedback) {
            throw new CoreError('Cannot sync without a feedback.');
        }

        return AddonModFeedbackSync.syncFeedback(this.feedback.id);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.submitObserver?.off();
    }

}

type AddonModFeedbackItem = AddonModFeedbackWSItem & {
    data: string[];
    num: number;
    templateName?: AddonModFeedbackAnalysisTemplateNames;
    average?: number;
    labels?: string[];
    chartData?: number[];
    chartType?: CoreChartType;
};
