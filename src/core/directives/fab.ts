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

import { Directive, ElementRef, OnDestroy } from '@angular/core';
import { IonContent } from '@ionic/angular';

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
export class CoreFabDirective implements OnDestroy {

    protected static readonly PADDINGBOTTOM = 56;

    protected scrollElement?: HTMLElement;
    protected done = false;
    protected element: HTMLElement;

    constructor(el: ElementRef, protected content: IonContent) {
        this.element = el.nativeElement;
        this.asyncInit();
    }

    /**
     * Initialize Component.
     */
    async asyncInit(): Promise<void> {
        if (this.content) {
            this.scrollElement = await this.content.getScrollElement();
            if (!this.done) {
                // Move element to the nearest ion-content if it's not the parent
                if (this.element.parentElement?.nodeName != 'ION-CONTENT') {
                    const ionContent = this.element.closest('ion-content');
                    ionContent?.appendChild(this.element);
                }

                // Add space at the bottom to let the user see the whole content.
                const bottom = parseInt(this.scrollElement.style.paddingBottom, 10) || 0;
                this.scrollElement.style.paddingBottom = (bottom + CoreFabDirective.PADDINGBOTTOM) + 'px';
                this.done = true;
            }
        }
    }

    /**
     * Destroy component.
     */
    ngOnDestroy(): void {
        if (this.done && this.scrollElement) {
            const bottom = parseInt(this.scrollElement.style.paddingBottom, 10) || 0;
            this.scrollElement.style.paddingBottom = (bottom - CoreFabDirective.PADDINGBOTTOM) + 'px';
        }
    }

}
