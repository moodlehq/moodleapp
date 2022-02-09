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
import { Translate } from '@singletons';
import { CoreEventLoadingChangedData, CoreEventObserver, CoreEvents } from '@singletons/events';

const defaultMaxHeight = 56;
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
    protected loadingChangedListener?: CoreEventObserver;

    constructor(el: ElementRef<HTMLElement>) {
        this.element = el.nativeElement;

        this.element.addEventListener('click', this.elementClicked.bind(this));
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (typeof this.height === 'string') {
            this.maxHeight = this.height === ''
                ? defaultMaxHeight
                : parseInt(this.height, 10);
        } else {
            this.maxHeight = this.height;
        }
        this.maxHeight = this.maxHeight < defaultMaxHeight ? defaultMaxHeight : this.maxHeight;

        if (!this.maxHeight || (window.innerWidth > 576 && window.innerHeight > 576)) {
            // Do not collapse on big screens.
            return;
        }

        // Calculate the height now.
        this.calculateHeight();
        setTimeout(() => this.calculateHeight(), 200); // Try again, sometimes the first calculation is wrong.

        this.setExpandButtonEnabled(false);

        // Recalculate the height if a parent core-loading displays the content.
        this.loadingChangedListener =
            CoreEvents.on(CoreEvents.CORE_LOADING_CHANGED, (data: CoreEventLoadingChangedData) => {
                if (data.loaded && CoreDomUtils.closest(this.element.parentElement, '#' + data.uniqueId)) {
                    // The format-text is inside the loading, re-calculate the height.
                    this.calculateHeight();
                    setTimeout(() => this.calculateHeight(), 200);
                }
            });
    }

    /**
     * Calculate the height and check if we need to display show more or not.
     */
    protected calculateHeight(): void {
        // @todo: Work on calculate this height better.
        if (!this.maxHeight) {
            return;
        }

        // Remove max-height (if any) to calculate the real height.
        const initialMaxHeight = this.element.style.maxHeight;
        this.element.style.maxHeight = '';

        const height = CoreDomUtils.getElementHeight(this.element) || 0;

        // Restore the max height now.
        this.element.style.maxHeight = initialMaxHeight;

        // If cannot calculate height, shorten always.
        this.setExpandButtonEnabled(!height || height > this.maxHeight);
    }

    /**
     * Sets if expand button is enabled or not.
     *
     * @param enable Wether enable or disable.
     */
    protected setExpandButtonEnabled(enable: boolean): void {
        this.toggleExpandEnabled = enable;
        this.element.classList.toggle('collapsible-enabled', enable);

        if (!enable || this.element.querySelector('ion-button.collapsible-toggle'))  {
            return;
        }

        // Add expand/collapse buttons
        const toggleButton = document.createElement('ion-button');
        toggleButton.classList.add('collapsible-toggle');
        toggleButton.setAttribute('fill', 'clear');

        const toggleText = document.createElement('span');
        toggleText.classList.add('collapsible-toggle-text');
        toggleButton.appendChild(toggleText);

        const expandArrow = document.createElement('span');
        expandArrow.classList.add('collapsible-toggle-arrow');
        toggleButton.appendChild(expandArrow);

        this.element.appendChild(toggleButton);

        this.toggleExpand(this.expanded);
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
        this.element.classList.toggle('collapsible-expanded', expand);
        this.element.classList.toggle('collapsible-collapsed', !expand);
        this.element.style.maxHeight = expand ? '' : (this.maxHeight + buttonHeight) + 'px';

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
    protected elementClicked(e: MouseEvent): void {
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
