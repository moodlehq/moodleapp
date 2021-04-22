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

import { Component, OnInit } from '@angular/core';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import {
    AddonModFeedback,
    AddonModFeedbackProvider,
    AddonModFeedbackWSAnonAttempt,
    AddonModFeedbackWSAttempt,
    AddonModFeedbackWSFeedback,
} from '../../services/feedback';
import { AddonModFeedbackFormItem, AddonModFeedbackHelper } from '../../services/feedback-helper';

/**
 * Page that displays a feedback attempt review.
 */
@Component({
    selector: 'page-addon-mod-feedback-attempt',
    templateUrl: 'attempt.html',
})
export class AddonModFeedbackAttemptPage implements OnInit {

    protected attemptId!: number;

    cmId!: number;
    courseId!: number;
    feedback?: AddonModFeedbackWSFeedback;
    attempt?: AddonModFeedbackWSAttempt;
    anonAttempt?: AddonModFeedbackWSAnonAttempt;
    items: AddonModFeedbackAttemptItem[] = [];
    component = AddonModFeedbackProvider.COMPONENT;
    loaded = false;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.attemptId = CoreNavigator.getRouteNumberParam('attemptId')!;

        this.fetchData();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.cmId);

            const attempt = await AddonModFeedback.getAttempt(this.feedback.id, this.attemptId, { cmId: this.cmId });

            if (this.isAnonAttempt(attempt)) {
                this.anonAttempt = attempt;
                delete this.attempt;
            } else {
                this.attempt = attempt;
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
     */
    isAnonAttempt(attempt: AddonModFeedbackWSAttempt | AddonModFeedbackWSAnonAttempt): attempt is AddonModFeedbackWSAnonAttempt {
        return !('fullname' in attempt);
    }

}

type AddonModFeedbackAttemptItem = AddonModFeedbackFormItem & {
    submittedValue?: string;
};
