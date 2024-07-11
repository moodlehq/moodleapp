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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { AddonModFeedbackAttemptsSource } from '../../classes/feedback-attempts-source';
import {
    AddonModFeedback,
    AddonModFeedbackWSAnonAttempt,
    AddonModFeedbackWSFeedback,
} from '../../services/feedback';
import { AddonModFeedbackAttempt, AddonModFeedbackFormItem, AddonModFeedbackHelper } from '../../services/feedback-helper';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_FEEDBACK_COMPONENT } from '../../constants';

/**
 * Page that displays a feedback attempt review.
 */
@Component({
    selector: 'page-addon-mod-feedback-attempt',
    templateUrl: 'attempt.html',
})
export class AddonModFeedbackAttemptPage implements OnInit, OnDestroy {

    cmId: number;
    courseId: number;
    feedback?: AddonModFeedbackWSFeedback;
    attempt?: AddonModFeedbackAttempt;
    attempts: AddonModFeedbackAttemptsSwipeManager;
    anonAttempt?: AddonModFeedbackWSAnonAttempt;
    items: AddonModFeedbackAttemptItem[] = [];
    component = ADDON_MOD_FEEDBACK_COMPONENT;
    loaded = false;

    protected attemptId: number;
    protected groupId?: number;
    protected logView: () => void;

    constructor() {
        this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
        this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
        this.attemptId = CoreNavigator.getRequiredRouteNumberParam('attemptId');
        this.groupId = CoreNavigator.getRouteNumberParam('groupId');

        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
            AddonModFeedbackAttemptsSource,
            [this.courseId, this.cmId],
        );

        this.attempts = new AddonModFeedbackAttemptsSwipeManager(source);

        this.logView = CoreTime.once(() => {
            if (!this.feedback) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_feedback_get_responses_analysis',
                name: this.feedback.name,
                data: { id: this.attemptId, feedbackid: this.feedback.id, category: 'feedback' },
                url: `/mod/feedback/show_entries.php?id=${this.cmId}` +
                    (this.attempt ? `userid=${this.attempt.userid}` : '' ) + `&showcompleted=${this.attemptId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.attempts.start();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.fetchData();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.attempts.destroy();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.cmId);

            const attempt = await AddonModFeedback.getAttempt(this.feedback.id, this.attemptId, {
                cmId: this.cmId,
                groupId: this.groupId,
            });

            if (this.isAnonAttempt(attempt)) {
                this.anonAttempt = attempt;
                delete this.attempt;
            } else {
                this.attempt = (await AddonModFeedbackHelper.addImageProfile([attempt]))[0];
                delete this.anonAttempt;
            }

            const items = await AddonModFeedback.getItems(this.feedback.id, { cmId: this.cmId });

            // Add responses and format items.
            this.items = <AddonModFeedbackAttemptItem[]> items.items.map((item) => {
                const formItem = AddonModFeedbackHelper.getItemForm(item, true);
                if (!formItem) {
                    return;
                }

                const attemptItem = <AddonModFeedbackAttemptItem> formItem;

                if (item.typ == 'label') {
                    attemptItem.submittedValue = CoreTextUtils.replacePluginfileUrls(item.presentation, item.itemfiles);
                } else {
                    for (const x in attempt.responses) {
                        if (attempt.responses[x].id == item.id) {
                            attemptItem.submittedValue = attempt.responses[x].printval;
                            break;
                        }
                    }
                }

                return attemptItem;
            }).filter((itemData) => itemData); // Filter items with errors.

            this.logView();
        } catch (message) {
            // Some call failed on fetch, go back.
            CoreDomUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            CoreNavigator.back();
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Check if an attempt is anonymous or not.
     *
     * @param attempt Attempt to check.
     * @returns If attempt is anonymous.
     */
    isAnonAttempt(attempt: AddonModFeedbackAttempt | AddonModFeedbackWSAnonAttempt): attempt is AddonModFeedbackWSAnonAttempt {
        return !('fullname' in attempt);
    }

}

type AddonModFeedbackAttemptItem = AddonModFeedbackFormItem & {
    submittedValue?: string;
};

/**
 * Helper to manage swiping within a collection of discussions.
 */
class AddonModFeedbackAttemptsSwipeManager extends CoreSwipeNavigationItemsManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        return CoreNavigator.getRouteParams(route).attemptId;
    }

}
