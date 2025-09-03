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

import { AfterViewInit, Component, OnDestroy, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGroupInfo } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { AddonModFeedbackAttemptItem, AddonModFeedbackAttemptsSource } from '../../classes/feedback-attempts-source';
import { AddonModFeedbackWSAnonAttempt, AddonModFeedbackWSAttempt } from '../../services/feedback';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays feedback attempts.
 */
@Component({
    selector: 'page-addon-mod-feedback-attempts',
    templateUrl: 'attempts.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModFeedbackAttemptsPage implements AfterViewInit, OnDestroy {

    readonly splitView = viewChild.required(CoreSplitViewComponent);

    promisedAttempts: CorePromisedValue<AddonModFeedbackAttemptsManager>;
    fetchFailed = false;
    courseId?: number;

    protected logView: () => void;
    protected route = inject(ActivatedRoute);

    constructor() {
        this.promisedAttempts = new CorePromisedValue();

        this.logView = CoreTime.once(() => {
            const source = this.attempts?.getSource();
            if (!source || !source.feedback) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'mod_feedback_get_responses_analysis',
                name: source.feedback.name,
                data: { feedbackid: source.feedback.id, category: 'feedback' },
                url: `/mod/feedback/show_entries.php?id=${source.cmId}`,
            });
        });
    }

    get attempts(): AddonModFeedbackAttemptsManager | null {
        return this.promisedAttempts.value;
    }

    get groupInfo(): CoreGroupInfo | undefined {
        return this.attempts?.getSource().groupInfo;
    }

    get selectedGroup(): number | undefined {
        return this.attempts?.getSource().selectedGroup;
    }

    set selectedGroup(group: number | undefined) {
        if (!this.attempts) {
            return;
        }

        this.attempts.getSource().selectedGroup = group;
        this.attempts.getSource().setDirty(true);
    }

    get identifiableAttempts(): AddonModFeedbackWSAttempt[] {
        return this.attempts?.getSource().identifiable ?? [];
    }

    get identifiableAttemptsTotal(): number {
        return this.attempts?.getSource().identifiableTotal ?? 0;
    }

    get anonymousAttempts(): AddonModFeedbackWSAnonAttempt[] {
        return this.attempts?.getSource().anonymous ?? [];
    }

    get anonymousAttemptsTotal(): number {
        return this.attempts?.getSource().anonymousTotal ?? 0;
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonModFeedbackAttemptsSource,
                [this.courseId, cmId],
            );

            source.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;

            this.promisedAttempts.resolve(new AddonModFeedbackAttemptsManager(source, this.route.component));
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        const attempts = await this.promisedAttempts;

        try {
            this.fetchFailed = false;

            await attempts.getSource().loadFeedback();
            await attempts.load();

            this.logView();
        } catch (error) {
            this.fetchFailed = true;

            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        }

        await attempts.start(this.splitView());
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.attempts?.destroy();
    }

    /**
     * Fetch more attempts, if any.
     *
     * @param infiniteComplete Complete callback for infinite loader.
     */
    async fetchMoreAttempts(infiniteComplete?: () => void): Promise<void> {
        const attempts = await this.promisedAttempts;

        try {
            this.fetchFailed = false;

            await attempts.load();
        } catch (error) {
            this.fetchFailed = true;

            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Refresh the attempts.
     *
     * @param refresher Refresher.
     */
    async refreshFeedback(refresher: HTMLIonRefresherElement): Promise<void> {
        const attempts = await this.promisedAttempts;

        try {
            this.fetchFailed = false;

            await CorePromiseUtils.ignoreErrors(attempts.getSource().invalidateCache());
            await attempts.getSource().loadFeedback();
            await attempts.reload();
        } catch (error) {
            this.fetchFailed = true;

            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            refresher.complete();
        }
    }

    /**
     * Reload attempts list.
     */
    async reloadAttempts(): Promise<void> {
        const attempts = await this.promisedAttempts;

        await attempts.reload();
    }

}

/**
 * Attempts manager.
 */
class AddonModFeedbackAttemptsManager extends CoreListItemsManager<AddonModFeedbackAttemptItem, AddonModFeedbackAttemptsSource> {
}
