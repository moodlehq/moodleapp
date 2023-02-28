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

import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreColors } from '@singletons/colors';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { CoreEventObserver } from '@singletons/events';
import { Subscription } from 'rxjs';
import { CoreFormatTextDirective } from './format-text';

const defaultMaxHeight = 80;
const minMaxHeight = 56;

/**
 * Directive to make an element collapsible.
 *
 * Example usage:
 *
 * <div collapsible-item>
 */
@Directive({
    selector: '[collapsible-item]',
})
export class CoreCollapsibleItemDirective implements OnInit, OnDestroy {

    /**
     * Max height in pixels to render the content box. It should be 56 at least to make sense.
     * Using this parameter will force display: block to calculate height better.
     * If you want to avoid this use class="inline" at the same time to use display: inline-block.
     */
    @Input('collapsible-item') height: number | string = defaultMaxHeight;

    protected element: HTMLElement;
    protected toggleExpandEnabled = false;
    protected expanded = false;
    protected maxHeight = defaultMaxHeight;
    protected expandedHeight = 0;
    protected resizeListener?: CoreEventObserver;
    protected darkModeListener?: Subscription;
    protected domPromise?: CoreCancellablePromise<void>;
    protected visiblePromise?: CoreCancellablePromise<void>;
    protected uniqueId: string;
    protected loadingHeight = false;
    protected pageDidEnterListener?: EventListener;
    protected page?: HTMLElement;

