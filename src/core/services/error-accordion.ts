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

import { Injectable } from '@angular/core';
import { Translate, makeSingleton } from '@singletons';
import { CoreWait } from '@static/wait';
import { CoreDom } from '@static/dom';
import { CoreForms } from '@static/form';
import { CoreLogger } from '@static/logger';

/**
 * Service used to render an Error Accordion component.
 *
 * This is declared as a service instead of an Angular Component because the HTML
 * has to be injected dynamically in alerts (only HTML and Ionic components work).
 */
@Injectable({ providedIn: 'root' })
export class CoreErrorAccordionService {

    private logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreErrorAccordion');
    }

    /**
     * Render an instance of the component into an HTML string.
     *
     * @param element Root element.
     * @param errorDetails Error details.
     * @param errorCode Error code.
     */
    async render(element: Element, errorDetails: string, errorCode?: string): Promise<void> {
        const html = this.html(errorDetails, errorCode);

        element.innerHTML = html;

        await this.hydrate(element);
    }

    /**
     * Get component html.
     *
     * @param errorDetails Error details.
     * @param errorCode Error code.
     * @returns HTML.
     */
    private html(errorDetails: string, errorCode?: string): string {
        const contentId = CoreForms.uniqueId('error-accordion-content');
        const errorCodeLabel = errorCode ? Translate.instant('core.errorcode', { errorCode }) : undefined;
        const hideDetailsLabel = Translate.instant('core.errordetailshide');
        const showDetailsLabel = Translate.instant('core.errordetailsshow');

        return `
            <div class="core-error-accordion">
                ${errorCodeLabel ? `<h3 class="core-error-accordion--code">${errorCodeLabel}</h3>` : ''}
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
    private async hydrate(element: Element): Promise<void> {
        const wrapper = element.querySelector<HTMLDivElement>('.core-error-accordion');
        const description = element.querySelector<HTMLParagraphElement>('.core-error-accordion--details');
        const button = element.querySelector<HTMLButtonElement>('.core-error-accordion--toggle');
        const hideText = element.querySelector<HTMLSpanElement>('.core-error-accordion--hide-details');

        if (!wrapper || !description || !button || !hideText) {
            this.logger.error('Couldn\'t render error-accordion, one of the child elements is missing');

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

        await CoreWait.nextTick();

        hideText.style.display = 'revert';
    }

}

export const CoreErrorAccordion = makeSingleton(CoreErrorAccordionService);
