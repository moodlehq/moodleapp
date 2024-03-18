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

import { Component, ElementRef, Input, OnChanges, OnInit } from '@angular/core';
import { Translate } from '@singletons';
import { CoreUtils } from '@services/utils/utils';
import { CoreDom } from '@singletons/dom';
import { CoreForms } from '@singletons/form';
import { CoreLogger } from '@singletons/logger';

const logger = CoreLogger.getInstance('CoreErrorAccordionComponent');

/**
 * Component to show error details.
 *
 * Given that this component has to be injected dynamically in some situations (for example, error alerts),
 * it can be rendered using the static render() method to get the raw HTML.
 */
@Component({
    selector: 'core-error-accordion',
    templateUrl: 'core-error-accordion.html',
    styleUrls: ['error-accordion.scss'],
})
export class CoreErrorAccordionComponent implements OnInit, OnChanges {

    /**
     * Render an instance of the component into an HTML string.
     *
     * @param element Root element.
     * @param errorCode Error code.
     * @param errorDetails Error details.
     */
    static async render(element: Element, errorCode: string, errorDetails: string): Promise<void> {
        const html = this.html(errorCode, errorDetails);

        element.innerHTML = html;

        await this.hydrate(element);
    }

    /**
     * Get component html.
     *
     * @param errorCode Error code.
     * @param errorDetails Error details.
     * @returns HTML.
     */
    static html(errorCode: string, errorDetails: string): string {
        const contentId = CoreForms.uniqueId('error-accordion-content');
        const errorCodeLabel = Translate.instant('core.errorcode', { errorCode });
        const hideDetailsLabel = Translate.instant('core.errordetailshide');
        const showDetailsLabel = Translate.instant('core.errordetailsshow');

        return `
            <div class="core-error-accordion">
                <h3 class="core-error-accordion--code">${errorCodeLabel}</h3>
                <div id="${contentId}" class="core-error-accordion--details" role="region" aria-hidden="true">
                    <p>${errorDetails}</p>
                </div>
                <button type="button" class="core-error-accordion--toggle" aria-expanded="false" aria-controls="${contentId}">
                    <div class="core-error-accordion--toggle-text">
                        <span class="core-error-accordion--show-details">
                            ${showDetailsLabel}
                        </span>
                        <span class="core-error-accordion--hide-details">
                            ${hideDetailsLabel}
                        </span>
                    </div>
                    <ion-icon name="chevron-down" />
                </button>
            </div>
        `;
    }

    /**
     * Hydrate component.
     *
     * @param element Root element.
     */
    static async hydrate(element: Element): Promise<void> {
        const wrapper = element.querySelector<HTMLDivElement>('.core-error-accordion');
        const description = element.querySelector<HTMLParagraphElement>('.core-error-accordion--details');
        const button = element.querySelector<HTMLButtonElement>('.core-error-accordion--toggle');
        const hideText = element.querySelector<HTMLSpanElement>('.core-error-accordion--hide-details');

        if (!wrapper || !description || !button || !hideText) {
            logger.error('Couldn\'t render error-accordion, one of the child elements is missing');

            return;
        }

        await CoreDom.waitToBeVisible(wrapper);

        button.onclick = () => {
            wrapper.classList.toggle('expanded');
            description.setAttribute('aria-hidden', description.getAttribute('aria-hidden') === 'true' ? 'false' : 'true');
            button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
        };

        hideText.style.display = 'none';
        wrapper.style.setProperty('--width', `${wrapper.clientWidth}px`);
        wrapper.style.setProperty('--description-height', `${description.clientHeight}px`);
        wrapper.classList.add('hydrated');

        await CoreUtils.nextTick();

        hideText.style.display = 'revert';
    }

    @Input() errorCode!: string;
    @Input() errorDetails!: string;

    constructor(private element: ElementRef<HTMLElement>) {}

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.render();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.render();
    }

    /**
     * Render component html in the element created by Angular.
     */
    private async render(): Promise<void> {
        await CoreErrorAccordionComponent.render(this.element.nativeElement, this.errorCode, this.errorDetails);
    }

}
