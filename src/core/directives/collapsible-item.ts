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

import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreComponentsRegistry } from '@singletons/components-registry';
import { CoreEventLoadingChangedData, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreFormatTextDirective } from './format-text';

const defaultMaxHeight = 64;
const buttonHeight = 44;

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
export class CoreCollapsibleItemDirective implements OnInit {

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
    protected loadingChangedListener?: CoreEventObserver;

    constructor(el: ElementRef<HTMLElement>) {
        this.element = el.nativeElement;

        this.element.addEventListener('click', this.elementClicked.bind(this));
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
        this.maxHeight = this.maxHeight < defaultMaxHeight ? defaultMaxHeight : this.maxHeight;

        if (!this.maxHeight) {
            // Do not collapse.
            return;
        }

        this.element.classList.add('collapsible-item');

        // Calculate the height now.
        await this.calculateHeight();

        // Recalculate the height if a parent core-loading displays the content.
        this.loadingChangedListener =
            CoreEvents.on(CoreEvents.CORE_LOADING_CHANGED, async (data: CoreEventLoadingChangedData) => {
                if (data.loaded && CoreDomUtils.closest(this.element.parentElement, '#' + data.uniqueId)) {
                    // The element is inside the loading, re-calculate the height.
                    await this.calculateHeight();
                }
            });
    }

    /**
     * Wait until all <core-format-text> children inside the element are done rendering.
     *
     * @param element Element.
     */
    protected async waitFormatTextsRendered(element: Element): Promise<void> {
        let formatTextElements: HTMLElement[] = [];

        if (this.element.tagName == 'CORE-FORMAT-TEXT') {
            formatTextElements = [this.element];
        } else {
            formatTextElements = Array.from(element.querySelectorAll('core-format-text'));
        }

        const formatTexts = formatTextElements.map(element => CoreComponentsRegistry.resolve(element, CoreFormatTextDirective));

        await Promise.all(formatTexts.map(formatText => formatText?.rendered()));
    }

    /**
     * Calculate the height and check if we need to display show more or not.
     */
    protected async calculateHeight(retries = 3): Promise<void> {
        // Remove max-height (if any) to calculate the real height.
        this.element.classList.add('collapsible-loading-height');

        await this.waitFormatTextsRendered(this.element);

        await CoreUtils.nextTick();

        this.expandedHeight = CoreDomUtils.getElementHeight(this.element) || 0;

        // Restore the max height now.
        this.element.classList.remove('collapsible-loading-height');

        // If cannot calculate height, shorten always.
        this.setExpandButtonEnabled(!this.expandedHeight || this.expandedHeight >= this.maxHeight);

        if (this.expandedHeight == 0 && retries > 0) {
            setTimeout(() => this.calculateHeight(retries - 1), 200);
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

        const toggleText = document.createElement('span');
        toggleText.classList.add('collapsible-toggle-text');
        toggleText.classList.add('sr-only');
        toggleButton.appendChild(toggleText);

        const expandArrow = document.createElement('span');
        expandArrow.classList.add('collapsible-toggle-arrow');
        toggleButton.appendChild(expandArrow);

        this.element.appendChild(toggleButton);

        this.toggleExpand(this.expanded);
    }

    /**
     * Set max height to element.
     *
     * @param height Max height if collapsed or undefined if expanded.
     */
    protected setHeight(height?: number): void {
        if (height) {
            this.element.style.setProperty('--height', height + 'px');
        } else if (this.expandedHeight) {
            this.element.style.setProperty('--height', this.expandedHeight + 'px');
        } else {
            this.element.style.removeProperty('--height');

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

}
