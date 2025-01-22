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

import { Component, ElementRef } from '@angular/core';
import { AddonModQuizQuestionBasicData, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreDomUtils } from '@services/utils/dom';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Translate } from '@singletons';
import { CoreWait } from '@singletons/wait';
import { CorePlatform } from '@services/platform';

/**
 * Component to render an ordering question.
 */
@Component({
    selector: 'addon-qtype-ordering',
    templateUrl: 'addon-qtype-ordering.html',
    styleUrls: ['../../../../core/features/question/question.scss', 'ordering.scss'],
})
export class AddonQtypeOrderingComponent extends CoreQuestionBaseComponent<AddonQtypeOrderingQuestionData> {

    dragDisabled = false;
    numberingClass = '';
    a11yAnnouncement = '';
    responseInput = {
        name: '',
        value: '',
    };

    constructor(elementRef: ElementRef) {
        super('AddonQtypeOrderingComponent', elementRef);
    }

    /**
     * @inheritdoc
     */
    init(): void {
        if (!this.question) {
            this.onReadyPromise.resolve();

            return;
        }

        const questionElement = this.initComponent();
        if (!questionElement) {
            this.onReadyPromise.resolve();

            return;
        }

        // Replace Moodle's feedback classes with our own.
        CoreQuestionHelper.replaceFeedbackClasses(questionElement);

        // Find the list and its items.
        const listContainer = questionElement.querySelector('.sortablelist');
        if (!listContainer) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.slot);
            this.onReadyPromise.resolve();

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        this.dragDisabled = listContainer.classList.contains('notactive') || !listContainer.querySelector('.sortableitem');
        this.numberingClass = Array.from(listContainer.classList).find(className => className.startsWith('numbering')) ?? '';

        const itemsElements = Array.from(listContainer.querySelectorAll('li'));
        this.question.items = itemsElements.map(element => {
            // Remove correctness icons from the content.
            const itemContentEl = element.querySelector<HTMLElement>('[data-itemcontent]');
            itemContentEl?.querySelector(
                '.icon.fa-check, .icon.fa-remove, .icon.fa-check-square, .icon.fa-circle-check, .icon.fa-xmark, ' +
                '.icon.fa-circle-xmark, .icon.fa-square-check, .icon.circle-half-stroke, img.icon[src*="grade_partiallycorrect"]',
            )?.remove();

            return {
                id: element.id,
                content: itemContentEl?.innerHTML ?? '',
                contentText: itemContentEl?.innerText ?? '',
                correctClass: Array.from(element.classList)
                    .find(className => className.includes('correct') || className.includes('partial')) ?? 'pending',
            };
        });

        // Find the input where the answer is stored.
        const inputEl = questionElement.querySelector<HTMLInputElement>('input[name*="_response_"]');
        if (inputEl) {
            this.responseInput.name = inputEl.name;
            this.responseInput.value = inputEl.value;
        }

        // Re-calculate the text of the question, removing the elements that the app already renders.
        questionElement.querySelector('.ablock')?.remove();
        inputEl?.remove();
        this.question.text = CoreDomUtils.getContentsOfElement(questionElement, '.qtext');
        this.onReadyPromise.resolve();
    }

    /**
     * Reorder items list.
     *
     * @param eventDetail Details of the reorder.
     */
    moveItem(eventDetail: ItemReorderEventDetail): void {
        if (!this.question?.items) {
            return;
        }

        const itemToMove = this.question.items.splice(eventDetail.from, 1)[0];
        this.question.items.splice(eventDetail.to, 0, itemToMove);

        this.responseInput.value = this.question.items.map(item => item.id).join(',');

        this.a11yAnnouncement = Translate.instant('addon.qtype_ordering.moved', {
            $a: {
                item: this.hostElement.querySelector<HTMLElement>(`#${itemToMove.id}-text`)?.innerText ?? itemToMove.id,
                position: eventDetail.to + 1,
                total: this.question.items.length,
            },
        });

        eventDetail.complete();
    }

    /**
     * Move an item to the previous or next position.
     *
     * @param event Event.
     * @param moveNext Whether to move to the next position or the previous position.
     * @param itemId Item ID.
     */
    async moveItemByClick(event: Event, moveNext: boolean, itemId: string): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const target = event.target as HTMLElement;
        if (!target || !this.question?.items) {
            return;
        }

        const initialPosition = this.question.items.findIndex(item => item.id === itemId);
        const endPosition = moveNext ? initialPosition + 1 : initialPosition - 1;
        if (endPosition < 0 || endPosition >= this.question.items.length) {
            // Invalid position.
            return;
        }

        this.moveItem({
            from: initialPosition,
            to: endPosition,
            complete: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
        });

        await CoreWait.nextTick();

        // When moving an item to the first or last position, the button that was clicked will be hidden. In this case, we need to
        // focus the other button. Otherwise, re-focus the same button since the focus is lost in some cases.
        const movedCard = document.querySelector<HTMLElement>(`#${itemId}`);
        let elementToFocus = target;

        if (movedCard && !movedCard.previousElementSibling) {
            elementToFocus = movedCard.querySelector<HTMLElement>('[data-action="move-forward"]') ?? target;
        } else if (movedCard && !movedCard.nextElementSibling) {
            elementToFocus = movedCard.querySelector<HTMLElement>('[data-action="move-backward"]') ?? target;
        }

        CoreDomUtils.focusElement(elementToFocus);

        if (CorePlatform.isIOS()) {
            // In iOS, when the focus is lost VoiceOver automatically focus the element in the same position where the focus was.
            // If that happens, make sure the focus stays in the button we want to focus.
            const reFocus = () => {
                elementToFocus.removeEventListener('blur', reFocus);
                CoreDomUtils.focusElement(elementToFocus);
            };
            elementToFocus.addEventListener('blur', reFocus);
            setTimeout(() => {
                elementToFocus.removeEventListener('blur', reFocus);
            }, 300);
        }
    }

}

/**
 * Data for ordering question.
 */
export type AddonQtypeOrderingQuestionData = AddonModQuizQuestionBasicData & {
    readOnly?: boolean;
    items?: OrderingItem[];
};

type OrderingItem = {
    id: string;
    content: string;
    contentText: string;
    correctClass: string;
};
