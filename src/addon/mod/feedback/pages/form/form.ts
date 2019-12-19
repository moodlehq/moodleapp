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

import { Component, OnDestroy, Optional, NgZone } from '@angular/core';
import { IonicPage, NavParams, NavController, Content } from 'ionic-angular';
import { Network } from '@ionic-native/network';
import { TranslateService } from '@ngx-translate/core';
import { AddonModFeedbackProvider } from '../../providers/feedback';
import { AddonModFeedbackHelperProvider } from '../../providers/helper';
import { AddonModFeedbackSyncProvider } from '../../providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Page that displays feedback form.
 */
@IonicPage({ segment: 'addon-mod-feedback-form' })
@Component({
    selector: 'page-addon-mod-feedback-form',
    templateUrl: 'form.html',
})
export class AddonModFeedbackFormPage implements OnDestroy {

    protected module: any;
    protected currentPage: number;
    protected submitted: any;
    protected feedback;
    protected siteAfterSubmit;
    protected onlineObserver;
    protected originalData;
    protected currentSite;
    protected forceLeave = false;

    title: string;
    preview = false;
    courseId: number;
    componentId: number;
    completionPageContents: string;
    component = AddonModFeedbackProvider.COMPONENT;
    offline = false;
    feedbackLoaded = false;
    access: any;
    items = [];
    hasPrevPage = false;
    hasNextPage = false;
    completed = false;
    completedOffline = false;

