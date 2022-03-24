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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver } from '@singletons/events';

/**
 * Singleton with helper functions for dom.
 */
export class CoreDom {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Retrieve the position of a element relative to another element.
     *
     * @param element Element to get the position.
     * @param parent Parent element to get relative position.
     * @return X and Y position.
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
     * @return True if element has been added to the DOM, false otherwise.
     */
    static isElementInDom(element: HTMLElement): boolean {
        return element.getRootNode({ composed: true }) === document;
    }

    /**
     * Check whether an element is intersecting the intersectionRatio in viewport.
     *
     * @param element
     * @param intersectionRatio Intersection ratio (From 0 to 1).
     * @return True if in viewport.
     */
    static isElementInViewport(element: HTMLElement, intersectionRatio = 1): boolean {
        const elementRectangle = element.getBoundingClientRect();

        const elementArea = elementRectangle.width * elementRectangle.height;
        if (elementArea == 0) {
            return false;
        }

        const intersectionRectangle = {
            top: Math.max(0, elementRectangle.top),
            left: Math.max(0, elementRectangle.left),
            bottom: Math.min(window.innerHeight, elementRectangle.bottom),
            right: Math.min(window.innerWidth, elementRectangle.right),
        };

        const intersectionArea = (intersectionRectangle.right - intersectionRectangle.left) *
            (intersectionRectangle.bottom - intersectionRectangle.top);

        return intersectionArea / elementArea >= intersectionRatio;
    }

    /**
     * Check whether an element is visible or not.
     *
     * @param element Element.
     * @return True if element is visible inside the DOM.
     */
    static isElementVisible(element: HTMLElement): boolean {
        if (element.clientWidth === 0 || element.clientHeight === 0) {
            return false;
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

        slot.addEventListener('slotchange', slotListener);;
    }

    /**
     * Window resize is widely checked and may have many performance issues, debouce usage is needed to avoid calling it too much.
     * This function helps setting up the debounce feature and remove listener easily.
     *
     * @param resizeFunction Function to execute on resize.
     * @param debounceDelay Debounce time in ms.
     * @return Event observer to call off when finished.
     */
    static onWindowResize(resizeFunction: (ev?: Event) => void, debounceDelay = 20): CoreEventObserver {
        const resizeListener = CoreUtils.debounce(async (ev?: Event) => {
            await CoreDomUtils.waitForResizeDone();

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
     * @return Wether the scroll suceeded.
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

        await CoreDom.waitToBeVisible(element);

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
     * @return True if the element is found, false otherwise.
     */
    static async scrollToInputError(container: HTMLElement): Promise<boolean> {
        return CoreDom.scrollToElement(container, '.core-input-error');
    }

    /**
     * Has the scroll reached bottom?
     *
     * @param scrollElement Scroll Element.
     * @param marginError Error margin when calculating.
     * @return Wether the scroll reached the bottom.
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
     * @return Promise resolved when done.
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
     * @return Cancellable promise.
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
     * @return Cancellable promise.
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
     * Wait an element to be in dom and visible.
     *
     * @param element Element to wait.
     * @param intersectionRatio Intersection ratio (From 0 to 1).
     * @return Cancellable promise.
     */
    static waitToBeInViewport(element: HTMLElement, intersectionRatio = 1): CoreCancellablePromise<void> {
        const visiblePromise = CoreDom.waitToBeVisible(element);

        let intersectionObserver: IntersectionObserver;
        let interval: number | undefined;

        return new CoreCancellablePromise<void>(
            async (resolve) => {
                await visiblePromise;

                if (CoreDom.isElementInViewport(element, intersectionRatio)) {

                    return resolve();
                }

                if ('IntersectionObserver' in window) {
                    intersectionObserver = new IntersectionObserver((observerEntries) => {
                        const isIntersecting = observerEntries
                            .some((entry) => entry.isIntersecting && entry.intersectionRatio >= intersectionRatio);
                        if (!isIntersecting) {
                            return;
                        }

                        resolve();
                        intersectionObserver?.disconnect();
                    });

                    intersectionObserver.observe(element);
                } else {
                    interval = window.setInterval(() => {
                        if (!CoreDom.isElementInViewport(element, intersectionRatio)) {
                            return;
                        }

                        resolve();
                        window.clearInterval(interval);
                    }, 50);
                }
            },
            () => {
                visiblePromise.cancel();
                intersectionObserver?.disconnect();
                window.clearInterval(interval);
            },
        );
    }

    /**
     * Wait an element to be in dom and visible.
     *
     * @param element Element to wait.
     * @return Cancellable promise.
     */
    static waitToBeVisible(element: HTMLElement): CoreCancellablePromise<void> {
        const domPromise = CoreDom.waitToBeInDOM(element);

        let interval: number | undefined;

        // Mutations did not observe for visibility properties.
        return new CoreCancellablePromise<void>(
            async (resolve) => {
                await domPromise;

                if (CoreDom.isElementVisible(element)) {
                    return resolve();
                }

                interval = window.setInterval(() => {
                    if (!CoreDom.isElementVisible(element)) {
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
