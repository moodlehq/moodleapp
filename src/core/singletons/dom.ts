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

import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver } from '@singletons/events';
import { CorePlatform } from '@services/platform';
import { CoreWait } from './wait';

/**
 * Singleton with helper functions for dom.
 */
export class CoreDom {

    static fontSizeZoom: number | null = null;

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Perform a dom closest function piercing the shadow DOM.
     *
     * @param node DOM Element.
     * @param selector Selector to search.
     * @returns Closest ancestor or null if not found.
     */
    static closest<T = HTMLElement>(node: HTMLElement | Node | null, selector: string): T | null {
        if (!node) {
            return null;
        }

        if (node instanceof ShadowRoot) {
            return CoreDom.closest(node.host, selector);
        }

        if (node instanceof HTMLElement) {
            if (node.matches(selector)) {
                return node as unknown as T;
            } else {
                return CoreDom.closest<T>(node.parentNode, selector);
            }
        }

        return CoreDom.closest<T>(node.parentNode, selector);
    }

    /**
     * Check if an element has some text or embedded content inside.
     *
     * @param element Element or document to check.
     * @returns Whether has content.
     */
    static elementHasContent(element: Element | DocumentFragment): boolean {
        const textContent = (element.textContent ?? '').trim().replace(/(\r\n|\n|\r)/g, '');
        if (textContent.length > 0) {
            return true;
        }

        return element.querySelectorAll(
            'img, audio, video, object, iframe, canvas, svg, input, select, textarea, frame, embed',
        ).length > 0;
    }

    /**
     * Retrieve the position of a element relative to another element.
     *
     * @param element Element to get the position.
     * @param parent Parent element to get relative position.
     * @returns X and Y position.
     */
    static getRelativeElementPosition(element: HTMLElement, parent: HTMLElement): CoreCoordinates {
        // Get the top, left coordinates of two elements
        const elementRectangle = element.getBoundingClientRect();
        const parentRectangle = parent.getBoundingClientRect();

        // Calculate the top and left positions.
        return {
            x: elementRectangle.x - parentRectangle.x,
            y: elementRectangle.y - parentRectangle.y,
        };
    }

    /**
     * Check whether an element has been added to the DOM.
     *
     * @param element Element.
     * @returns True if element has been added to the DOM, false otherwise.
     */
    static isElementInDom(element: HTMLElement): boolean {
        return element.getRootNode({ composed: true }) === document;
    }

    /**
     * Check whether an element is intersecting the intersectionRatio in viewport.
     *
     * @param element Element to check.
     * @param intersectionRatio Intersection ratio (From 0 to 1).
     * @param container Container where element is located
     * @returns True if in viewport.
     */
    static isElementInViewport(element: HTMLElement, intersectionRatio = 1, container: HTMLElement | null = null): boolean {
        const elementRectangle = element.getBoundingClientRect();
        const containerRectangle = container?.getBoundingClientRect();
        const elementArea = elementRectangle.width * elementRectangle.height;

        if (elementArea == 0) {
            return false;
        }

        const intersectionRectangle = {
            top: Math.max(containerRectangle?.top ?? 0, elementRectangle.top),
            left: Math.max(containerRectangle?.left ?? 0, elementRectangle.left),
            bottom: Math.min(containerRectangle?.bottom ?? window.innerHeight, elementRectangle.bottom),
            right: Math.min(containerRectangle?.right ?? window.innerWidth, elementRectangle.right),
        };

        const intersectionArea = (intersectionRectangle.right - intersectionRectangle.left) *
            (intersectionRectangle.bottom - intersectionRectangle.top);

        return intersectionArea / elementArea >= intersectionRatio;
    }

