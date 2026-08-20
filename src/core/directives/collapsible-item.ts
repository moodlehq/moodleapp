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

import { Directive, ElementRef, OnDestroy, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreUtils } from '@static/utils';
import { Translate } from '@singletons';
import { CoreColors } from '@static/colors';
import { CoreDirectivesRegistry } from '@static/directives-registry';
import { CoreDom } from '@static/dom';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { Subscription } from 'rxjs';
import { CoreFormatTextDirective } from './format-text';
import { CoreConstants } from '../constants';
import { CoreSites } from '@services/sites';

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
    host: {
        '[class.collapsible-enabled]': 'collapseEnabled()',
        '[class.collapsible-item]': 'maxHeight() > 0',
        '[class.collapsible-collapsed]': '!expanded()',
        '[id]': 'uniqueId()',
    },
})
export class CoreCollapsibleItemDirective implements OnInit, OnDestroy {

    protected static readonly FEATURE_NAME = 'NoDelegate_CoreFormatTextShortenText';

    /**
     * Max height in pixels to render the content box. It should be 56 at least to make sense.
     * Using this parameter will force display: block to calculate height better.
     * If you want to avoid this use class="inline" at the same time to use display: inline-block.
     */
    readonly height = input<number | string>(defaultMaxHeight, { alias: 'collapsible-item' });

    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected readonly heightShouldBeCollapsed = signal(false);
    protected readonly expanded = signal(CoreConstants.CONFIG.collapsibleItemsExpanded);
    protected readonly uniqueId = signal(`collapsible-item-${CoreUtils.getUniqueId('CoreCollapsibleItemDirective')}`);
    protected readonly maxHeight = computed(() => {
        let height = this.height();

        if (typeof height === 'string') {
            height = height === ''
                ? defaultMaxHeight
                : parseInt(height, 10);
        }

        return height < minMaxHeight ? defaultMaxHeight : height;
    });

    protected readonly featureEnabled = signal(false);
    protected readonly collapseEnabled = computed(() => this.featureEnabled() && this.heightShouldBeCollapsed());

    protected expandedHeight = 0;
    protected toggleButton?: HTMLIonButtonElement;
    protected resizeListener?: CoreEventObserver;
    protected darkModeListener?: Subscription;
    protected domPromise?: CoreCancellablePromise<void>;
    protected visiblePromise?: CoreCancellablePromise<void>;
    protected loadingHeight = false;
    protected pageDidEnterListener?: EventListener;
    protected page?: HTMLElement;

    protected updateSiteObserver: CoreEventObserver;

    constructor() {
        const siteId = CoreSites.getCurrentSiteId();

        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.checkFeatureEnabled();
        }, siteId);

        this.checkFeatureEnabled();

        this.element.addEventListener('click', (event) => this.elementClicked(event));

        effect(() => {
            const expand = this.expanded() && this.collapseEnabled();

            untracked(() => {
                // Reset scroll inside the element to show always the top part.
                this.element.scrollTo(0, 0);
                this.setHeight(!expand ? this.maxHeight() : undefined);

                const toggleButton = this.toggleButton;
                const toggleText = toggleButton?.querySelector('.collapsible-toggle-text');
                if (!toggleButton || !toggleText) {
                    return;
                }
                toggleText.textContent = expand ? Translate.instant('core.showless') : Translate.instant('core.showmore');
                toggleButton.setAttribute('aria-expanded', expand ? 'true' : 'false');
            });
        });

        // Add toggle button if needed.
        effect(() => {
            const enable = this.collapseEnabled();

            this.addExpandButtonEnabled(enable);
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.maxHeight()) {
            // Do not collapse.
            return;
        }

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
        const enable = !this.expandedHeight || this.expandedHeight >= this.maxHeight();
        this.heightShouldBeCollapsed.set(enable);

        this.loadingHeight = false;
    }

    /**
     * Sets the gradient color based on the background.
     */
    protected setGradientColor(): void {
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
     * Add expand/collapse button if needed.
     *
     * @param enable Whether enable or disable.
     */
    protected addExpandButtonEnabled(enable: boolean): void {
        if (!enable || this.toggleButton !== undefined) {
            return;
        }

        // Add expand/collapse buttons
        this.toggleButton = document.createElement('ion-button');
        this.toggleButton.classList.add('collapsible-toggle');
        this.toggleButton.setAttribute('fill', 'clear');
        this.toggleButton.setAttribute('aria-controls', this.uniqueId());
        this.toggleButton.setAttribute('aria-expanded', 'false');

        const toggleText = document.createElement('span');
        toggleText.classList.add('collapsible-toggle-text');
        toggleText.classList.add('sr-only');
        toggleText.textContent = Translate.instant('core.showmore');

        this.toggleButton.appendChild(toggleText);

        const expandArrow = document.createElement('span');
        expandArrow.classList.add('collapsible-toggle-arrow');
        this.toggleButton.appendChild(expandArrow);

        this.element.append(this.toggleButton);
    }

    /**
     * Set max height to element.
     *
     * @param height Max height if collapsed or undefined if expanded.
     */
    protected setHeight(height?: number): void {
        if (height) {
            this.element.style.setProperty('--collapsible-height', `${height}px`);
        } else if (this.expandedHeight) {
            this.element.style.setProperty('--collapsible-height', `${this.expandedHeight}px`);
        } else {
            this.element.style.removeProperty('--collapsible-height');

        }
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

        if (!this.collapseEnabled()) {
            // Nothing to do on click, just stop.
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.expanded.update((value) => !value);
    }

    /**
     * Check if the feature is enabled.
     */
    protected checkFeatureEnabled(): void {
        const site = CoreSites.getCurrentSite();

        const disabled = site?.isFeatureDisabled(CoreCollapsibleItemDirective.FEATURE_NAME);
        this.featureEnabled.set(!disabled);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.resizeListener?.off();
        this.darkModeListener?.unsubscribe();
        this.domPromise?.cancel();
        this.visiblePromise?.cancel();
        this.updateSiteObserver.off();

        if (this.page && this.pageDidEnterListener) {
            this.page.removeEventListener('ionViewDidEnter', this.pageDidEnterListener);
        }
    }

}
