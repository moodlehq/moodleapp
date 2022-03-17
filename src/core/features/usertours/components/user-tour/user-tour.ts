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

import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, Output, ViewChild } from '@angular/core';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreUserToursFocusLayout } from '@features/usertours/classes/focus-layout';
import { CoreUserToursPopoverLayout } from '@features/usertours/classes/popover-layout';
import { CoreUserTours, CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { CoreDomUtils } from '@services/utils/dom';
import { AngularFrameworkDelegate } from '@singletons';
import { CoreComponentsRegistry } from '@singletons/components-registry';

const ANIMATION_DURATION = 200;

/**
 * User Tour wrapper component.
 *
 * User Tours content will be rendered within this component according to the configured style.
 */
@Component({
    selector: 'core-user-tours-user-tour',
    templateUrl: 'core-user-tours-user-tour.html',
    styleUrls: ['user-tour.scss'],
})
export class CoreUserToursUserTourComponent implements AfterViewInit {

    @Input() container!: HTMLElement;
    @Input() id!: string;
    @Input() component!: unknown;
    @Input() componentProps?: Record<string, unknown>;
    @Input() focus?: HTMLElement;
    @Input() side?: CoreUserToursSide;
    @Input() alignment?: CoreUserToursAlignment;
    @Output() beforeDismiss = new EventEmitter<void>();
    @Output() afterDismiss = new EventEmitter<void>();
    @HostBinding('class.is-active') active = false;
    @HostBinding('class.is-popover') popover = false;
    @ViewChild('wrapper') wrapper?: ElementRef<HTMLElement>;

    focusStyles?: string;
    popoverWrapperStyles?: string;
    popoverWrapperArrowStyles?: string;
    private element: HTMLElement;
    private wrapperTransform = '';
    private wrapperElement = new CorePromisedValue<HTMLElement>();

    constructor({ nativeElement: element }: ElementRef<HTMLElement>) {
        this.element = element;

        CoreComponentsRegistry.register(element, this);
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (!this.wrapper) {
            return;
        }

        this.wrapperElement.resolve(this.wrapper.nativeElement);
    }

    /**
     * Present User Tour.
     */
    async present(): Promise<void> {
        // Insert tour component and wait until it's ready.
        const wrapper = await this.wrapperElement;
        const tour = await AngularFrameworkDelegate.attachViewToDom(wrapper, this.component, this.componentProps ?? {});

        await CoreDomUtils.waitForImages(tour);

        // Calculate focus styles or dismiss if the element is gone.
        if (this.focus && !CoreDomUtils.isElementVisible(this.focus)) {
            await this.dismiss(false);

            return;
        }

        this.calculateStyles();

        // Show tour.
        this.active = true;

        await this.playEnterAnimation();
    }

    /**
     * Dismiss User Tour.
     *
     * @param acknowledge Whether to confirm that the user has seen the User Tour.
     */
    async dismiss(acknowledge: boolean = true): Promise<void> {
        this.beforeDismiss.emit();

        await this.playLeaveAnimation();
        await Promise.all<unknown>([
            AngularFrameworkDelegate.removeViewFromDom(this.container, this.element),
            acknowledge && CoreUserTours.acknowledge(this.id),
        ]);

        this.afterDismiss.emit();
    }

    /**
     * Calculate inline styles.
     */
    private calculateStyles(): void {
        if (!this.focus) {
            return;
        }

        // Calculate focus styles.
        const focusLayout = new CoreUserToursFocusLayout(this.focus);

        this.focusStyles = focusLayout.inlineStyles;

        // Calculate popup styles.
        if (!this.side || !this.alignment) {
            throw new Error('Cannot create a focused user tour without side and alignment');
        }

        const popoverLayout = new CoreUserToursPopoverLayout(this.focus, this.side, this.alignment);

        this.popover = true;
        this.popoverWrapperStyles = popoverLayout.wrapperInlineStyles;
        this.popoverWrapperArrowStyles = popoverLayout.wrapperArrowInlineStyles;
        this.wrapperTransform = `${popoverLayout.wrapperStyles.transform ?? ''}`;
    }

    /**
     * Play animation to show that the User Tour has started.
     */
    private async playEnterAnimation(): Promise<void> {
        const animations = [
            this.element.animate({ opacity: ['0', '1'] }, { duration: ANIMATION_DURATION }),
            this.wrapperElement.value?.animate(
                { transform: [`scale(1.2) ${this.wrapperTransform}`, `scale(1) ${this.wrapperTransform}`] },
                { duration: ANIMATION_DURATION },
            ),
        ];

        await Promise.all(animations.map(animation => animation?.finished));
    }

    /**
     * Play animation to show that the User Tour has endd.
     */
    private async playLeaveAnimation(): Promise<void> {
        const animations = [
            this.element.animate({ opacity: ['1', '0'] }, { duration: ANIMATION_DURATION }),
            this.wrapperElement.value?.animate(
                { transform: [`scale(1) ${this.wrapperTransform}`, `scale(1.2) ${this.wrapperTransform}`] },
                { duration: ANIMATION_DURATION },
            ),
        ];

        await Promise.all(animations.map(animation => animation?.finished));
    }

}