    /**
     * Check whether an element is visible or not.
     *
     * @param element Element.
     * @param checkSize Wether to check size to check for visibility.
     * @returns True if element is visible inside the DOM.
     */
    static isElementVisible(element: HTMLElement, checkSize = true): boolean {
        if (checkSize) {
            const dimensions = element.getBoundingClientRect();

            if (dimensions.width === 0 || dimensions.height === 0) {
                return false;
            }
        }

        const style = getComputedStyle(element);
        if (style.opacity === '0' || style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }

        return CoreDom.isElementInDom(element);
    }

    /**
     * Runs a function when an element has been slotted.
     *
     * @param element HTML Element inside an ion-content to wait for slot.
     * @param callback Function to execute on resize.
     */
    static onElementSlot(element: HTMLElement, callback: (ev?: Event) => void): void {
        if (!element.slot) {
            // Element not declared to be slotted.
            return;
        }

        const slotName = element.slot;
        if (element.assignedSlot?.name === slotName) {
            // Slot already assigned.
            callback();

            return;
        }

        const content = element.closest('ion-content');
        if (!content || !content.shadowRoot) {
            // Cannot find content.
            return;
        }

        const slots = content.shadowRoot.querySelectorAll('slot');
        const slot = Array.from(slots).find((slot) => slot.name === slotName);

        if (!slot) {
            // Slot not found.
            return;
        }

        const slotListener = () => {
            if (element.assignedSlot?.name !== slotName) {
                return;
            }

            callback();
            // It would happen only once.
            slot.removeEventListener('slotchange', slotListener);
        };

        slot.addEventListener('slotchange', slotListener);
    }

    /**
     * Window resize is widely checked and may have many performance issues, debouce usage is needed to avoid calling it too much.
     * This function helps setting up the debounce feature and remove listener easily.
     *
     * @param resizeFunction Function to execute on resize.
     * @param debounceDelay Debounce time in ms.
     * @returns Event observer to call off when finished.
     */
    static onWindowResize(resizeFunction: (ev?: Event) => void, debounceDelay = 20): CoreEventObserver {
        const resizeListener = CoreUtils.debounce(async (ev?: Event) => {
            await CoreWait.waitForResizeDone();

            resizeFunction(ev);
        }, debounceDelay);

        window.addEventListener('resize', resizeListener);

        return {
            off: (): void => {
                window.removeEventListener('resize', resizeListener);
            },
        };
    }

