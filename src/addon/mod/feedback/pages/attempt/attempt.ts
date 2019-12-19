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

import { Component } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { AddonModFeedbackProvider } from '../../providers/feedback';
import { AddonModFeedbackHelperProvider } from '../../providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Page that displays a feedback attempt review.
 */
@IonicPage({ segment: 'addon-mod-feedback-attempt' })
@Component({
    selector: 'page-addon-mod-feedback-attempt',
    templateUrl: 'attempt.html',
})
export class AddonModFeedbackAttemptPage {

    protected feedbackId: number;
    protected courseId: number;

    feedback: any;
    attempt: any;
    items: any;
    componentId: number;
    component = AddonModFeedbackProvider.COMPONENT;
    feedbackLoaded = false;

    constructor(navParams: NavParams, protected feedbackProvider: AddonModFeedbackProvider, protected navCtrl: NavController,
            protected domUtils: CoreDomUtilsProvider, protected feedbackHelper: AddonModFeedbackHelperProvider,
            protected textUtils: CoreTextUtilsProvider) {
        this.feedbackId = navParams.get('feedbackId') || 0;
        this.courseId = navParams.get('courseId');
        this.attempt = navParams.get('attempt') || false;
        this.componentId = navParams.get('moduleId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return Promise resolved when done.
     */
    fetchData(): Promise<any> {
        // Get the feedback to be able to now if questions should be autonumbered.
        return this.feedbackProvider.getFeedbackById(this.courseId, this.feedbackId).then((feedback) => {
            this.feedback = feedback;

            return this.feedbackProvider.getItems(this.feedbackId);
        }).then((items) => {
            // Add responses and format items.
            this.items = items.items.map((item) => {
                if (item.typ == 'label') {
                    item.submittedValue = this.textUtils.replacePluginfileUrls(item.presentation, item.itemfiles);
                } else {
                    for (const x in this.attempt.responses) {
                        if (this.attempt.responses[x].id == item.id) {
                            item.submittedValue = this.attempt.responses[x].printval;
                            break;
                        }
                    }
                }

                return this.feedbackHelper.getItemForm(item, true);
            });

        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            // Some call failed on first fetch, go back.
            this.navCtrl.pop();

            return Promise.reject(null);
        }).finally(() => {
            this.feedbackLoaded = true;
        });
    }
}
