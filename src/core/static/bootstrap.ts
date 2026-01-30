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
import { CoreModals } from '@services/overlays/modals';
import { CoreDom } from './dom';
import { CoreWait } from './wait';

/**
 * Static class with helper functions for Bootstrap.
 */
export class CoreBootstrap {

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Handle Bootstrap elements in a certain element.
     * Supports both Bootstrap 4 and 5.
     *
     * @param rootElement Element where to search for elements to treat.
     * @param formatTextOptions Options to format text.
     */
    static handleJS(
        rootElement: HTMLElement,
        formatTextOptions?: CoreFormatTextOptions,
    ): void {
        this.handleTooltipsAndPopovers(rootElement, formatTextOptions);
        this.handleAccordionsAndCollapse(rootElement);
        this.handleModals(rootElement, formatTextOptions);
        this.handleTabs(rootElement);
        this.handleCarousels(rootElement);
        this.enableDismissTrigger(rootElement, 'alert', 'close'); // Alert uses close method.
        this.enableDismissTrigger(rootElement, 'modal'); // Modal uses hide method
        this.enableDismissTrigger(rootElement, 'offcanvas'); // Offcanvas uses hide method
        this.enableDismissTrigger(rootElement, 'toast'); // Toast uses hide method
    }

    /**
     * Handle Bootstrap tooltips and popovers in a certain element.
     * Supports both Bootstrap 4 and 5.
     * https://getbootstrap.com/docs/5.3/components/tooltips/
     * https://getbootstrap.com/docs/5.3/components/popovers/
     *
     * @param rootElement Element where to search for elements to treat.
     * @param formatTextOptions Options to format text.
     */
    protected static handleTooltipsAndPopovers(
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

                await CorePopovers.openWithoutResult({
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
            });
        });
    }

    /**
     * Handle Bootstrap accordions and collapse elements in a certain element.
     * Supports both Bootstrap 4 and 5.
     * https://getbootstrap.com/docs/5.3/components/accordion/
     * https://getbootstrap.com/docs/5.3/components/collapse/
     *
     * @param rootElement Element where to search for elements to treat.
     */
    protected static handleAccordionsAndCollapse(rootElement: HTMLElement): void {
        const elements = Array.from(rootElement.querySelectorAll<HTMLElement>(
            '[data-toggle="collapse"], [data-bs-toggle="collapse"]',
        ));

        elements.forEach((element) => {
            const targetElements = this.getTargets(rootElement, element);
            if (!targetElements || !targetElements.length) {
                return;
            }

            // Search the parent accordion element.
            const parentName = targetElements[0].getAttribute('data-parent') ||
                targetElements[0].getAttribute('data-bs-parent');

            const parentElement = parentName ? rootElement.querySelector<HTMLElement>(parentName) : null;
            if (!parentName) {
                const isOpen = targetElements[0].classList.contains('show');

                this.collapseSetExpanded(element, targetElements[0], isOpen);
            }

            // Initialize the accordion.
            element.addEventListener('click', async (ev: Event) => {
                ev.preventDefault();
                ev.stopPropagation();

                targetElements.forEach((targetElement) => {
                    const isOpen = targetElement.classList.contains('show');

                    this.collapseSetExpanded(element, targetElement, !isOpen, parentElement);
                });
            });
        });
    }

    /**
     * Handle Bootstrap tab elements in a certain element.
     * Supports both Bootstrap 4 and 5.
     * https://getbootstrap.com/docs/5.3/components/navs-tabs/#tabs
     *
     * @param rootElement Element where to search for elements to treat.
     */
    protected static handleTabs(rootElement: HTMLElement): void {
        const elements = Array.from(rootElement.querySelectorAll<HTMLElement>(
            '.list-group, .nav, [role="tablist"]',
        ));

        if (!elements.length) {
            return;
        }
        const toggleSelectorsList = [
            '[data-bs-toggle="tab"]',
            '[data-toggle="tab"]',
            '[data-bs-toggle="pill"]',
            '[data-toggle="pill"]',
            '[data-bs-toggle="list"]',
            '[data-toggle="list"]',
        ];

        elements.forEach((element) => {
            if (!element.hasAttribute('role')) {
                element.setAttribute('role', 'tablist');
            }
            const childrenSelectors = [
                '.nav-link:not(.dropdown-toggle)',
                '.list-group-item:not(.dropdown-toggle)',
                '[role="tab"]:not(.dropdown-toggle)',
                ...toggleSelectorsList,
            ].join(',');

            const children = Array.from(element.querySelectorAll<HTMLElement>(childrenSelectors));

            children.forEach((child) => {
                const isActive = child.classList.contains('active');
                const outerElement = child.closest('.nav-item, .list-group-item');
                child.setAttribute('aria-selected', isActive ? 'true' : 'false');
                if (outerElement !== child) {
                    outerElement?.setAttribute('role', 'presentation');
                }
                if (!isActive) {
                    child.setAttribute('tabindex', '-1');
                }
                if (!child.hasAttribute('role')) {
                    child.setAttribute('role', 'tab');
                }

                const target = this.getTargets(rootElement, child)?.[0];
                if (!target) {
                    return;
                }
                if (!target.hasAttribute('role')) {
                    target.setAttribute('role', 'tabpanel');
                }
                if (child.id && !target.hasAttribute('aria-labelledby')) {
                    target.setAttribute('aria-labelledby', child.id);
                }
            });
        });

        const targetElements = Array.from(rootElement.querySelectorAll<HTMLElement>(toggleSelectorsList.join(',')));

        targetElements.forEach((element) => {
            // Initialize the accordion.
            element.addEventListener('click', async (ev: Event) => {
                if (element.classList.contains('active')) {
                    return;
                }

                ev.preventDefault();
                ev.stopPropagation();

                // After rendering of core-format-text directive, the DOM element wrapped within a div
                // is moved inside the current DOM core-format-text element. So the div element is not in the DOM and empty.
                // @see formatAndRenderContents on format-text.ts.
                const root = CoreDom.isElementInDom(rootElement)
                    ? rootElement
                    : element.closest<HTMLElement>('core-format-text');

                if (!root) {
                    return;
                }

                const activeSelectors = toggleSelectorsList.map((selector) => `${selector}.active`).join(',');
                const active = root.querySelector<HTMLElement>(activeSelectors);
                if (active) {
                    this.tabSetActive(root, active, false);
                }

                this.tabSetActive(root, element, true);
            });
        });
    }

    /**
     * Set the active state of a tab element.
     *
     * @param root Root element where the tab is located.
     * @param element Tab element to set active.
     * @param isActive Whether the tab should be set as active or not.
     */
    protected static tabSetActive(
        root: HTMLElement,
        element: HTMLElement,
        isActive: boolean,
    ): void {
        const target = this.getTargets(root, element)?.[0];
        if (!target) {
            return;
        }

        element.classList.toggle('active', isActive);
        element.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
            element.removeAttribute('tabindex');
        } else {
            element.setAttribute('tabindex', '-1');
        }

        target.classList.toggle('active', isActive);
        target.classList.toggle('show', isActive);
    }

    /**
     * Set the expanded state of a collapse element.
     *
     * @param buttonElement Button element that toggles the collapse.
     * @param targetElement Target element to show/hide.
     * @param expanded Expanded state.
     * @param parentElement Parent element of the accordion, if any.
     */
    protected static collapseSetExpanded(
        buttonElement: HTMLElement,
        targetElement: HTMLElement,
        expanded: boolean,
        parentElement: HTMLElement | null = null,
    ): void {
        if (expanded && parentElement) {
            // Close the others.
            const elements = Array.from(parentElement.querySelectorAll<HTMLElement>(
                '[data-toggle="collapse"], [data-bs-toggle="collapse"]',
            ));

            elements.forEach((element) => {
                const targetElement = this.getTargets(parentElement, element)?.[0];
                if (!targetElement) {
                    return;
                }

                this.collapseSetExpanded(element, targetElement, false);
            });

        }
        targetElement.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        targetElement.classList.toggle('show', expanded);
        buttonElement.classList.toggle('collapsed', !expanded);
    }

    /**
     * Handle Bootstrap modals and alerts in a certain element.
     * Supports both Bootstrap 4 and 5.
     * https://getbootstrap.com/docs/5.3/components/modal/
     *
     * @param rootElement Element where to search for elements to treat.
     * @param formatTextOptions Options to format text.
     */
    protected static handleModals(rootElement: HTMLElement, formatTextOptions?: CoreFormatTextOptions): void {
        const elements = Array.from(rootElement.querySelectorAll<HTMLElement>(
            '[data-toggle="modal"], [data-bs-toggle="modal"]',
        ));

        elements.forEach((element) => {
            const targetElement = this.getTargets(rootElement, element)?.[0];
            if (!targetElement) {
                return;
            }

            // Initialize the modal.
            element.addEventListener('click', async (ev: Event) => {
                ev.preventDefault();
                ev.stopPropagation();

                const { CoreBSTooltipComponent } = await import('@components/bs-tooltip/bs-tooltip');

                const cloned = targetElement.cloneNode(true) as HTMLElement;
                cloned.classList.add('show', 'modal-open'); // Show the modal.
                cloned.style.display = 'block'; // Set display to block.
                cloned.style.position = 'static'; // Set position to static to avoid issues with Ionic popovers.
                cloned.removeAttribute('aria-hidden');
                cloned.setAttribute('aria-modal', 'true');
                cloned.setAttribute('role', 'dialog');

                await CoreModals.openModal({
                    component: CoreBSTooltipComponent,
                    cssClass: 'core-bootstrap-modal',
                    closeOnNavigate: true,
                    componentProps: {
                        content: cloned.outerHTML,
                        item: false,
                        formatTextOptions,
                    },
                });
            });
        });
    }

    /**
     * Enable dismiss trigger for Bootstrap components.
     * This will add a click event listener to elements with data-dismiss or data-bs-dismiss attributes
     * that will call the specified method on the closest component element.
     *
     * @param rootElement Element where to search for elements to treat.
     * @param componentName Name of the component to dismiss (e.g., 'alert', 'modal', 'offcanvas', 'toast').
     * @param method Method to call on the component when dismissed (default is 'hide').
     *
     * Adapted from Bootstrap 5 util/component-functions.js
     */
    protected static enableDismissTrigger(rootElement: HTMLElement, componentName: string, method = 'hide'): void {
      const elements = Array.from(rootElement.querySelectorAll(
            `[data-dismiss="${componentName}"], [data-bs-dismiss="${componentName}"]`,
        ));

        elements.forEach((element) => {
            element.addEventListener('click', () => {
                const target = element.closest(`.${componentName}`);
                if (!target) {
                    return;
                }

                if (componentName === 'alert') {
                    // Alerts are simple, we can just remove them from the DOM.
                    target.remove();

                    return;
                }

                // We cannot access the overlay (Modal and popover) component to dismiss it.
                const overlay = componentName === 'modal' && (target.closest('ion-modal') || target.closest('ion-popover'));
                if (overlay) {
                    // Click on backdrop to close the modal.
                    const backdrop = overlay.shadowRoot?.querySelector<HTMLElement>('[part="backdrop"]');
                    backdrop?.click();

                    return;
                }

                target[method]();
            });
        });
    }

    /**
     * Handle Bootstrap carousel elements in a certain element.
     * Supports both Bootstrap 4 and 5.
     * https://getbootstrap.com/docs/5.3/components/carousel/
     *
     * @param rootElement Element where to search for elements to treat.
     */
    protected static handleCarousels(rootElement: HTMLElement): void {
        const elements = Array.from(rootElement.querySelectorAll<HTMLElement>(
            '.carousel',
        ));

        if (!elements.length) {
            return;
        }

        elements.forEach((element) => {
            const intervalAttr = element.getAttribute('data-interval') || element.getAttribute('data-bs-interval');
            const interval = intervalAttr ? parseInt(intervalAttr, 10) : 5000;
            let isPaused = false;

            // Helper to update aria-current for carousel indicators.
            const updateIndicator = () => {
                const items = Array.from(element.querySelectorAll<HTMLElement>('.carousel-item'));
                const indicators = Array.from(element.querySelectorAll<HTMLElement>('[data-slide-to], [data-bs-slide-to]'));
                const activeIndex = items.findIndex(item => item.classList.contains('active'));
                indicators.forEach((indicator, idx) => {
                    if (idx === activeIndex) {
                        indicator.classList.add('active');
                        indicator.setAttribute('aria-current', 'true');
                    } else {
                        indicator.classList.remove('active');
                        indicator.removeAttribute('aria-current');
                    }
                });
            };

            // Helper to perform slide/crossfade transition.
            const goToSlide = async (newIndex: number, direction: 'next' | 'prev') => {
                const items = Array.from(element.querySelectorAll<HTMLElement>('.carousel-item'));
                const activeIndex = items.findIndex(item => item.classList.contains('active'));
                if (newIndex === activeIndex || newIndex < 0 || newIndex >= items.length) {
                    return;
                }
                const activeItem = items[activeIndex];
                const nextItem = items[newIndex];

                // Remove transition classes from all items.
                items.forEach(item => {
                    item.classList.remove('carousel-item-next', 'carousel-item-prev', 'carousel-item-start', 'carousel-item-end');
                });

                // Animation.
                nextItem.classList.add(direction === 'next' ? 'carousel-item-next' : 'carousel-item-prev');
                // Wait the render to finish to start the transition.
                await CoreWait.nextTick();

                activeItem.classList.add(direction === 'next' ? 'carousel-item-start' : 'carousel-item-end');
                nextItem.classList.add(direction === 'next' ? 'carousel-item-start' : 'carousel-item-end');

                setTimeout(() => {
                    nextItem.classList.remove(
                        'carousel-item-next',
                        'carousel-item-prev',
                        'carousel-item-start',
                        'carousel-item-end',
                    );
                    nextItem.classList.add('active');
                    activeItem.classList.remove('active', 'carousel-item-start', 'carousel-item-end');
                    updateIndicator();
                }, 600);
            };

            // Initialize the carousel.
            const nextButton = element.querySelector<HTMLElement>('[data-slide="next"], [data-bs-slide="next"]');
            if (nextButton) {
                nextButton.addEventListener('click', (ev: Event) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    const items = Array.from(element.querySelectorAll<HTMLElement>('.carousel-item'));
                    const activeIndex = items.findIndex(item => item.classList.contains('active'));
                    const nextIndex = (activeIndex + 1) % items.length;
                    goToSlide(nextIndex, 'next');
                });
            }

            const prevButton = element.querySelector<HTMLElement>('[data-slide="prev"], [data-bs-slide="prev"]');
            if (prevButton) {
                prevButton.addEventListener('click', (ev: Event) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    const items = Array.from(element.querySelectorAll<HTMLElement>('.carousel-item'));
                    const activeIndex = items.findIndex(item => item.classList.contains('active'));
                    const prevIndex = (activeIndex - 1 + items.length) % items.length;
                    goToSlide(prevIndex, 'prev');
                });
            }

            // Support data-slide-to and data-bs-slide-to for direct navigation.
            const slideToButtons = Array.from(
                element.querySelectorAll<HTMLElement>('[data-slide-to], [data-bs-slide-to]'),
            );
            slideToButtons.forEach((button) => {
                button.addEventListener('click', (ev: Event) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    // Get the index from data-slide-to or data-bs-slide-to.
                    const indexStr = button.getAttribute('data-slide-to') ?? button.getAttribute('data-bs-slide-to');
                    if (indexStr === null) {
                        return;
                    }
                    const index = parseInt(indexStr, 10);
                    if (isNaN(index)) {
                        return;
                    }

                    const items = Array.from(element.querySelectorAll<HTMLElement>('.carousel-item'));
                    const activeIndex = items.findIndex(item => item.classList.contains('active'));
                    goToSlide(index, index > activeIndex ? 'next' : 'prev');
                });
            });

            // Pause on mouse enter.
            element.addEventListener('mouseenter', () => {
                isPaused = true;
            });

            // Resume on mouse leave.
            element.addEventListener('mouseleave', () => {
                isPaused = false;
            });

            // Start the interval to autoplay slides only if data-bs-ride="carousel" is set.
            const ride = element.getAttribute('data-bs-ride') || element.getAttribute('data-ride');

            // If ride is "carousel", start autoplay immediately.
            // If ride is "true", start autoplay only after first user interaction.
            if (interval > 0 && (ride === 'carousel' || ride === 'true')) {
                if (interval > 0 && ride === 'true') {
                    isPaused = true; // Start paused.
                    let autoplayStarted = false;
                    const startAutoplay = () => {
                        if (!autoplayStarted) {
                            isPaused = false;
                            autoplayStarted = true;
                        }
                    };

                    // Listen for first interaction: click, touch, or keyboard.
                    element.addEventListener('click', startAutoplay, { once: true });
                    element.addEventListener('touchstart', startAutoplay, { once: true });
                    element.addEventListener('keydown', startAutoplay, { once: true });
                }

                const intervalId = window.setInterval(() => {
                    if (!CoreDom.isElementInDom(element)) {
                        // The carousel has been removed from the DOM. Stop the interval.
                        window.clearInterval(intervalId);

                        return;
                    }

                    if (isPaused) {
                        return;
                    }

                    const items = Array.from(element.querySelectorAll<HTMLElement>('.carousel-item'));
                    const activeIndex = items.findIndex(item => item.classList.contains('active'));
                    const nextIndex = (activeIndex + 1) % items.length;
                    goToSlide(nextIndex, 'next');
                }, interval);
            }

            // Initial aria-current setup.
            updateIndicator();
        });
    }

    /**
     * Get the target element for a Bootstrap component.
     * This will look for the data-bs-target or data-target attribute on the element,
     * and if not found, it will look for the href attribute.
     * If the href attribute is a valid selector (starts with # or .), it will return the element
     * matching that selector within the rootElement.
     * If no valid target is found, it will return undefined.
     *
     * @param rootElement Element where to search for the target.
     * @param element Element to get the target from.
     * @returns The target element or undefined.
     *
     * Adapted from Bootstrap 5 dom/selector-engine.js
     */
    protected static getTargets(rootElement: HTMLElement, element: HTMLElement): HTMLElement[] | undefined {
        let selector = element.getAttribute('data-bs-target') || element.getAttribute('data-target');
        if (!selector || selector === '#') {
            let hrefAttribute = element.getAttribute('href');
            hrefAttribute = !hrefAttribute && element.getAttribute('aria-controls')
                ? `#${element.getAttribute('aria-controls')}`
                : hrefAttribute;

            // The only valid content that could double as a selector are IDs or classes,
            // so everything starting with `#` or `.`. If a "real" URL is used as the selector,
            // `document.querySelector` will rightfully complain it is invalid.
            // See https://github.com/twbs/bootstrap/issues/32273
            if (!hrefAttribute || (!hrefAttribute.includes('#') && !hrefAttribute.startsWith('.'))) {
                return;
            }

            // Just in case some CMS puts out a full URL with the anchor appended
            if (hrefAttribute.includes('#') && !hrefAttribute.startsWith('#')) {
                hrefAttribute = `#${hrefAttribute.split('#')[1]}`;
            }

            selector = hrefAttribute && hrefAttribute !== '#' ? hrefAttribute.trim() : null;
        }

        if (!selector) {
            return;
        }

        return Array.from(rootElement.querySelectorAll<HTMLElement>(selector)) || undefined;
    }

}
