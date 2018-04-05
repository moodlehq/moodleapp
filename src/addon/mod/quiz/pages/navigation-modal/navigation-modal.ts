// (C) Copyright 2015 Martin Dougiamas
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
import { IonicPage, ViewController, NavParams } from 'ionic-angular';

/**
 * Modal that renders the quiz navigation.
 */
@IonicPage({ segment: 'addon-mod-quiz-navigation-modal' })
@Component({
    selector: 'page-addon-mod-quiz-navigation-modal',
    templateUrl: 'navigation-modal.html',
})
export class AddonModQuizNavigationModalPage {

    /**
     * The instance of the page that opened the modal. We use the instance instead of the needed attributes for these reasons:
     *     - Some attributes can change dynamically, and we don't want to create the modal everytime the user opens it.
     *     - The onDidDismiss function takes a while to be called, making the app seem slow. This way we can directly call
     *       the functions we need without having to wait for the modal to be dismissed.
     * @type {any}
     */
    pageInstance: any;

    isReview: boolean; // Whether the user is reviewing the attempt.

    constructor(params: NavParams, protected viewCtrl: ViewController) {
        this.isReview = !!params.get('isReview');
        this.pageInstance = params.get('page');
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Load a certain page.
     *
     * @param {number} page The page to load.
     * @param {number} [slot] Slot of the question to scroll to.
     */
    loadPage(page: number, slot: number): void {
        this.pageInstance.changePage && this.pageInstance.changePage(page, true, slot);
        this.closeModal();
    }

    /**
     * Switch mode in review.
     */
    switchMode(): void {
        this.pageInstance.switchMode && this.pageInstance.switchMode();
        this.closeModal();
    }
}
