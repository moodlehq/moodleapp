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

import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, ElementRef, Input, OnInit } from '@angular/core';

import { CoreQuestionQuestionParsed } from '@features/question/services/question';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { ModalController } from '@singletons';
import { CoreDom } from '@singletons/dom';

/**
 * Modal that renders the quiz navigation.
 */
@Component({
    selector: 'addon-mod-quiz-navigation-modal',
    templateUrl: 'navigation-modal.html',
    styleUrl: 'navigation-modal.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModQuizNavigationModalComponent implements OnInit {

    @Input() navigation?: AddonModQuizNavigationQuestion[]; // Whether the user is reviewing the attempt.
    @Input({ transform: toBoolean }) summaryShown = false; // Whether summary is currently being shown.
    @Input() nextPage?: number; // Next page.
    @Input() currentPage?: number; // Current page.
    @Input({ transform: toBoolean }) isReview = false; // Whether the user is reviewing the attempt.
    @Input({ transform: toBoolean }) isSequential = false; // Whether quiz navigation is sequential.

    correctIcon = '';
    incorrectIcon = '';
    partialCorrectIcon = '';

    constructor(protected elementRef: ElementRef) {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.correctIcon = CoreQuestionHelper.getCorrectIcon().fullName;
        this.incorrectIcon = CoreQuestionHelper.getIncorrectIcon().fullName;
        this.partialCorrectIcon = CoreQuestionHelper.getPartiallyCorrectIcon().fullName;

        await CoreDom.scrollToElement(
            this.elementRef.nativeElement,
            'ion-item[aria-current="page"]',
        );
    }

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
            page,
            slot,
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
    page: number;
    slot?: number;
};
