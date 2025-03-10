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
import { CoreSite } from '@classes/sites/site';
import { CoreCourse, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CanLeave } from '@guards/can-leave';
import { IonContent } from '@ionic/angular';
import { CoreNetwork } from '@services/network';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@singletons/utils';
import { NgZone, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import {
    AddonModFeedback,
    AddonModFeedbackGetFeedbackAccessInformationWSResponse,
    AddonModFeedbackPageItems,
    AddonModFeedbackResponseValue,
    AddonModFeedbackWSFeedback,
} from '../../services/feedback';
import { AddonModFeedbackFormItem, AddonModFeedbackHelper } from '../../services/feedback-helper';
import { AddonModFeedbackSync } from '../../services/feedback-sync';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_FEEDBACK_COMPONENT_LEGACY,
    ADDON_MOD_FEEDBACK_FORM_SUBMITTED,
    ADDON_MOD_FEEDBACK_PAGE_NAME,
    AddonModFeedbackIndexTabName,
} from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreError } from '@classes/errors/error';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreObject } from '@singletons/object';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays feedback form.
 */
@Component({
    selector: 'page-addon-mod-feedback-form',
    templateUrl: 'form.html',
    styleUrl: 'form.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModFeedbackFormPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild(IonContent) content?: IonContent;

    protected module?: CoreCourseModuleData;
    protected currentPage?: number;
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
    component = ADDON_MOD_FEEDBACK_COMPONENT_LEGACY;
    offline = false;
    feedbackLoaded = false;
    access?: AddonModFeedbackGetFeedbackAccessInformationWSResponse;
    items: AddonModFeedbackFormItem[] = [];
    hasPrevPage = false;
    hasNextPage = false;
    completed = false;
    completedOffline = false;
    siteAfterSubmit?: string;

    constructor() {
        this.currentSite = CoreSites.getRequiredCurrentSite();

        // Refresh online status when changes.
        this.onlineObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.offline = !CoreNetwork.isOnline();
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.currentPage = CoreNavigator.getRouteNumberParam('page');
            this.title = CoreNavigator.getRouteParam('title');
            this.preview = !!CoreNavigator.getRouteBooleanParam('preview');
            this.fromIndex = !!CoreNavigator.getRouteBooleanParam('fromIndex');
        } catch (error) {
            CoreAlerts.showError(error);

            CoreNavigator.back();

            return;
        }

        await this.fetchData();

        if (!this.access || this.access.isempty && (!this.access.canedititems && !this.access.canviewreports)) {
            CoreAlerts.showError(Translate.instant('core.nopermissiontoaccesspage'));

            CoreNavigator.back();

            return;
        }

        if (!this.feedback || !this.module) {
            return;
        }

        try {
            await AddonModFeedback.logView(this.feedback.id, true);

            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
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
                if (!CoreObject.basicLeftCompare(responses, this.originalData, 3)) {
                    await CoreAlerts.confirmLeaveWithChanges();
                }
            }
        }

        return true;
    }

    /**
     * Fetch all the data required for the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.module = await CoreCourse.getModule(this.cmId, this.courseId, undefined, true, false, this.currentSite.getId());

            this.offline = !CoreNetwork.isOnline();
            const options = {
                cmId: this.cmId,
                readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId: this.currentSite.getId(),
            };

            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.cmId);

            this.title = this.feedback.name || this.title;

            await this.fetchAccessData(options);

            let page = 0;

            if (!this.preview && this.access?.cansubmit && !this.access?.isempty) {
                page = this.currentPage ?? await this.fetchResumePage(options);
            } else {
                this.preview = true;
            }

            await this.fetchFeedbackPageData(page);
        } catch (message) {
            CoreAlerts.showError(message, { default: Translate.instant('core.course.errorgetmodule') });
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
     */
    protected async fetchAccessData(options: CoreCourseCommonModWSOptions): Promise<void> {
        if (!this.feedback) {
            return;
        }

        try {
            this.access = await AddonModFeedback.getFeedbackAccessInformation(this.feedback.id, options);
        } catch (error) {
            if (this.offline || CoreWSError.isWebServiceError(error)) {
                // Already offline or shouldn't go offline, fail.
                throw error;
            }

            // If it fails, go offline.
            this.offline = true;
            options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

            this.access = await AddonModFeedback.getFeedbackAccessInformation(this.feedback.id, options);
        }
    }

    /**
     * Get resume page from WS.
     *
     * @param options Options.
     * @returns Promise resolved with the page to resume.
     */
    protected async fetchResumePage(options: CoreCourseCommonModWSOptions): Promise<number> {
        if (!this.feedback) {
            throw new CoreError('Cannot fetch resume page: missing feedback');
        }

        try {
            return await AddonModFeedback.getResumePage(this.feedback.id, options);
        } catch (error) {
            if (this.offline || CoreWSError.isWebServiceError(error)) {
                // Already offline or shouldn't go offline, fail.
                throw error;
            }

            // Go offline.
            this.offline = true;
            options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

            return AddonModFeedback.getResumePage(this.feedback.id, options);
        }
    }

    /**
     * Fetch page data.
     *
     * @param page Page to load.
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

        this.analyticsLogEvent();
    }

    /**
     * Fetch page items.
     *
     * @param page Page to get.
     * @returns Promise resolved with WS response.
     */
    protected async fetchPageItems(page: number): Promise<AddonModFeedbackPageItems> {
        if (!this.feedback) {
            throw new CoreError('Cannot fetch page items: missing feedback');
        }

        const options = {
            cmId: this.cmId,
            readingStrategy: this.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId: this.currentSite.getId(),
        };

        if (this.preview) {
            const response = await AddonModFeedback.getItems(this.feedback.id, options);

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
            response = await AddonModFeedback.getPageItemsWithValues(this.feedback.id, page, options);
        } catch (error) {
            if (this.offline || CoreWSError.isWebServiceError(error)) {
                // Already offline or shouldn't go offline, fail.
                throw error;
            }

            // Go offline.
            this.offline = true;
            options.readingStrategy = CoreSitesReadingStrategy.PREFER_CACHE;

            response = await AddonModFeedback.getPageItemsWithValues(this.feedback.id, page, options);
        }

        this.hasPrevPage = !!response.hasprevpage;
        this.hasNextPage = !!response.hasnextpage;

        return response;
    }

    /**
     * Function to allow page navigation through the questions form.
     *
     * @param goPrevious If true it will go back to the previous page, if false, it will go forward.
     */
    async gotoPage(goPrevious: boolean): Promise<void> {
        if (!this.feedback || this.currentPage === undefined) {
            return;
        }

        this.content?.scrollToTop();
        this.feedbackLoaded = false;

        const responses = AddonModFeedbackHelper.getPageItemsResponses(this.items);
        const formHasErrors = this.items.some((item) => item.isEmpty || item.hasError);

        try {
            // Sync other pages first.
            await CorePromiseUtils.ignoreErrors(AddonModFeedbackSync.syncFeedback(this.feedback.id));

            const response = await AddonModFeedback.processPage(this.feedback.id, this.currentPage, responses, {
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
                    AddonModFeedback.invalidateFeedbackAccessInformationData(this.feedback.id),
                    AddonModFeedback.invalidateResumePageData(this.feedback.id),
                ]);

                // If form has been submitted, the info has been already invalidated but we should update index view.
                CoreEvents.trigger(ADDON_MOD_FEEDBACK_FORM_SUBMITTED, {
                    feedbackId: this.feedback.id,
                    tab: AddonModFeedbackIndexTabName.OVERVIEW,
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
                await AddonModFeedback.invalidateResumePageData(this.feedback.id);

                CoreEvents.trigger(ADDON_MOD_FEEDBACK_FORM_SUBMITTED, {
                    feedbackId: this.feedback.id,
                    tab: AddonModFeedbackIndexTabName.OVERVIEW,
                    offline: this.completedOffline,
                });

                // Fetch the new page.
                await this.fetchFeedbackPageData(response.jumpto);
            }
        } catch (message) {
            CoreAlerts.showError(message, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            this.feedbackLoaded = true;
        }
    }

    /**
     * Function to link implemented features.
     */
    showAnalysis(): void {
        if (!this.feedback) {
            return;
        }

        if (this.fromIndex) {
            // Previous page is the index page, go back.
            CoreEvents.trigger(ADDON_MOD_FEEDBACK_FORM_SUBMITTED, {
                feedbackId: this.feedback.id,
                tab: AddonModFeedbackIndexTabName.ANALYSIS,
                offline: this.completedOffline,
            });

            CoreNavigator.back();

            return;
        }

        CoreNavigator.navigateToSitePath(ADDON_MOD_FEEDBACK_PAGE_NAME + `/${this.courseId}/${this.cmId}`, {
            params: {
                module: this.module,
                tab: AddonModFeedbackIndexTabName.ANALYSIS,
            },
        });
    }

    /**
     * Function to go to the page after submit.
     *
     * @returns Promise resolved when done.
     */
    async continue(): Promise<void> {
        if (!this.siteAfterSubmit) {
            return CoreNavigator.back();
        }

        const modal = await CoreLoadings.show();

        try {
            await CoreSites.visitLink(this.siteAfterSubmit, { siteId: this.currentSite.id });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Log event in analytics.
     */
    protected analyticsLogEvent(): void {
        if (!this.feedback) {
            return;
        }

        if (this.preview) {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_feedback_get_items',
                name: this.feedback.name,
                data: { id: this.feedback.id, category: 'feedback' },
                url: `/mod/feedback/print.php?id=${this.cmId}&courseid=${this.courseId}`,
            });

            return;
        }

        let url = '/mod/feedback/complete.php';
        if (!this.completed) {
            url += `?id=${this.cmId}` + (this.currentPage ? `&gopage=${this.currentPage}` : '') + `&courseid=${this.courseId}`;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: this.completed ? 'mod_feedback_get_feedback_access_information' : 'mod_feedback_get_page_items',
            name: this.feedback.name,
            data: { id: this.feedback.id, category: 'feedback', page: this.currentPage },
            url,
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.onlineObserver.unsubscribe();
    }

}
