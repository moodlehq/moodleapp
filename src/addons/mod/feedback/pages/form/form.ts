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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CoreSite } from '@classes/site';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCourse, CoreCourseCommonModWSOptions, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CanLeave } from '@guards/can-leave';
import { IonContent } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Network, NgZone, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import {
    AddonModFeedback,
    AddonModFeedbackGetFeedbackAccessInformationWSResponse,
    AddonModFeedbackPageItems,
    AddonModFeedbackProvider,
    AddonModFeedbackResponseValue,
    AddonModFeedbackWSFeedback,
} from '../../services/feedback';
import { AddonModFeedbackFormItem, AddonModFeedbackHelper } from '../../services/feedback-helper';
import { AddonModFeedbackSync } from '../../services/feedback-sync';
import { AddonModFeedbackModuleHandlerService } from '../../services/handlers/module';

/**
 * Page that displays feedback form.
 */
@Component({
    selector: 'page-addon-mod-feedback-form',
    templateUrl: 'form.html',
    styleUrls: ['form.scss'],
})
export class AddonModFeedbackFormPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild(IonContent) content?: IonContent;

    protected module?: CoreCourseWSModule;
    protected currentPage?: number;
    protected siteAfterSubmit?: string;
    protected onlineObserver: Subscription;
    protected originalData?: Record<string, AddonModFeedbackResponseValue>;
    protected currentSite: CoreSite;
    protected forceLeave = false;

    title?: string;
    preview = false;
    fromIndex = false;
    cmId!: number;
    courseId!: number;
    feedback?: AddonModFeedbackWSFeedback;
    completionPageContents?: string;
    component = AddonModFeedbackProvider.COMPONENT;
    offline = false;
    feedbackLoaded = false;
    access?: AddonModFeedbackGetFeedbackAccessInformationWSResponse;
    items: AddonModFeedbackFormItem[] = [];
    hasPrevPage = false;
    hasNextPage = false;
    completed = false;
    completedOffline = false;

    constructor() {
        this.currentSite = CoreSites.getCurrentSite()!;

        // Refresh online status when changes.
        this.onlineObserver = Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.offline = !CoreApp.isOnline();
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.currentPage = CoreNavigator.getRouteNumberParam('page');
        this.title = CoreNavigator.getRouteParam('title');
        this.preview = !!CoreNavigator.getRouteBooleanParam('preview');
        this.fromIndex = !!CoreNavigator.getRouteBooleanParam('fromIndex');

        await this.fetchData();

        if (!this.feedback) {
            return;
        }

        try {
            await AddonModFeedback.logView(this.feedback.id, this.feedback.name, true);

            CoreCourse.checkModuleCompletion(this.courseId, this.module!.completiondata);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * View entered.
     */
    ionViewDidEnter(): void {
        this.forceLeave = false;
    }

    /**
     * @inheritdoc
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave) {
            return true;
        }

        if (!this.preview) {
            const responses = AddonModFeedbackHelper.getPageItemsResponses(this.items);

            if (this.items && !this.completed && this.originalData) {
                // Form submitted. Check if there is any change.
                if (!CoreUtils.basicLeftCompare(responses, this.originalData, 3)) {
                    await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
                }
            }
        }

        return true;
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.module = await CoreCourse.getModule(this.cmId, this.courseId, undefined, true, false, this.currentSite.getId());

            this.offline = !CoreApp.isOnline();
            const options = {
                cmId: this.cmId,
                readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId: this.currentSite.getId(),
            };

            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.cmId);

            this.title = this.feedback.name || this.title;

            await this.fetchAccessData(options);

            let page = 0;

            if (!this.preview && this.access!.cansubmit && !this.access!.isempty) {
                page = this.currentPage ?? await this.fetchResumePage(options);
            } else {
                this.preview = true;
            }

            await this.fetchFeedbackPageData(page);
        } catch (message) {
            CoreDomUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            this.forceLeave = true;
            CoreNavigator.back();
        } finally {
            this.feedbackLoaded = true;
        }
    }

    /**
     * Fetch access information.
     *
     * @param options Options.
     * @return Promise resolved when done.
     */
    protected async fetchAccessData(options: CoreCourseCommonModWSOptions): Promise<void> {
        try {
            this.access = await AddonModFeedback.getFeedbackAccessInformation(this.feedback!.id, options);
        } catch (error) {
            if (this.offline || CoreUtils.isWebServiceError(error)) {
                // Already offline or shouldn't go offline, fail.
                throw error;
            }

            // If it fails, go offline.
            this.offline = true;
            options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

            this.access = await AddonModFeedback.getFeedbackAccessInformation(this.feedback!.id, options);
        }
    }

    /**
     * Get resume page from WS.
     *
     * @param options Options.
     * @return Promise resolved with the page to resume.
     */
    protected async fetchResumePage(options: CoreCourseCommonModWSOptions): Promise<number> {
        try {
            return await AddonModFeedback.getResumePage(this.feedback!.id, options);
        } catch (error) {
            if (this.offline || CoreUtils.isWebServiceError(error)) {
                // Already offline or shouldn't go offline, fail.
                throw error;
            }

            // Go offline.
            this.offline = true;
            options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

            return AddonModFeedback.getResumePage(this.feedback!.id, options);
        }
    }

    /**
     * Fetch page data.
     *
     * @param page Page to load.
     * @return Promise resolved when done.
     */
    protected async fetchFeedbackPageData(page: number = 0): Promise<void> {
        this.items = [];
        const response = await this.fetchPageItems(page);

        this.items = <AddonModFeedbackFormItem[]> response.items
            .map((itemData) => AddonModFeedbackHelper.getItemForm(itemData, this.preview))
            .filter((itemData) => itemData); // Filter items with errors.

        if (!this.preview) {
            const itemsCopy = CoreUtils.clone(this.items); // Copy the array to avoid modifications.
            this.originalData = AddonModFeedbackHelper.getPageItemsResponses(itemsCopy);
        }
    }

    /**
     * Fetch page items.
     *
     * @param page Page to get.
     * @return Promise resolved with WS response.
     */
    protected async fetchPageItems(page: number): Promise<AddonModFeedbackPageItems> {
        const options = {
            cmId: this.cmId,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId: this.currentSite.getId(),
        };

        if (this.preview) {
            const response = await AddonModFeedback.getItems(this.feedback!.id, options);

            return {
                items: response.items,
                warnings: response.warnings,
                hasnextpage: false,
                hasprevpage: false,
            };
        }

        this.currentPage = page;
        let response: AddonModFeedbackPageItems;

        try {
            response = await AddonModFeedback.getPageItemsWithValues(this.feedback!.id, page, options);
        } catch (error) {
            if (this.offline || CoreUtils.isWebServiceError(error)) {
                // Already offline or shouldn't go offline, fail.
                throw error;
            }

            // Go offline.
            this.offline = true;
            options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

            response = await AddonModFeedback.getPageItemsWithValues(this.feedback!.id, page, options);
        }

        this.hasPrevPage = !!response.hasprevpage;
        this.hasNextPage = !!response.hasnextpage;

        return response;
    }

    /**
     * Function to allow page navigation through the questions form.
     *
     * @param goPrevious If true it will go back to the previous page, if false, it will go forward.
     * @return Resolved when done.
     */
    async gotoPage(goPrevious: boolean): Promise<void> {
        this.content?.scrollToTop();
        this.feedbackLoaded = false;

        const responses = AddonModFeedbackHelper.getPageItemsResponses(this.items);
        const formHasErrors = this.items.some((item) => item.isEmpty || item.hasError);

        try {
            // Sync other pages first.
            await CoreUtils.ignoreErrors(AddonModFeedbackSync.syncFeedback(this.feedback!.id));

            const response = await AddonModFeedback.processPage(this.feedback!.id, this.currentPage!, responses, {
                goPrevious,
                formHasErrors,
                courseId: this.courseId,
                cmId: this.cmId,
            });

            if (response.completed) {
                // Form is completed, show completion message and buttons.
                this.items = [];
                this.completed = true;
                this.completedOffline = !!response.offline;
                this.completionPageContents = response.completionpagecontents;
                this.siteAfterSubmit = response.siteaftersubmit;

                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'feedback' });

                // Invalidate access information so user will see home page updated (continue form or completion messages).
                await Promise.all([
                    AddonModFeedback.invalidateFeedbackAccessInformationData(this.feedback!.id),
                    AddonModFeedback.invalidateResumePageData(this.feedback!.id),
                ]);

                // If form has been submitted, the info has been already invalidated but we should update index view.
                CoreEvents.trigger(AddonModFeedbackProvider.FORM_SUBMITTED, {
                    feedbackId: this.feedback!.id,
                    tab: 'overview',
                    offline: this.completedOffline,
                });

                await this.fetchAccessData({
                    cmId: this.cmId,
                    readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
                    siteId: this.currentSite.getId(),
                });
            } else if (typeof response.jumpto != 'number' || response.jumpto == this.currentPage) {
                // Errors on questions, stay in page.
            } else {
                // Invalidate access information so user will see home page updated (continue form).
                await AddonModFeedback.invalidateResumePageData(this.feedback!.id);

                CoreEvents.trigger(AddonModFeedbackProvider.FORM_SUBMITTED, {
                    feedbackId: this.feedback!.id,
                    tab: 'overview',
                    offline: this.completedOffline,
                });

                // Fetch the new page.
                await this.fetchFeedbackPageData(response.jumpto);
            }
        } catch (message) {
            CoreDomUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        } finally {
            this.feedbackLoaded = true;
        }
    }

    /**
     * Function to link implemented features.
     */
    showAnalysis(): void {
        if (this.fromIndex) {
            // Previous page is the index page, go back.
            CoreEvents.trigger(AddonModFeedbackProvider.FORM_SUBMITTED, {
                feedbackId: this.feedback!.id,
                tab: 'analysis',
                offline: this.completedOffline,
            });

            CoreNavigator.back();

            return;
        }

        CoreNavigator.navigateToSitePath(AddonModFeedbackModuleHandlerService.PAGE_NAME + `/${this.courseId}/${this.cmId}`, {
            params: {
                module: this.module,
                tab: 'analysis',
            },
        });
    }

    /**
     * Function to go to the page after submit.
     */
    async continue(): Promise<void> {
        if (!this.siteAfterSubmit) {
            return CoreCourseHelper.getAndOpenCourse(this.courseId, {}, this.currentSite.getId());
        }

        const modal = await CoreDomUtils.showModalLoading();

        try {
            const treated = await CoreContentLinksHelper.handleLink(this.siteAfterSubmit);

            if (!treated) {
                await this.currentSite.openInBrowserWithAutoLoginIfSameSite(this.siteAfterSubmit);
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver.unsubscribe();
    }

}
