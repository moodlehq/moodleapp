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

import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Directive to observe mutations on some attributes and propagate them inside.
 * Current supported attributes: ion-button.aria-label
 *
 * This is necessary in order to update some attributes that are not reactive, for example aria-label.
 *
 * @see https://github.com/ionic-team/ionic-framework/issues/20127
 */
@Directive({
    selector: 'ion-button',
})
export class CoreUpdateNonReactiveAttributesDirective implements OnInit, OnDestroy {

    protected mutationObserver: MutationObserver;
    protected element: HTMLIonButtonElement = inject(ElementRef).nativeElement;

    constructor() {
        this.mutationObserver = new MutationObserver(() => {
            const button = this.element.shadowRoot?.querySelector('button');

            if (!button) {
                return;
            }

            // Propagate label to button.
            const ariaLabel = this.element.getAttribute('aria-label');

            if (ariaLabel) {
                button.setAttribute('aria-label', ariaLabel);
            } else {
                button.removeAttribute('aria-label');
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if ('componentOnReady' in this.element) {
            // This may be necessary if this is somehow called but Ionic's directives arent. This happens, for example,
            // in some tests such as the credentials page.
            await this.element.componentOnReady();
        }

        this.mutationObserver.observe(this.element, { attributes: true, attributeFilter: ['aria-label'] });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.mutationObserver.disconnect();
    }

}
