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

import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Directive to move ion-fab components as direct children of the nearest ion-content.
 *
 * Example usage:
 *
 * <ion-fab core-fab>
 */
@Directive({
    selector: 'ion-fab[core-fab]',
})
export class CoreFabDirective implements OnInit, OnDestroy {

    protected element: HTMLElement;
    protected content?: HTMLIonContentElement | null;
    protected initialPaddingBottom = 0;
    protected domPromise?: CoreCancellablePromise<void>;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
        this.element.setAttribute('slot', 'fixed');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.domPromise = CoreDomUtils.waitToBeInDOM(this.element);
        await this.domPromise;

        this.content = this.element.closest('ion-content');

        if (!this.content) {
            return;
        }

        // Add space at the bottom to let the user see the whole content.
        this.initialPaddingBottom = parseFloat(this.content.style.getPropertyValue('--padding-bottom') || '0');

        await this.calculatePlace();

        CoreDomUtils.onElementSlot(this.element, () => {
            this.calculatePlace();
        });
    }

    /**
     * Calculate the height of the footer.
     */
    protected async calculatePlace(): Promise<void> {
        if (!this.content) {
            return;
        }

        const initialHeight = this.element.getBoundingClientRect().height || 56;

        // Move element to the nearest ion-content if it's not the parent
        if (this.element.parentElement?.nodeName != 'ION-CONTENT') {
            this.content.appendChild(this.element);
        }

        this.content.style.setProperty('--padding-bottom', this.initialPaddingBottom + initialHeight + 'px');
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        if (this.content) {
            this.content.style.setProperty('--padding-bottom', this.initialPaddingBottom + 'px');
        }
        this.domPromise?.cancel();
    }

}
