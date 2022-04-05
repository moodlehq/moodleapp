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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { IonRefresher } from '@ionic/angular';
import { CoreGroupInfo } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { AddonModFeedbackAttemptItem, AddonModFeedbackAttemptsSource } from '../../classes/feedback-attempts-source';
import { AddonModFeedbackWSAnonAttempt, AddonModFeedbackWSAttempt } from '../../services/feedback';

/**
 * Page that displays feedback attempts.
 */
@Component({
    selector: 'page-addon-mod-feedback-attempts',
    templateUrl: 'attempts.html',
})
export class AddonModFeedbackAttemptsPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    promisedAttempts: CorePromisedValue<AddonModFeedbackAttemptsManager>;
    fetchFailed = false;

    constructor(protected route: ActivatedRoute) {
        this.promisedAttempts = new CorePromisedValue();
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
            const cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonModFeedbackAttemptsSource,
                [courseId, cmId],
            );

            source.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;

            this.promisedAttempts.resolve(new AddonModFeedbackAttemptsManager(source, this.route.component));
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        const attempts = await this.promisedAttempts;

        try {
            this.fetchFailed = false;

            await attempts.getSource().loadFeedback();
            await attempts.load();
        } catch (error) {
            this.fetchFailed = true;

            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }

        await attempts.start(this.splitView);
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

            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Refresh the attempts.
     *
     * @param refresher Refresher.
     */
    async refreshFeedback(refresher: IonRefresher): Promise<void> {
        const attempts = await this.promisedAttempts;

        try {
            this.fetchFailed = false;

            await CoreUtils.ignoreErrors(attempts.getSource().invalidateCache());
            await attempts.getSource().loadFeedback();
            await attempts.reload();
        } catch (error) {
            this.fetchFailed = true;

            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
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
