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

import { BackButtonEvent } from '@ionic/core';
import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    HostBinding,
    Input,
    OnDestroy,
    Output,
    ViewChild,
} from '@angular/core';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreUserToursFocusLayout } from '@features/usertours/classes/focus-layout';
import { CoreUserToursPopoverLayout } from '@features/usertours/classes/popover-layout';
import { CoreUserTours, CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { CoreWait } from '@singletons/wait';
import { AngularFrameworkDelegate } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { COLLAPSIBLE_HEADER_UPDATED } from '@directives/collapsible-header';
import { MAIN_MENU_VISIBILITY_UPDATED_EVENT } from '@features/mainmenu/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { BackButtonPriority } from '@/core/constants';

/**
 * User Tour wrapper component.
 *
 * User Tours content will be rendered within this component according to the configured style.
 */
@Component({
    selector: 'core-user-tours-user-tour',
    templateUrl: 'core-user-tours-user-tour.html',
    styleUrl: 'user-tour.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreUserToursUserTourComponent implements AfterViewInit, OnDestroy {

    @Input({ required: true }) container!: HTMLElement;
    @Input({ required: true }) id!: string;
    @Input({ required: true }) component!: unknown;
    @Input() componentProps?: Record<string, unknown>;
    @Input() focus?: HTMLElement;
    @Input() side?: CoreUserToursSide;
    @Input() alignment?: CoreUserToursAlignment;
    @Output() beforeDismiss = new EventEmitter<void>();
    @Output() afterDismiss = new EventEmitter<void>();
    @HostBinding('class.is-active') active = false;
    @HostBinding('class.is-popover') popover = false;
    @HostBinding('class.backdrop') backdrop = true;
    @ViewChild('wrapper') wrapper?: ElementRef<HTMLElement>;

    protected static readonly ANIMATION_DURATION = 200;
    protected static readonly BACKDROP_DISMISS_SAFETY_TRESHOLD = 1000;

    focusStyles?: string;
    popoverWrapperStyles?: string;
    popoverWrapperArrowStyles?: string;
    private element: HTMLElement;
    private tour?: HTMLElement;
    private wrapperTransform = '';
    private wrapperElement = new CorePromisedValue<HTMLElement>();
    private backButtonListener?: (event: BackButtonEvent) => void;
    protected collapsibleHeaderListener?: CoreEventObserver;
    protected mainMenuListener?: CoreEventObserver;
    protected resizeListener?: CoreEventObserver;
    protected scrollListener?: EventListener;
    protected content?: HTMLIonContentElement | null;
    protected lastActivatedTime = 0;

    constructor({ nativeElement: element }: ElementRef<HTMLElement>) {
        this.element = element;

        CoreDirectivesRegistry.register(element, this);

        this.element.addEventListener('click', (event) =>
            this.dismissOnBackOrBackdrop(event.target as HTMLElement));
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
     * Show User Tour.
     */
    async show(): Promise<void> {
        // Insert tour component and wait until it's ready.
        const wrapper = await this.wrapperElement;
        this.tour = await AngularFrameworkDelegate.attachViewToDom(wrapper, this.component, this.componentProps ?? {});

        if (!this.tour) {
            return;
        }

        await CoreWait.waitForImages(this.tour);

        // Calculate focus styles or dismiss if the element is gone.
        if (this.focus && !CoreDom.isElementVisible(this.focus)) {
            await this.dismiss(false);

            return;
        }

        this.calculateStyles();

        this.activate();

        await this.playEnterAnimation();
    }

    /**
     * Hide User Tour temporarily.
     */
    async hide(): Promise<void> {
        const wrapper = await this.wrapperElement;

        await this.playLeaveAnimation();
        await AngularFrameworkDelegate.removeViewFromDom(wrapper, this.tour);

        this.deactivate();
    }

    /**
     * Dismiss User Tour.
     *
     * @param acknowledge Whether to confirm that the user has seen the User Tour.
     */
    async dismiss(acknowledge: boolean = true): Promise<void> {
        this.beforeDismiss.emit();

        if (this.active) {
            await this.playLeaveAnimation();
        }

        await AngularFrameworkDelegate.removeViewFromDom(this.container, this.element);
        this.deactivate();

        acknowledge && await CoreUserTours.acknowledge(this.id);

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
        if (!('animate' in this.element)) {
            // Not supported, don't animate.
            return;
        }

        const animations = [
            this.element.animate({ opacity: ['0', '1'] }, { duration: CoreUserToursUserTourComponent.ANIMATION_DURATION }),
            this.wrapperElement.value?.animate(
                { transform: [`scale(1.2) ${this.wrapperTransform}`, `scale(1) ${this.wrapperTransform}`] },
                { duration: CoreUserToursUserTourComponent.ANIMATION_DURATION },
            ),
        ];

        await Promise.all(animations.map(animation => animation?.finished));
    }

    /**
     * Play animation to show that the User Tour has endd.
     */
    private async playLeaveAnimation(): Promise<void> {
        if (!('animate' in this.element)) {
            // Not supported, don't animate.
            return;
        }

        const animations = [
            this.element.animate({ opacity: ['1', '0'] }, { duration: CoreUserToursUserTourComponent.ANIMATION_DURATION }),
            this.wrapperElement.value?.animate(
                { transform: [`scale(1) ${this.wrapperTransform}`, `scale(1.2) ${this.wrapperTransform}`] },
                { duration: CoreUserToursUserTourComponent.ANIMATION_DURATION },
            ),
        ];

        await Promise.all(animations.map(animation => animation?.finished));
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.deactivate();
    }

    /**
     * Activate tour.
     */
    protected activate(): void {
        if (this.active) {
            return;
        }

        this.active = true;
        this.lastActivatedTime = Date.now();

        if (!this.backButtonListener) {
            document.addEventListener(
                'ionBackButton',
                this.backButtonListener = ({ detail }) => detail.register(
                    BackButtonPriority.USER_TOURS,
                    () => {
                        this.dismissOnBackOrBackdrop();
                    },
                ),
            );
        }

        if (!this.focus) {
            return;
        }

        this.collapsibleHeaderListener = this.collapsibleHeaderListener ??
            CoreEvents.on(COLLAPSIBLE_HEADER_UPDATED, () => this.calculateStyles());
        this.mainMenuListener = this.mainMenuListener ??
            CoreEvents.on(MAIN_MENU_VISIBILITY_UPDATED_EVENT, () => this.calculateStyles());
        this.resizeListener = this.resizeListener ?? CoreDom.onWindowResize(() => this.calculateStyles());
        this.content = this.content ?? CoreDom.closest(this.focus, 'ion-content');

        if (!this.scrollListener && this.content) {
            this.content.scrollEvents = true;

            this.content.addEventListener('ionScrollEnd', this.scrollListener = (): void => {
                this.calculateStyles();
            });
        }
    }

    /**
     * Deactivate tour.
     */
    protected deactivate(): void {
        if (!this.active) {
            return;
        }

        this.active = false;

        this.collapsibleHeaderListener?.off();
        this.mainMenuListener?.off();
        this.resizeListener?.off();
        this.backButtonListener && document.removeEventListener('ionBackButton', this.backButtonListener);
        this.backButtonListener = undefined;
        this.collapsibleHeaderListener = undefined;
        this.mainMenuListener = undefined;
        this.resizeListener = undefined;

        if (this.content && this.scrollListener) {
            this.content.removeEventListener('ionScrollEnd', this.scrollListener);
        }
    }

    /**
     * Dismiss the tour because backdrop or back button was clicked.
     *
     * @param target Element clicked (if any).
     */
    protected dismissOnBackOrBackdrop(target?: HTMLElement): void {
        if (!this.active || Date.now() - this.lastActivatedTime < CoreUserToursUserTourComponent.BACKDROP_DISMISS_SAFETY_TRESHOLD) {
            // Not active or was recently activated, ignore.
            return;
        }

        if (target && target.closest('.user-tour-wrapper')) {
            // Click on tour wrapper, don't dismiss.
            return;
        }

        this.dismiss(true);
    }

}
