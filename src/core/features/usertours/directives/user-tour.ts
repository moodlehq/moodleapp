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

import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreUserTours, CoreUserToursFocusedOptions, CoreUserToursUserTour } from '@features/usertours/services/user-tours';
import { CoreDom } from '@static/dom';

/**
 * Directive to control a User Tour linked to the lifecycle of the element where it's defined.
 */
@Directive({
    selector: '[userTour]',
})
export class CoreUserTourDirective implements OnInit, OnDestroy {

    readonly userTour = input.required<CoreUserTourDirectiveOptions>();

    private tour?: CoreUserToursUserTour | null;
    private element: HTMLElement = inject(ElementRef).nativeElement;
    protected visiblePromise?: CoreCancellablePromise<void>;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.visiblePromise = CoreDom.waitToBeInViewport(this.element);

        await this.visiblePromise;

        const { getFocusedElement, ...options } = this.userTour();

        this.tour = await CoreUserTours.showIfPending({
            ...options,
            focus: getFocusedElement?.(this.element) ?? this.element,
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.tour?.cancel();
        this.visiblePromise?.cancel();
    }

}

/**
 * User Tour options to control with this directive.
 */
export type CoreUserTourDirectiveOptions = Omit<CoreUserToursFocusedOptions, 'focus'> & {

    /**
     * Getter to obtain element to focus in the User Tour. If this isn't provided, the element where the
     * directive is defined will be used.
     *
     * @param element Element where the directive is defined.
     */
    getFocusedElement?(element: HTMLElement): HTMLElement;

};
