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

import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import {
    AddonModFeedback,
    AddonModFeedbackProvider,
    AddonModFeedbackWSAnonAttempt,
    AddonModFeedbackWSAttempt,
    AddonModFeedbackWSFeedback,
} from '../services/feedback';
import { AddonModFeedbackHelper } from '../services/feedback-helper';
import { Params } from '@angular/router';

/**
 * Feedback attempts.
 */
export class AddonModFeedbackAttemptsSource extends CoreRoutedItemsManagerSource<AddonModFeedbackAttemptItem> {

    readonly COURSE_ID: number;
    readonly CM_ID: number;

    selectedGroup?: number;
    identifiable?: AddonModFeedbackWSAttempt[];
    identifiableTotal?: number;
    anonymous?: AddonModFeedbackWSAnonAttempt[];
    anonymousTotal?: number;
    groupInfo?: CoreGroupInfo;
    feedback?: AddonModFeedbackWSFeedback;

    constructor(courseId: number, cmId: number) {
        super();

        this.COURSE_ID = courseId;
        this.CM_ID = cmId;
    }

    /**
     * @inheritdoc
     */
    getItemPath(attempt: AddonModFeedbackAttemptItem): string {
        return attempt.id.toString();
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        return {
            groupId: this.selectedGroup,
        };
    }

    /**
     * @inheritdoc
     */
    getPagesLoaded(): number {
        if (!this.identifiable || !this.anonymous) {
            return 0;
        }

        const pageLength = this.getPageLength();

        return Math.ceil(Math.max(this.anonymous.length, this.identifiable.length) / pageLength);
    }

    /**
     * Type guard to infer AddonModFeedbackWSAttempt objects.
     *
     * @param attempt Attempt to check.
     * @returns Whether the item is an identifieable attempt.
     */
    isIdentifiableAttempt(attempt: AddonModFeedbackAttemptItem): attempt is AddonModFeedbackWSAttempt {
        return 'fullname' in attempt;
    }

    /**
     * Type guard to infer AddonModFeedbackWSAnonAttempt objects.
     *
     * @param attempt Attempt to check.
     * @returns Whether the item is an anonymous attempt.
     */
    isAnonymousAttempt(attempt: AddonModFeedbackAttemptItem): attempt is AddonModFeedbackWSAnonAttempt {
        return 'number' in attempt;
    }

    /**
     * Invalidate feedback cache.
     */
    async invalidateCache(): Promise<void> {
        await Promise.all([
            CoreGroups.invalidateActivityGroupInfo(this.CM_ID),
            this.feedback && AddonModFeedback.invalidateResponsesAnalysisData(this.feedback.id),
        ]);
    }

    /**
     * Load feedback.
     */
    async loadFeedback(): Promise<void> {
        this.feedback = await AddonModFeedback.getFeedback(this.COURSE_ID, this.CM_ID);
        this.groupInfo = await CoreGroups.getActivityGroupInfo(this.CM_ID);

        this.selectedGroup = CoreGroups.validateGroupId(this.selectedGroup, this.groupInfo);
    }

    /**
     * @inheritdoc
     */
    protected getPageLength(): number {
        return AddonModFeedbackProvider.PER_PAGE;
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{ items: AddonModFeedbackAttemptItem[]; hasMoreItems: boolean }> {
        if (!this.feedback) {
            throw new Error('Can\'t load attempts without feeback');
        }

        const result = await AddonModFeedbackHelper.getResponsesAnalysis(this.feedback.id, {
            page,
            groupId: this.selectedGroup,
            cmId: this.CM_ID,
        });

        if (page === 0) {
            this.identifiableTotal = result.totalattempts;
            this.anonymousTotal = result.totalanonattempts;
        }

        const totalItemsLoaded = this.getPageLength() * (page + 1);
        const pageAttempts: AddonModFeedbackAttemptItem[] = [
            // The page argument is ignored in the webservice when there is only one page,
            // so we should ignore the responses of pages beyond the first if that's the case.
            ...(page === 0 || result.totalattempts > AddonModFeedbackProvider.PER_PAGE)
                ? result.attempts
                : [],
            ...(page === 0 || result.totalanonattempts > AddonModFeedbackProvider.PER_PAGE)
                ? result.anonattempts
                : [],
        ];

        return {
            items: pageAttempts,
            hasMoreItems: result.totalattempts > totalItemsLoaded || result.totalanonattempts > totalItemsLoaded,
        };
    }

    /**
     * @inheritdoc
     */
    protected setItems(attempts: AddonModFeedbackAttemptItem[], hasMoreItems: boolean): void {
        this.identifiable = attempts.filter(this.isIdentifiableAttempt);
        this.anonymous = attempts.filter(this.isAnonymousAttempt);

        super.setItems((this.identifiable as AddonModFeedbackAttemptItem[]).concat(this.anonymous), hasMoreItems);
    }

}

/**
 * Type of items that can be held in the source.
 */
export type AddonModFeedbackAttemptItem = AddonModFeedbackWSAttempt | AddonModFeedbackWSAnonAttempt;
