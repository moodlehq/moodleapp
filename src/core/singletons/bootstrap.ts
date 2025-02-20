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

import { CorePopovers } from '@services/overlays/popovers';
import { CoreFormatTextOptions } from '@components/bs-tooltip/bs-tooltip';

/**
 * Singleton with helper functions for Bootstrap.
 */
export class CoreBoostrap {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Handle Bootstrap tooltips and popovers in a certain element.
     * Supports both Bootstrap 4 and 5.
     *
     * @param rootElement Element where to search for elements to treat.
     */
    static handleBootstrapTooltipsAndPopovers(
        rootElement: HTMLElement,
        formatTextOptions?: CoreFormatTextOptions,
    ): void {
        const elements = Array.from(rootElement.querySelectorAll(
            '[data-toggle="tooltip"], [data-bs-toggle="tooltip"], [data-toggle="popover"], [data-bs-toggle="popover"]',
        ));

        // Initialize tooltips
        elements.forEach((element) => {
            const treated = element.getAttribute('data-bstooltip-treated');
            if (treated === 'true') {
                return;
            }

            // data-bs attributes are used in Bootstrap 5, data- attributes are used in Bootstrap 4.
            const dataPrefix = element.getAttribute('data-toggle') ? 'data' : 'data-bs';

            let title: string | null = element.getAttribute(`${dataPrefix}-title`) || element.getAttribute('title') ||
                element.getAttribute(`${dataPrefix}-original-title`);
            let content = element.getAttribute(`${dataPrefix}-content`);
            const trigger = element.getAttribute(`${dataPrefix}-trigger`) || 'hover focus';

            if (element.getAttribute(`${dataPrefix}-toggle`) === 'tooltip') {
                // On tooltips, title attribute is the content.
                content = title;
                title = null;
            }

            if (!content ||
                    (trigger.indexOf('hover') === -1 && trigger.indexOf('focus') === -1 && trigger.indexOf('click') === -1)) {
                return;
            }

            element.setAttribute('data-bstooltip-treated', 'true'); // Mark it as treated.

            // Store the title in data-original-title instead of title, like BS does.
            if (!element.getAttribute(`${dataPrefix}-original-title`) && element.getAttribute('title')) {
                element.setAttribute(`${dataPrefix}-original-title`, element.getAttribute('title') || '');
                element.setAttribute('title', '');
            }

            element.addEventListener('click', async (ev: Event) => {
                const cssClass = element.getAttribute(`${dataPrefix}-custom-class`) || undefined;
                let placement = element.getAttribute(`${dataPrefix}-placement`) || undefined;

                if (placement === 'auto') {
                    placement = undefined;
                }

                const html = element.getAttribute(`${dataPrefix}-html`) === 'true';

                const { CoreBSTooltipComponent } = await import('@components/bs-tooltip/bs-tooltip');

                const popover = await CorePopovers.openWithoutResult({
                    component: CoreBSTooltipComponent,
                    cssClass,
                    componentProps: {
                        title,
                        content,
                        html,
                        formatTextOptions,
                    },
                    event: ev,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    side: placement as any,
                });

                // Adjust size of the popover in case it's out of the screen. This could be solved in Ionic in a future.
                // Those changes will be applied after rendering the popover so they will be moved after the popover is shown.
                const popoverContent = popover.shadowRoot?.querySelector('.popover-content');
                if (!popoverContent) {
                    return;
                }

                if (placement === 'top') {
                    const style = getComputedStyle(popoverContent);
                    const overflowHeight = (parseInt(style.bottom, 10) + parseInt(style.height, 10)) - popover.clientHeight;
                    if (overflowHeight > 0) {
                        popover.style.setProperty('--ma-height', `${parseInt(style.height, 10) - overflowHeight}px`);
                    }
                    if (parseInt(style.top, 10) < 0) {
                        popover.style.setProperty('--offset-y', `${parseInt(style.top, 10) * -1}px`);
                    }
                } else {
                    const style = getComputedStyle(popoverContent);
                    const overflowHeight = (parseInt(style.top, 10) + parseInt(style.height, 10)) - popover.clientHeight;
                    if (overflowHeight > 0) {
                        popover.style.setProperty('--max-height', `${parseInt(style.height, 10) - overflowHeight}px`);
                    }
                }
            });
        });
    }

}
