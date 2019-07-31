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

import { Component, Input, Optional, Injector, ViewChild } from '@angular/core';
import { Content, NavController } from 'ionic-angular';
import { CoreGroupInfo, CoreGroupsProvider } from '@providers/groups';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { AddonModFeedbackProvider } from '../../providers/feedback';
import { AddonModFeedbackHelperProvider } from '../../providers/helper';
import { AddonModFeedbackOfflineProvider } from '../../providers/offline';
import { AddonModFeedbackSyncProvider } from '../../providers/sync';
import { CoreTabsComponent } from '@components/tabs/tabs';

/**
 * Component that displays a feedback index page.
 */
@Component({
    selector: 'addon-mod-feedback-index',
    templateUrl: 'addon-mod-feedback-index.html',
})
export class AddonModFeedbackIndexComponent extends CoreCourseModuleMainActivityComponent {
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;

    @Input() tab = 'overview';
    @Input() group = 0;

    component = AddonModFeedbackProvider.COMPONENT;
    moduleName = 'feedback';

    access = {
        canviewreports: false,
        canviewanalysis: false,
        isempty: true
    };
    feedback: any;
    goPage: number;
    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false
    };
    items: any[];
    overview = {
        timeopen: 0,
        openTimeReadable: '',
        timeclose: 0,
        closeTimeReadable: ''
    };
    warning = '';
    tabsLoaded = {
        overview: false,
        analysis: false
    };
    showTabs = false;
    tabsReady = false;
    firstSelectedTab: number;

    protected submitObserver: any;
    protected syncEventName = AddonModFeedbackSyncProvider.AUTO_SYNCED;

    constructor(injector: Injector, private feedbackProvider: AddonModFeedbackProvider, @Optional() content: Content,
            private feedbackOffline: AddonModFeedbackOfflineProvider, private groupsProvider: CoreGroupsProvider,
            private feedbackSync: AddonModFeedbackSyncProvider, protected navCtrl: NavController,
            private feedbackHelper: AddonModFeedbackHelperProvider, private timeUtils: CoreTimeUtilsProvider) {
        super(injector, content);

        // Listen for form submit events.
        this.submitObserver = this.eventsProvider.on(AddonModFeedbackProvider.FORM_SUBMITTED, (data) => {
            if (this.feedback && data.feedbackId == this.feedback.id) {
                this.tabsLoaded['analysis'] = false;
                this.tabsLoaded['overview'] = false;
                this.loaded = false;

                let promise;

                // Prefetch data if needed.
                if (!data.offline && this.isPrefetched()) {
                    promise = this.feedbackSync.prefetchAfterUpdate(this.module, this.courseId).catch(() => {
                        // Ignore errors.
                    });
                } else {
                    promise = Promise.resolve();
                }

                promise.then(() => {
                    // Load the right tab.
                    if (data.tab != this.tab) {
                        this.tabChanged(data.tab);
                    } else {
                        this.loadContent(true);
                    }
                });
            }
        }, this.siteId);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.loadContent(false, true).then(() => {
            this.feedbackProvider.logView(this.feedback.id, this.feedback.name).catch(() => {
                // Ignore errors.
            });
        }).finally(() => {
            this.tabsReady = true;
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.feedbackProvider.invalidateFeedbackData(this.courseId));
        if (this.feedback) {
            promises.push(this.feedbackProvider.invalidateFeedbackAccessInformationData(this.feedback.id));
            promises.push(this.feedbackProvider.invalidateAnalysisData(this.feedback.id));
            promises.push(this.groupsProvider.invalidateActivityAllowedGroups(this.feedback.coursemodule));
            promises.push(this.groupsProvider.invalidateActivityGroupMode(this.feedback.coursemodule));
            promises.push(this.feedbackProvider.invalidateResumePageData(this.feedback.id));
        }

        this.tabsLoaded['analysis'] = false;
        this.tabsLoaded['overview'] = false;

        return Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean}          True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        if (this.feedback && syncEventData.feedbackId == this.feedback.id) {
            // Refresh the data.
            this.domUtils.scrollToTop(this.content);

            return true;
        }

        return false;
    }

    /**
     * Download feedback contents.
     *
     * @param  {boolean}      [refresh=false]    If it's refreshing content.
     * @param  {boolean}      [sync=false]       If it should try to sync.
     * @param  {boolean}      [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        return this.feedbackProvider.getFeedback(this.courseId, this.module.id).then((feedback) => {
            this.feedback = feedback;

            this.description = feedback.intro || feedback.description;
            this.dataRetrieved.emit(feedback);

            if (sync) {
                // Try to synchronize the feedback.
                return this.syncActivity(showErrors);
            }
        }).then(() => {
            // Check if there are answers stored in offline.
            return this.feedbackProvider.getFeedbackAccessInformation(this.feedback.id);
        }).then((accessData) => {
            this.access = accessData;
            this.showTabs = (accessData.canviewreports || accessData.canviewanalysis) && !accessData.isempty;

            this.firstSelectedTab = 0;
            if (this.tab == 'analysis') {
                this.firstSelectedTab = 1;

                return this.fetchFeedbackAnalysisData(this.access);
            }

            return this.fetchFeedbackOverviewData(this.access);
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);

            // Check if there are responses stored in offline.
            return this.feedbackOffline.hasFeedbackOfflineData(this.feedback.id);
        }).then((hasOffline) => {
            this.hasOffline = hasOffline;
        });
    }

    /**
     * Convenience function to get feedback overview data.
     *
     * @param {any} accessData Retrieved access data.
     * @return {Promise<any>}  Resolved when done.
     */
    protected fetchFeedbackOverviewData(accessData: any): Promise<any> {
        const promises = [];

        if (accessData.cancomplete && accessData.cansubmit && accessData.isopen) {
            promises.push(this.feedbackProvider.getResumePage(this.feedback.id).then((goPage) => {
                this.goPage = goPage > 0 ? goPage : false;
            }));
        }

        if (accessData.canedititems) {
            this.overview.timeopen = parseInt(this.feedback.timeopen) * 1000 || 0;
            this.overview.openTimeReadable = this.overview.timeopen ? this.timeUtils.userDate(this.overview.timeopen) : '';
            this.overview.timeclose = parseInt(this.feedback.timeclose) * 1000 || 0;
            this.overview.closeTimeReadable = this.overview.timeclose ? this.timeUtils.userDate(this.overview.timeclose) : '';
        }
        if (accessData.canviewanalysis) {
            // Get groups (only for teachers).
            promises.push(this.fetchGroupInfo(this.feedback.coursemodule));
        }

        return Promise.all(promises).finally(() => {
            this.tabsLoaded['overview'] = true;
        });
    }

    /**
     * Convenience function to get feedback analysis data.
     *
     * @param {any} accessData Retrieved access data.
     * @return {Promise<any>}  Resolved when done.
     */
    protected fetchFeedbackAnalysisData(accessData: any): Promise<any> {
        let promise;

        if (accessData.canviewanalysis) {
            // Get groups (only for teachers).
            promise = this.fetchGroupInfo(this.feedback.coursemodule);
        } else {
            this.tabChanged('overview');
            promise = Promise.resolve();
        }

        return promise.finally(() => {
            this.tabsLoaded['analysis'] = true;
        });
    }

    /**
     * Fetch Group info data.
     *
     * @param  {number}       cmId Course module ID.
     * @return {Promise<any>}      Resolved when done.
     */
    protected fetchGroupInfo(cmId: number): Promise<any> {
        return this.groupsProvider.getActivityGroupInfo(cmId).then((groupInfo) => {
            this.groupInfo = groupInfo;

            return this.setGroup(this.groupsProvider.validateGroupId(this.group, groupInfo));
        });
    }

    /**
     * Parse the analysis info to show the info correctly formatted.
     *
     * @param  {any} item Item to parse.
     * @return {any}      Parsed item.
     */
    protected parseAnalysisInfo(item: any): any {
        switch (item.typ) {
            case 'numeric':
                item.average = item.data.reduce((prev, current) => {
                    return prev + parseInt(current, 10);
                }, 0) / item.data.length;
                item.template = 'numeric';
                break;

            case 'info':
                item.data = item.data.map((dataItem) => {
                    dataItem = this.textUtils.parseJSON(dataItem);

                    return typeof dataItem.show != 'undefined' ? dataItem.show : false;
                }).filter((dataItem) => {
                    // Filter false entries.
                    return dataItem;
                });

            case 'textfield':
            case 'textarea':
                item.template = 'list';
                break;

            case 'multichoicerated':
            case 'multichoice':
                item.data = item.data.map((dataItem) => {
                    dataItem = this.textUtils.parseJSON(dataItem);

                    return typeof dataItem.answertext != 'undefined' ? dataItem : false;
                }).filter((dataItem) => {
                    // Filter false entries.
                    return dataItem;
                });

                // Format labels.
                item.labels = item.data.map((dataItem) => {
                    dataItem.quotient = (dataItem.quotient * 100).toFixed(2);
                    let label = '';

                    if (typeof dataItem.value != 'undefined') {
                        label = '(' + dataItem.value + ') ';
                    }
                    label += dataItem.answertext;
                    label += dataItem.quotient > 0 ? ' (' + dataItem.quotient + '%)' : '';

                    return label;
                });

                item.chartData = item.data.map((dataItem) => {
                    return dataItem.answercount;
                });

                if (item.typ == 'multichoicerated') {
                    item.average = item.data.reduce((prev, current) => {
                        return prev + parseFloat(current.avg);
                    }, 0.0);
                }

                const subtype = item.presentation.charAt(0);

                const single = subtype != 'c';
                item.chartType = single ? 'doughnut' : 'bar';

                item.template = 'chart';
                break;

            default:
               break;
        }

        return item;
    }

    /**
     * Function to go to the questions form.
     *
     * @param {boolean} preview Preview or edit the form.
     */
    gotoAnswerQuestions(preview: boolean = false): void {
        const stateParams = {
            module: this.module,
            moduleId: this.module.id,
            courseId: this.courseId,
            preview: preview
        };
        this.navCtrl.push('AddonModFeedbackFormPage', stateParams);
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
    }

    /**
     * Function to link implemented features.
     *
     * @param {string} feature Feature to navigate.
     */
    openFeature(feature: string): void {
        this.feedbackHelper.openFeature(feature, this.navCtrl, this.module, this.courseId, this.group);
    }

    /**
     * Tab changed, fetch content again.
     *
     * @param {string} tabName New tab name.
     */
    tabChanged(tabName: string): void {
        this.tab = tabName;

        if (!this.tabsLoaded[this.tab]) {
            this.loadContent(false, false, true);
        }
    }

    /**
     * Set group to see the analysis.
     *
     * @param  {number}       groupId Group ID.
     * @return {Promise<any>}         Resolved when done.
     */
    setGroup(groupId: number): Promise<any> {
        this.group = groupId;

        return this.feedbackProvider.getAnalysis(this.feedback.id, groupId).then((analysis) => {
            this.feedback.completedCount = analysis.completedcount;
            this.feedback.itemsCount = analysis.itemscount;

            if (this.tab == 'analysis') {
                let num = 1;

                this.items = analysis.itemsdata.map((item) => {
                    // Move data inside item.
                    item.item.data = item.data;
                    item = item.item;
                    item.number = num++;
                    if (item.data && item.data.length) {
                        return this.parseAnalysisInfo(item);
                    }

                    return false;
                }).filter((item) => {
                    return item;
                });

                this.warning = '';
                if (analysis.warnings.length) {
                    const warning = analysis.warnings.find((warning) => {
                        return warning.warningcode == 'insufficientresponsesforthisgroup';
                    });
                    this.warning = warning && warning.message;
                }
            }
        });
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.feedbackSync.syncFeedback(this.feedback.id);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any}     result Data returned on the sync function.
     * @return {boolean}        If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.updated;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.submitObserver && this.submitObserver.off();
    }
}