    constructor(navParams: NavParams, protected feedbackProvider: AddonModFeedbackProvider, protected appProvider: CoreAppProvider,
            protected utils: CoreUtilsProvider, protected domUtils: CoreDomUtilsProvider, protected navCtrl: NavController,
            protected feedbackHelper: AddonModFeedbackHelperProvider, protected courseProvider: CoreCourseProvider,
            protected eventsProvider: CoreEventsProvider, protected feedbackSync: AddonModFeedbackSyncProvider, network: Network,
            protected translate: TranslateService, protected loginHelper: CoreLoginHelperProvider,
            protected linkHelper: CoreContentLinksHelperProvider, sitesProvider: CoreSitesProvider,
            @Optional() private content: Content, zone: NgZone, protected courseHelper: CoreCourseHelperProvider) {

        this.module = navParams.get('module');
        this.courseId = navParams.get('courseId');
        this.currentPage = navParams.get('page');
        this.title = navParams.get('title');
        this.preview = !!navParams.get('preview');
        this.componentId = navParams.get('moduleId') || this.module.id;

        this.currentSite = sitesProvider.getCurrentSite();

        // Refresh online status when changes.
        this.onlineObserver = network.onchange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.offline = !this.appProvider.isOnline();
            });
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().then(() => {
            this.feedbackProvider.logView(this.feedback.id, this.feedback.name, true).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * View entered.
     */
    ionViewDidEnter(): void {
        this.forceLeave = false;
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        if (!this.preview) {
            const responses = this.feedbackHelper.getPageItemsResponses(this.items);

            if (this.items && !this.completed && this.originalData) {
                // Form submitted. Check if there is any change.
                if (!this.utils.basicLeftCompare(responses, this.originalData, 3)) {
                     return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
                }
            }
        }

        return Promise.resolve();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        this.offline = !this.appProvider.isOnline();

        return this.feedbackProvider.getFeedback(this.courseId, this.module.id).then((feedbackData) => {
            this.feedback = feedbackData;

            this.title = this.feedback.name || this.title;

            return this.fetchAccessData();
        }).then((accessData) => {
            if (!this.preview && accessData.cansubmit && !accessData.isempty) {
                return typeof this.currentPage == 'undefined' ?
                    this.feedbackProvider.getResumePage(this.feedback.id, this.offline, true) :
                    Promise.resolve(this.currentPage);
            } else {
                this.preview = true;

                return Promise.resolve(0);
            }
        }).catch((error) => {
            if (!this.offline && !this.utils.isWebServiceError(error)) {
                // If it fails, go offline.
                this.offline = true;

                return this.feedbackProvider.getResumePage(this.feedback.id, true);
            }

            return Promise.reject(error);
        }).then((page) => {
            return this.fetchFeedbackPageData(page || 0);
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            this.forceLeave = true;
            this.navCtrl.pop();

            return Promise.reject(null);
        }).finally(() => {
            this.feedbackLoaded = true;
        });
    }

    /**
     * Fetch access information.
     *
     * @return Promise resolved when done.
     */
    protected fetchAccessData(): Promise<any> {
        return this.feedbackProvider.getFeedbackAccessInformation(this.feedback.id, this.offline, true).catch((error) => {
            if (!this.offline && !this.utils.isWebServiceError(error)) {
                // If it fails, go offline.
                this.offline = true;

                return this.feedbackProvider.getFeedbackAccessInformation(this.feedback.id, true);
            }

            return Promise.reject(error);
         }).then((accessData) => {
            this.access = accessData;

            return accessData;
         });
    }

    protected fetchFeedbackPageData(page: number = 0): Promise<void> {
        let promise;
        this.items = [];

        if (this.preview) {
            promise = this.feedbackProvider.getItems(this.feedback.id);
        } else {
            this.currentPage = page;

            promise = this.feedbackProvider.getPageItemsWithValues(this.feedback.id, page, this.offline, true).catch((error) => {
                if (!this.offline && !this.utils.isWebServiceError(error)) {
                    // If it fails, go offline.
                    this.offline = true;

                    return this.feedbackProvider.getPageItemsWithValues(this.feedback.id, page, true);
                }

                return Promise.reject(error);
            }).then((response) => {
                this.hasPrevPage = !!response.hasprevpage;
                this.hasNextPage = !!response.hasnextpage;

                return response;
            });
        }

        return promise.then((response) => {
            this.items = response.items.map((itemData) => {
                return this.feedbackHelper.getItemForm(itemData, this.preview);
            }).filter((itemData) => {
                // Filter items with errors.
                return itemData;
            });

            if (!this.preview) {
                const itemsCopy = this.utils.clone(this.items); // Copy the array to avoid modifications.
                this.originalData = this.feedbackHelper.getPageItemsResponses(itemsCopy);
            }
        });
    }

    /**
     * Function to allow page navigation through the questions form.
     *
     * @param goPrevious If true it will go back to the previous page, if false, it will go forward.
     * @return Resolved when done.
     */
    gotoPage(goPrevious: boolean): Promise<void> {
        this.domUtils.scrollToTop(this.content);
        this.feedbackLoaded = false;

        const responses = this.feedbackHelper.getPageItemsResponses(this.items),
            formHasErrors = this.items.some((item) => {
                return item.isEmpty || item.hasError;
            });

        // Sync other pages first.
        return this.feedbackSync.syncFeedback(this.feedback.id).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.feedbackProvider.processPage(this.feedback.id, this.currentPage, responses, goPrevious, formHasErrors,
                    this.courseId).then((response) => {
                const jumpTo = parseInt(response.jumpto, 10);

                if (response.completed) {
                    // Form is completed, show completion message and buttons.
                    this.items = [];
                    this.completed = true;
                    this.completedOffline = !!response.offline;
                    this.completionPageContents = response.completionpagecontents;
                    this.siteAfterSubmit = response.siteaftersubmit;
                    this.submitted = true;

                    // Invalidate access information so user will see home page updated (continue form or completion messages).
                    const promises = [];
                    promises.push(this.feedbackProvider.invalidateFeedbackAccessInformationData(this.feedback.id));
                    promises.push(this.feedbackProvider.invalidateResumePageData(this.feedback.id));

                    return Promise.all(promises).then(() => {
                        return this.fetchAccessData();
                    });
                } else if (isNaN(jumpTo) || jumpTo == this.currentPage) {
                    // Errors on questions, stay in page.
                    return Promise.resolve();
                } else {
                    this.submitted = true;
                    // Invalidate access information so user will see home page updated (continue form).
                    this.feedbackProvider.invalidateResumePageData(this.feedback.id);

                    // Fetch the new page.
                    return this.fetchFeedbackPageData(jumpTo);
                }
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);

            return Promise.reject(null);
        }).finally(() => {
            this.feedbackLoaded = true;
        });
    }

    /**
     * Function to link implemented features.
     */
    showAnalysis(): void {
        this.submitted = 'analysis';
        this.feedbackHelper.openFeature('analysis', this.navCtrl, this.module, this.courseId);
    }

    /**
     * Function to go to the page after submit.
     */
    continue(): void {
        if (this.siteAfterSubmit) {
            const modal = this.domUtils.showModalLoading();
            this.linkHelper.handleLink(this.siteAfterSubmit).then((treated) => {
                if (!treated) {
                    return this.currentSite.openInBrowserWithAutoLoginIfSameSite(this.siteAfterSubmit);
                }
            }).finally(() => {
                modal.dismiss();
            });
        } else {
            this.courseHelper.getAndOpenCourse(undefined, this.courseId, {}, this.currentSite.getId());
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        if (this.submitted) {
            const tab = this.submitted == 'analysis' ? 'analysis' : 'overview';

            // If form has been submitted, the info has been already invalidated but we should update index view.
            this.eventsProvider.trigger(AddonModFeedbackProvider.FORM_SUBMITTED, {
                feedbackId: this.feedback.id,
                tab: tab,
                offline: this.completedOffline
            });
        }
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
