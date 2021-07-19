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

import { Component, Input } from '@angular/core';

import { CoreQuestionQuestionParsed } from '@features/question/services/question';
import { ModalController } from '@singletons';

/**
 * Modal that renders the quiz navigation.
 */
@Component({
    selector: 'addon-mod-quiz-navigation-modal',
    templateUrl: 'navigation-modal.html',
})
export class AddonModQuizNavigationModalComponent {

    static readonly CHANGE_PAGE = 1;
    static readonly SWITCH_MODE = 2;

    @Input() navigation?: AddonModQuizNavigationQuestion[]; // Whether the user is reviewing the attempt.
    @Input() summaryShown?: boolean; // Whether summary is currently being shown.
    @Input() currentPage?: number; // Current page.
    @Input() isReview?: boolean; // Whether the user is reviewing the attempt.
    @Input() numPages = 0; // Num of pages for review mode.
    @Input() showAll?: boolean; // Whether to show all questions in same page or not for review mode.

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Load a certain page.
     *
     * @param page The page to load.
     * @param slot Slot of the question to scroll to.
     */
    loadPage(page: number, slot?: number): void {
        ModalController.dismiss(<AddonModQuizNavigationModalReturn>{
            action: AddonModQuizNavigationModalComponent.CHANGE_PAGE,
            page,
            slot,
        });
    }

    /**
     * Switch mode in review.
     */
    switchMode(): void {
        ModalController.dismiss(<AddonModQuizNavigationModalReturn>{
            action: AddonModQuizNavigationModalComponent.SWITCH_MODE,
        });
    }

}

/**
 * Question for the navigation menu with some calculated data.
 */
export type AddonModQuizNavigationQuestion = CoreQuestionQuestionParsed & {
    stateClass?: string;
};

export type AddonModQuizNavigationModalReturn = {
    action: number;
    page?: number;
    slot?: number;
};
