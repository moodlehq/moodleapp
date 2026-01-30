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

import {
    AddonCourseCompletion,
    AddonCourseCompletionCourseCompletionStatus,
} from '@addons/coursecompletion/services/coursecompletion';
import { Component, computed, OnInit, signal } from '@angular/core';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';
import { CoreTime } from '@static/time';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonCourseCompletionAggregation } from '@addons/coursecompletion/constants';

/**
 * Page that displays the course completion report.
 */
@Component({
    selector: 'page-addon-course-completion-report',
    templateUrl: 'report.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonCourseCompletionReportPage implements OnInit {

    protected readonly aggregationType = AddonCourseCompletionAggregation;
    protected readonly userId = signal(0);
    protected logView!: () => void;

    readonly courseId = signal(0);
    readonly loaded = signal(false);
    readonly completion = signal<AddonCourseCompletionCourseCompletionStatus | undefined>(undefined);

    readonly showSelfComplete = computed(() => {
        const completion = this.completion();
        const userId = this.userId();

        if (!completion) {
            return false;
        }

        return AddonCourseCompletion.canMarkSelfCompleted(userId, completion);
    });

    readonly tracked = signal(true); // Whether completion is tracked.
    readonly statusText = computed(() => {
        const completion = this.completion();
        if (!completion) {
            return '';
        }

        return AddonCourseCompletion.getCompletedStatusText(completion);
    });

    readonly user = signal<CoreUserProfile | undefined>(undefined);

    constructor() {
        this.logView = CoreTime.once(() => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_completion_get_course_completion_status',
                name: Translate.instant('addon.coursecompletion.coursecompletion'),
                data: {
                    course: this.courseId(),
                    user: this.userId(),
                },
                url: `/blocks/completionstatus/details.php?course=${this.courseId}&user=${this.userId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.courseId.set(CoreNavigator.getRequiredRouteNumberParam('courseId'));
            this.userId.set(CoreNavigator.getRouteNumberParam('userId') || CoreSites.getCurrentSiteUserId());
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.fetchCompletion().finally(() => {
            this.loaded.set(true);
        });
    }

    /**
     * Fetch compleiton data.
     */
    protected async fetchCompletion(): Promise<void> {
        try {
            this.user.set(await CoreUser.getProfile(this.userId(), this.courseId(), true));

            this.completion.set(await AddonCourseCompletion.getCompletion(this.courseId(), this.userId()));

            this.tracked.set(true);
            this.logView();
        } catch (error) {
            if (error?.errorcode === 'notenroled') {
                // Not enrolled error, probably a teacher.
                this.tracked.set(false);
            } else {
                CoreAlerts.showError(error, { default: Translate.instant('addon.coursecompletion.couldnotloadreport') });
            }
        }
    }

    /**
     * Refresh completion data on PTR.
     *
     * @param refresher Refresher instance.
     */
    async refreshCompletion(refresher?: HTMLIonRefresherElement): Promise<void> {
        await AddonCourseCompletion.invalidateCourseCompletion(this.courseId(), this.userId()).finally(() => {
            this.fetchCompletion().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Mark course as completed.
     */
    async completeCourse(): Promise<void> {
        try {
            await CoreAlerts.confirm(Translate.instant('addon.coursecompletion.confirmselfcompletion'), {
                okText: Translate.instant('core.yes'),
                cancelText: Translate.instant('core.no'),
            });

            const modal = await CoreLoadings.show('core.sending', true);

            try {
                await AddonCourseCompletion.markCourseAsSelfCompleted(this.courseId());

                await this.refreshCompletion();
            } catch (error) {
                CoreAlerts.showError(error);
            } finally {
                modal.dismiss();
            }
        } catch {
            // User cancelled.
        }
    }

}