    constructor(el: ElementRef<HTMLElement>) {
        this.element = el.nativeElement;

        this.element.addEventListener('click', (event) => this.elementClicked(event));
        this.uniqueId = 'collapsible-item-' + CoreUtils.getUniqueId('CoreCollapsibleItemDirective');
        this.element.id = this.uniqueId;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (this.height === null) {
            return;
        }

        if (typeof this.height === 'string') {
            this.maxHeight = this.height === ''
                ? defaultMaxHeight
                : parseInt(this.height, 10);
        } else {
            this.maxHeight = this.height;
        }
        this.maxHeight = this.maxHeight < minMaxHeight ? defaultMaxHeight : this.maxHeight;

        if (!this.maxHeight) {
            // Do not collapse.
            return;
        }

        this.element.classList.add('collapsible-item');

        await this.waitLoadingsDone();

        await this.calculateHeight();

        this.page?.addEventListener(
            'ionViewDidEnter',
            this.pageDidEnterListener = () => {
                this.calculateHeight();
            },
        );

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.calculateHeight();
        }, 50);

        this.darkModeListener = CoreSettingsHelper.onDarkModeChange().subscribe(() => {
            this.setGradientColor();
        });
    }

    /**
     * Wait until all <core-loading> children inside the page.
     *
     * @returns Promise resolved when loadings are done.
     */
    protected async waitLoadingsDone(): Promise<void> {
        this.domPromise = CoreDom.waitToBeInDOM(this.element);

        await this.domPromise;

        this.page = this.element.closest<HTMLElement>('.ion-page') || undefined;
        if (!this.page) {
            return;
        }

        await CoreDirectivesRegistry.waitDirectivesReady(this.page, 'core-loading', CoreLoadingComponent);
    }

    /**
     * Wait until all <core-format-text> children inside the element are done rendering.
     */
    protected async waitFormatTextsRendered(): Promise<void> {
        await CoreDirectivesRegistry.waitDirectivesReady(this.element, 'core-format-text', CoreFormatTextDirective);
    }

    /**
     * Calculate the height and check if we need to display show more or not.
     */
    protected async calculateHeight(): Promise<void> {
        if (this.loadingHeight) {
            // Already calculating, return.
            return;
        }
        this.loadingHeight = true;

        this.visiblePromise = CoreDom.waitToBeVisible(this.element);
        await this.visiblePromise;

        // Remove max-height (if any) to calculate the real height.
        this.element.classList.add('collapsible-loading-height');

        await this.waitFormatTextsRendered();

        this.expandedHeight = this.element.getBoundingClientRect().height;

        // Restore the max height now.
        this.element.classList.remove('collapsible-loading-height');

        // If cannot calculate height, shorten always.
        const enable = !this.expandedHeight || this.expandedHeight >= this.maxHeight;
        this.setExpandButtonEnabled(enable);
        this.setGradientColor();

        this.loadingHeight = false;
    }

    /**
     * Sets the gradient color based on the background.
     */
    protected setGradientColor(): void {
        if (!this.toggleExpandEnabled) {
            return;
        }

        let coloredElement: HTMLElement | null = this.element;
        let backgroundColor = [0, 0, 0, 0];
        let background = '';
        while (coloredElement && backgroundColor[3] === 0) {
            background = getComputedStyle(coloredElement).backgroundColor;
            backgroundColor = CoreColors.getColorRGBA(background);
            coloredElement = coloredElement.parentElement;
        }

        if (backgroundColor[3] !== 0) {
            delete(backgroundColor[3]);
            const bgList = backgroundColor.join(',');
            this.element.style.setProperty('--background-gradient-rgb', `${bgList}`);
        }
    }

    /**
     * Sets if expand button is enabled or not.
     *
     * @param enable Wether enable or disable.
     */
    protected setExpandButtonEnabled(enable: boolean): void {
        this.toggleExpandEnabled = enable;
        this.element.classList.toggle('collapsible-enabled', enable);

        if (!enable || this.element.querySelector('ion-button.collapsible-toggle')) {
            this.setHeight(!enable || this.expanded ? undefined : this.maxHeight);

            return;
        }

        // Add expand/collapse buttons
        const toggleButton = document.createElement('ion-button');
        toggleButton.classList.add('collapsible-toggle');
        toggleButton.setAttribute('fill', 'clear');
        toggleButton.setAttribute('aria-controls', this.uniqueId);

        const toggleText = document.createElement('span');
        toggleText.classList.add('collapsible-toggle-text');
        toggleText.classList.add('sr-only');
        toggleButton.appendChild(toggleText);

        const expandArrow = document.createElement('span');
        expandArrow.classList.add('collapsible-toggle-arrow');
        toggleButton.appendChild(expandArrow);

        this.element.append(toggleButton);

        this.toggleExpand(this.expanded);
    }

    /**
     * Set max height to element.
     *
     * @param height Max height if collapsed or undefined if expanded.
     */
    protected setHeight(height?: number): void {
        if (height) {
            this.element.style.setProperty('--collapsible-height', height + 'px');
        } else if (this.expandedHeight) {
            this.element.style.setProperty('--collapsible-height', this.expandedHeight + 'px');
        } else {
            this.element.style.removeProperty('--collapsible-height');

        }
    }

    /**
     * Expand or collapse text.
     *
     * @param expand Wether expand or collapse text. If undefined, will toggle.
     */
    protected toggleExpand(expand?: boolean): void {
        if (expand === undefined) {
            expand = !this.expanded;
        }
        this.expanded = expand;

        // Reset scroll inside the element to show always the top part.
        this.element.scrollTo(0, 0);
        this.element.classList.toggle('collapsible-collapsed', !expand);
        this.setHeight(!expand ? this.maxHeight: undefined);

        const toggleButton = this.element.querySelector('ion-button.collapsible-toggle');
        const toggleText = toggleButton?.querySelector('.collapsible-toggle-text');
        if (!toggleButton || !toggleText) {
            return;
        }
        toggleText.innerHTML = expand ? Translate.instant('core.showless') : Translate.instant('core.showmore');
        toggleButton.setAttribute('aria-expanded', expand ? 'true' : 'false');
    }

    /**
     * Listener to call when the element is clicked.
     *
     * @param e Click event.
     */
    elementClicked(e: MouseEvent): void {
        if (e.defaultPrevented) {
            // Ignore it if the event was prevented by some other listener.
            return;
        }

        if (!this.toggleExpandEnabled) {
            // Nothing to do on click, just stop.
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.toggleExpand();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.resizeListener?.off();
        this.darkModeListener?.unsubscribe();
        this.domPromise?.cancel();
        this.visiblePromise?.cancel();

        if (this.page && this.pageDidEnterListener) {
            this.page.removeEventListener('ionViewDidEnter', this.pageDidEnterListener);
        }
    }

}