    /**
     * Scroll to a certain element.
     *
     * @param element The element to scroll to.
     * @param selector Selector to find the element to scroll to inside the defined element.
     * @param scrollOptions Scroll Options.
     * @returns Wether the scroll suceeded.
     */
    static async scrollToElement(element: HTMLElement, selector?: string, scrollOptions: CoreScrollOptions = {}): Promise<boolean> {
        if (selector) {
            const foundElement = await CoreDom.waitToBeInsideElement(element, selector);
            if (!foundElement) {
                // Element not found.
                return false;
            }

            element = foundElement;
        }

        await CoreDom.waitToBeVisible(element, false);

        const content = element.closest<HTMLIonContentElement>('ion-content') ?? undefined;
        if (!content) {
            // Content to scroll, not found.
            return false;
        }

        try {
            const position = CoreDom.getRelativeElementPosition(element, content);
            const scrollElement = await content.getScrollElement();

            scrollOptions.duration = scrollOptions.duration ?? 200;
            scrollOptions.addXAxis = scrollOptions.addXAxis ?? 0;
            scrollOptions.addYAxis = scrollOptions.addYAxis ?? 0;

            await content.scrollToPoint(
                position.x + scrollElement.scrollLeft + scrollOptions.addXAxis,
                position.y + scrollElement.scrollTop + scrollOptions.addYAxis,
                scrollOptions.duration,
            );

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Search for an input with error (core-input-error directive) and scrolls to it if found.
     *
     * @param container The element that contains the element that must be scrolled.
     * @returns True if the element is found, false otherwise.
     */
    static async scrollToInputError(container: HTMLElement): Promise<boolean> {
        return CoreDom.scrollToElement(container, '.core-input-error');
    }

    /**
     * Has the scroll reached bottom?
     *
     * @param scrollElement Scroll Element.
     * @param marginError Error margin when calculating.
     * @returns Wether the scroll reached the bottom.
     */
    static scrollIsBottom(scrollElement?: HTMLElement, marginError = 0): boolean {
        if (!scrollElement) {
            return true;
        }

        return scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - marginError;
    }

    /**
     * Move element to content so it can be slotted.
     *
     * @param element HTML Element.
     * @param slot Slot name.
     * @returns Promise resolved when done.
     */
    static slotOnContent(element: HTMLElement, slot = 'fixed'): CoreCancellablePromise<void> {
        element.setAttribute('slot', slot);
        if (element.parentElement?.nodeName === 'ION-CONTENT') {
            return CoreCancellablePromise.resolve();
        }

        const domPromise = CoreDom.waitToBeInDOM(element);

        return new CoreCancellablePromise<void>(
            async (resolve) => {
                await domPromise;

                // Move element to the nearest ion-content if it's not the parent
                if (element.parentElement?.nodeName !== 'ION-CONTENT') {
                    element.closest('ion-content')?.appendChild(element);
                }

                resolve();
            },
            () => {
                domPromise.cancel();
            },
        );
    }

    /**
     * Wait an element to be added to the root DOM.
     *
     * @param element Element to wait.
     * @returns Cancellable promise.
     */
    static waitToBeInDOM(element: HTMLElement): CoreCancellablePromise<void> {
        const root = element.getRootNode({ composed: true });

        if (root === document) {
            // Already in DOM.
            return CoreCancellablePromise.resolve();
        }

        let observer: MutationObserver;

        return new CoreCancellablePromise<void>(
            (resolve) => {
                observer = new MutationObserver(() => {
                    const root = element.getRootNode({ composed: true });

                    if (root !== document) {
                        return;
                    }

                    observer?.disconnect();
                    resolve();
                });

                observer.observe(document.body, { subtree: true, childList: true });
            },
            () => {
                observer?.disconnect();
            },
        );
    }

    /**
     * Wait an element to be in dom of another element using a selector
     *
     * @param container Element to wait.
     * @returns Cancellable promise.
     */
    static async waitToBeInsideElement(container: HTMLElement, selector: string): Promise<CoreCancellablePromise<HTMLElement>> {
        await CoreDom.waitToBeInDOM(container);

        let element = container.querySelector<HTMLElement>(selector);
        if (element) {
            // Already in DOM.
            return CoreCancellablePromise.resolve(element);
        }

        let observer: MutationObserver;

        return new CoreCancellablePromise<HTMLElement>(
            (resolve) => {
                observer = new MutationObserver(() => {
                    element = container.querySelector<HTMLElement>(selector);

                    if (!element) {
                        return;
                    }

                    observer?.disconnect();
                    resolve(element);
                });

                observer.observe(container, { subtree: true, childList: true });
            },
            () => {
                observer?.disconnect();
            },
        );
    }

    /**
     * Watch whenever an elements visibility changes within the viewport.
     *
     * @param element Element to watch.
     * @param intersectionRatio Intersection ratio (From 0 to 1).
     * @param callback Callback when visibility changes.
     * @returns Function to stop watching.
     */
    static watchElementInViewport(
        element: HTMLElement,
        intersectionRatio: number,
        callback: (visible: boolean) => void,
    ): () => void;

    /**
     * Watch whenever an elements visibility changes within the viewport.
     *
     * @param element Element to watch.
     * @param callback Callback when visibility changes.
     * @returns Function to stop watching.
     */
    static watchElementInViewport(element: HTMLElement, callback: (visible: boolean) => void): () => void;

    static watchElementInViewport(
        element: HTMLElement,
        intersectionRatioOrCallback: number | ((visible: boolean) => void),
        callback?: (visible: boolean) => void,
    ): () => void {
        const visibleCallback = callback ?? intersectionRatioOrCallback as (visible: boolean) => void;
        const intersectionRatio = typeof intersectionRatioOrCallback === 'number' ? intersectionRatioOrCallback : 1;

        let visible = CoreDom.isElementInViewport(element, intersectionRatio);
        const setVisible = (newValue: boolean) => {
            if (visible === newValue) {
                return;
            }

            visible = newValue;
            visibleCallback(visible);
        };

        if (!('IntersectionObserver' in window)) {
            const interval = setInterval(() => setVisible(CoreDom.isElementInViewport(element, intersectionRatio)), 50);

            return () => clearInterval(interval);
        }

        const observer = new IntersectionObserver(([{ isIntersecting, intersectionRatio }]) => {
            setVisible(isIntersecting && intersectionRatio >= intersectionRatio);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }

    /**
     * Wait an element to be in dom and visible.
     *
     * @param element Element to wait.
     * @param intersectionRatio Intersection ratio (From 0 to 1).
     * @returns Cancellable promise.
     */
    static waitToBeInViewport(element: HTMLElement, intersectionRatio = 1): CoreCancellablePromise<void> {
        let unsubscribe: (() => void) | undefined;
        const visiblePromise = CoreDom.waitToBeVisible(element);

        return new CoreCancellablePromise<void>(
            async (resolve) => {
                await visiblePromise;

                if (CoreDom.isElementInViewport(element, intersectionRatio)) {
                    return resolve();
                }

                unsubscribe = this.watchElementInViewport(element, intersectionRatio, inViewport => {
                    if (!inViewport) {
                        return;
                    }

                    resolve();
                    unsubscribe?.();
                });
            },
            () => {
                visiblePromise.cancel();
                unsubscribe?.();
            },
        );
    }

    /**
     * Wait an element to be in dom and visible.
     *
     * @param element Element to wait.
     * @param checkSize Wether to check size to check for visibility.
     * @returns Cancellable promise.
     */
    static waitToBeVisible(element: HTMLElement, checkSize = true): CoreCancellablePromise<void> {
        const domPromise = CoreDom.waitToBeInDOM(element);

        let interval: number | undefined;

        // Mutations did not observe for visibility properties.
        return new CoreCancellablePromise<void>(
            async (resolve) => {
                await domPromise;

                if (CoreDom.isElementVisible(element, checkSize)) {
                    return resolve();
                }

                interval = window.setInterval(() => {
                    if (!CoreDom.isElementVisible(element, checkSize)) {
                        return;
                    }

                    resolve();
                    window.clearInterval(interval);
                }, 50);
            },
            () => {
                domPromise.cancel();
                window.clearInterval(interval);
            },
        );
    }

    /**
     * Initializes a clickable element a11y calling the click action when pressed enter or space
     * and adding tabindex and role if needed.
     *
     * @param element Element to listen to events.
     * @param callback Callback to call when clicked or the key is pressed.
     * @param setTabIndex Whether to set tabindex and role.
     */
    static initializeClickableElementA11y(
        element: HTMLElement & {disabled?: boolean},
        callback: (event: MouseEvent | KeyboardEvent) => void,
        setTabIndex = true,
    ): void {
        const enabled = () => !CoreUtils.isTrueOrOne(element.dataset.disabledA11yClicks ?? 'false');

        element.addEventListener('click', (event) => enabled() && callback(event));

        element.addEventListener('keydown', (event) => {
            if (!enabled()) {
                return;
            }

            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        element.addEventListener('keyup', (event) => {
            if (!enabled()) {
                return;
            }

            if (event.key === ' ' || event.key === 'Enter') {
                callback(event);

                event.preventDefault();
                event.stopPropagation();
            }
        });

        if (setTabIndex && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
            // Set tabindex if not previously set.
            if (element.getAttribute('tabindex') === null) {
                element.setAttribute('tabindex', element.disabled ? '-1' : '0');
            }

            // Set role if not previously set.
            if (!element.getAttribute('role')) {
                element.setAttribute('role', 'button');
            }

            element.classList.add('clickable');
        }
    }

    /**
     * Get CSS property value from computed styles.
     *
     * @param styles Computed styles.
     * @param property Property name.
     * @returns Property CSS value (may not be the same as the computed value).
     */
    static getCSSPropertyValue(styles: CSSStyleDeclaration, property: string): string {
        const value = styles.getPropertyValue(property);

        if (property === 'font-size') {
            if (this.fontSizeZoom === null) {
                const baseFontSize = 20;
                const span = document.createElement('span');
                span.style.opacity = '0';
                span.style.fontSize = `${baseFontSize}px`;

                document.body.append(span);

                this.fontSizeZoom = baseFontSize / Number(getComputedStyle(span).fontSize.slice(0, -2));

                span.remove();
            }

            if (this.fontSizeZoom !== 1) {
                return `calc(${this.fontSizeZoom} * ${value})`;
            }
        }

        return value;
    }

    /**
     * Replace tags on HTMLElement.
     *
     * @param element HTML Element where to replace the tags.
     * @param originTags Origin tag to be replaced.
     * @param destinationTags Destination tag to replace.
     * @returns Element with tags replaced.
     */
    static replaceTags<T extends HTMLElement = HTMLElement>(
        element: T,
        originTags: string | string[],
        destinationTags: string | string[],
    ): T {
        if (typeof originTags === 'string') {
            originTags = [originTags];
        }

        if (typeof destinationTags === 'string') {
            destinationTags = [destinationTags];
        }

        if (originTags.length !== destinationTags.length) {
            // Do nothing, incorrect input.
            return element;
        }

        originTags.forEach((originTag, index) => {
            const destinationTag = destinationTags[index];
            const elems = Array.from(element.getElementsByTagName(originTag));

            elems.forEach((elem) => {
                const newElem = document.createElement(destinationTag);
                newElem.innerHTML = elem.innerHTML;

                if (elem.hasAttributes()) {
                    const attrs = Array.from(elem.attributes);
                    attrs.forEach((attr) => {
                        newElem.setAttribute(attr.name, attr.value);
                    });
                }

                elem.parentNode?.replaceChild(newElem, elem);
            });
        });

        return element;
    }

    /**
     * Prefix CSS rules.
     *
     * @param css CSS code.
     * @param prefix Prefix to add to CSS rules.
     * @param prefixIfNested Prefix to add to CSS rules if nested. It may happend we need different prefixes.
     *          Ie: If nested is supported ::ng-deep is not needed.
     * @returns Prefixed CSS.
     */
    static prefixCSS(css: string, prefix: string, prefixIfNested?: string): string {
        if (!css) {
            return '';
        }

        if (!prefix) {
            return css;
        }

        // Check if browser supports CSS nesting.
        const supportsNesting = CorePlatform.supportsCSSNesting();
        if (supportsNesting) {
            prefixIfNested = prefixIfNested ?? prefix;

            // Wrap the CSS with the prefix.
            return `${prefixIfNested} { ${css} }`;
        }

        // Fallback.
        // Remove comments first.
        let regExp = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
        css = css.replace(regExp, '');

        // Add prefix.
        regExp = /([^]*?)({[^]*?}|,)/g;

        return css.replace(regExp, prefix + ' $1 $2');
    }

}

/**
 * Coordinates of an element.
 */
export type CoreCoordinates = {
    x: number; // X axis coordinates.
    y: number; // Y axis coordinates.
};

/**
 * Scroll options.
 */
export type CoreScrollOptions = {
    duration?: number;
    addYAxis?: number;
    addXAxis?: number;
};

/**
 * Source of a media element.
 */
export type CoreMediaSource = {
    src: string;
    type?: string;
};
