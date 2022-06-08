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

import { CoreUtils } from '@services/utils/utils';
import { NgZone } from '@singletons';
import { TestsBehatBlocking } from './behat-blocking';
import { TestBehatElementLocator } from './behat-runtime';

// Containers that block containers behind them.
const blockingContainers = ['ION-ALERT', 'ION-POPOVER', 'ION-ACTION-SHEET', 'CORE-USER-TOURS-USER-TOUR', 'ION-PAGE'];

/**
 * Behat Dom Utils helper functions.
 */
export class TestsBehatDomUtils {

    /**
     * Check if an element is visible.
     *
     * @param element Element.
     * @param container Container.
     * @return Whether the element is visible or not.
     */
    static isElementVisible(element: HTMLElement, container: HTMLElement): boolean {
        if (element.getAttribute('aria-hidden') === 'true' || getComputedStyle(element).display === 'none') {
            return false;
        }

        const parentElement = this.getParentElement(element);
        if (parentElement === container) {
            return true;
        }

        if (!parentElement) {
            return false;
        }

        return this.isElementVisible(parentElement, container);
    }

    /**
     * Check if an element is selected.
     *
     * @param element Element.
     * @param container Container.
     * @return Whether the element is selected or not.
     */
    static isElementSelected(element: HTMLElement, container: HTMLElement): boolean {
        const ariaCurrent = element.getAttribute('aria-current');
        if (
            (ariaCurrent && ariaCurrent !== 'false') ||
            (element.getAttribute('aria-selected') === 'true') ||
            (element.getAttribute('aria-checked') === 'true')
        ) {
            return true;
        }

        const parentElement = this.getParentElement(element);
        if (!parentElement || parentElement === container) {
            return false;
        }

        return this.isElementSelected(parentElement, container);
    };

    /**
     * Finds elements within a given container with exact info.
     *
     * @param container Parent element to search the element within
     * @param text Text to look for
     * @return Elements containing the given text with exact boolean.
     */
    protected static findElementsBasedOnTextWithinWithExact(container: HTMLElement, text: string): ElementsWithExact[] {
        const attributesSelector = `[aria-label*="${text}"], a[title*="${text}"], img[alt*="${text}"]`;

        const elements = Array.from(container.querySelectorAll<HTMLElement>(attributesSelector))
            .filter((element => this.isElementVisible(element, container)))
            .map((element) => {
                const exact = this.checkElementLabel(element, text);

                return { element, exact };
            });

        const treeWalker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_TEXT,  // eslint-disable-line no-bitwise
            {
                acceptNode: node => {
                    if (node instanceof HTMLStyleElement ||
                        node instanceof HTMLLinkElement ||
                        node instanceof HTMLScriptElement) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (node instanceof HTMLElement &&
                        (node.getAttribute('aria-hidden') === 'true' || getComputedStyle(node).display === 'none')) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                },
            },
        );

        let currentNode: Node | null = null;
        // eslint-disable-next-line no-cond-assign
        while (currentNode = treeWalker.nextNode()) {
            if (currentNode instanceof Text) {
                if (currentNode.textContent?.includes(text) && currentNode.parentElement) {
                    elements.push({
                        element: currentNode.parentElement,
                        exact: currentNode.textContent.trim() === text,
                    });
                }

                continue;
            }

            if (currentNode instanceof HTMLElement) {
                const labelledBy = currentNode.getAttribute('aria-labelledby');
                const labelElement = labelledBy && container.querySelector<HTMLElement>(`#${labelledBy}`);
                if (labelElement && labelElement.innerText && labelElement.innerText.includes(text)) {
                    elements.push({
                        element: currentNode,
                        exact: labelElement.innerText.trim() == text,
                    });

                    continue;
                }
            }

            if (currentNode instanceof Element && currentNode.shadowRoot) {
                for (const childNode of Array.from(currentNode.shadowRoot.childNodes)) {
                    if (!(childNode instanceof HTMLElement) || (
                        childNode instanceof HTMLStyleElement ||
                        childNode instanceof HTMLLinkElement ||
                        childNode instanceof HTMLScriptElement)) {
                        continue;
                    }

                    if (childNode.matches(attributesSelector)) {
                        elements.push({
                            element: childNode,
                            exact: this.checkElementLabel(childNode, text),
                        });

                        continue;
                    }

                    elements.push(...this.findElementsBasedOnTextWithinWithExact(childNode, text));
                }
            }
        }

        return elements;
    };

    /**
     * Checks an element has exactly the same label (title, alt or aria-label).
     *
     * @param element Element to check.
     * @param text Text to check.
     * @return If text matches any of the label attributes.
     */
    protected static checkElementLabel(element: HTMLElement, text: string): boolean {
        return element.title === text ||
            element.getAttribute('alt') === text ||
            element.getAttribute('aria-label') === text;
    }

    /**
     * Finds elements within a given container.
     *
     * @param container Parent element to search the element within.
     * @param text Text to look for.
     * @return Elements containing the given text.
     */
    protected static findElementsBasedOnTextWithin(container: HTMLElement, text: string): HTMLElement[] {
        const elements = this.findElementsBasedOnTextWithinWithExact(container, text);

        // Give more relevance to exact matches.
        elements.sort((a, b) => Number(b.exact) - Number(a.exact));

        return elements.map(element => element.element);
    };

    /**
     * Given a list of elements, get the top ancestors among all of them.
     *
     * This will remote duplicates and drop any elements nested within each other.
     *
     * @param elements Elements list.
     * @return Top ancestors.
     */
    protected static getTopAncestors(elements: HTMLElement[]): HTMLElement[] {
        const uniqueElements = new Set(elements);

        for (const element of uniqueElements) {
            for (const otherElement of uniqueElements) {
                if (otherElement === element) {
                    continue;
                }

                if (element.contains(otherElement)) {
                    uniqueElements.delete(otherElement);
                }
            }
        }

        return Array.from(uniqueElements);
    };

    /**
     * Get parent element, including Shadow DOM parents.
     *
     * @param element Element.
     * @return Parent element.
     */
    protected static getParentElement(element: HTMLElement): HTMLElement | null {
        return element.parentElement ||
            (element.getRootNode() && (element.getRootNode() as ShadowRoot).host as HTMLElement) ||
            null;
    }

    /**
     * Get closest element matching a selector, without traversing up a given container.
     *
     * @param element Element.
     * @param selector Selector.
     * @param container Topmost container to search within.
     * @return Closest matching element.
     */
    protected static getClosestMatching(element: HTMLElement, selector: string, container: HTMLElement | null): HTMLElement | null {
        if (element.matches(selector)) {
            return element;
        }

        if (element === container || !element.parentElement) {
            return null;
        }

        return this.getClosestMatching(element.parentElement, selector, container);
    };

    /**
     * Function to find top container elements.
     *
     * @param containerName Whether to search inside the a container name.
     * @return Found top container elements.
     */
    protected static getCurrentTopContainerElements(containerName: string): HTMLElement[] {
        const topContainers: HTMLElement[] = [];
        let containers = Array.from(document.querySelectorAll<HTMLElement>([
            'ion-alert.hydrated',
            'ion-popover.hydrated',
            'ion-action-sheet.hydrated',
            'ion-modal.hydrated',
            'core-user-tours-user-tour.is-active',
            'ion-toast.hydrated',
            'page-core-mainmenu',
            'ion-app',
        ].join(', ')));

        containers = containers
            .filter(container => {
                if (container.tagName === 'ION-ALERT') {
                    // For some reason, in Behat sometimes alerts aren't removed from DOM, the close animation doesn't finish.
                    // Filter alerts with pointer-events none since that style is set before the close animation starts.
                    return container.style.pointerEvents !== 'none';
                }

                // Ignore pages that are inside other visible pages.
                return container.tagName !== 'ION-PAGE' || !container.closest('.ion-page.ion-page-hidden');
            })
            // Sort them by z-index.
            .sort((a, b) =>  Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex));

        if (containerName === 'split-view content') {
            // Find non hidden pages inside the containers.
            containers.some(container => {
                if (!container.classList.contains('ion-page')) {
                    return false;
                }

                const pageContainers = Array.from(container.querySelectorAll<HTMLElement>('.ion-page:not(.ion-page-hidden)'));
                let topContainer = pageContainers.find((page) => !page.closest('.ion-page.ion-page-hidden')) ?? null;

                topContainer = (topContainer || container).querySelector<HTMLElement>('core-split-view ion-router-outlet');
                topContainer && topContainers.push(topContainer);

                return !!topContainer;
            });

            return topContainers;
        }

        // Get containers until one blocks other views.
        containers.find(container => {
            if (container.tagName === 'ION-TOAST') {
                container = container.shadowRoot?.querySelector('.toast-container') || container;
            }
            topContainers.push(container);

            return blockingContainers.includes(container.tagName);
        });

        return topContainers;
    };

    /**
     * Function to find element based on their text or Aria label.
     *
     * @param locator Element locator.
     * @param containerName Whether to search only inside a specific container.
     * @return First found element.
     */
    static findElementBasedOnText(locator: TestBehatElementLocator, containerName = ''): HTMLElement {
        return this.findElementsBasedOnText(locator, containerName, true)[0];
    }

    /**
     * Function to find elements based on their text or Aria label.
     *
     * @param locator Element locator.
     * @param containerName Whether to search only inside a specific container.
     * @param stopWhenFound Stop looking in containers once an element is found.
     * @return Found elements
     */
    protected static findElementsBasedOnText(
        locator: TestBehatElementLocator,
        containerName = '',
        stopWhenFound = false,
    ): HTMLElement[] {
        const topContainers = this.getCurrentTopContainerElements(containerName);
        let elements: HTMLElement[] = [];

        for (let i = 0; i < topContainers.length; i++) {
            elements = elements.concat(this.findElementsBasedOnTextInContainer(locator, topContainers[i]));
            if (stopWhenFound && elements.length) {
                break;
            }
        }

        return elements;
    }

    /**
     * Function to find elements based on their text or Aria label.
     *
     * @param locator Element locator.
     * @param container Container to search in.
     * @return Found elements
     */
    protected static findElementsBasedOnTextInContainer(
        locator: TestBehatElementLocator,
        topContainer: HTMLElement,
    ): HTMLElement[] {
        let container: HTMLElement | null = topContainer;

        if (locator.within) {
            const withinElements = this.findElementsBasedOnTextInContainer(locator.within, topContainer);

            if (withinElements.length === 0) {
                throw new Error('There was no match for within text');
            } else if (withinElements.length > 1) {
                const withinElementsAncestors = this.getTopAncestors(withinElements);

                if (withinElementsAncestors.length > 1) {
                    throw new Error('Too many matches for within text');
                }

                topContainer = container = withinElementsAncestors[0];
            } else {
                topContainer = container = withinElements[0];
            }
        }

        if (topContainer && locator.near) {
            const nearElements = this.findElementsBasedOnTextInContainer(locator.near, topContainer);

            if (nearElements.length === 0) {
                throw new Error('There was no match for near text');
            } else if (nearElements.length > 1) {
                const nearElementsAncestors = this.getTopAncestors(nearElements);

                if (nearElementsAncestors.length > 1) {
                    throw new Error('Too many matches for near text');
                }

                container = this.getParentElement(nearElementsAncestors[0]);
            } else {
                container = this.getParentElement(nearElements[0]);
            }
        }

        do {
            if (!container) {
                break;
            }

            const elements = this.findElementsBasedOnTextWithin(container, locator.text);

            let filteredElements: HTMLElement[] = elements;

            if (locator.selector) {
                filteredElements = [];
                const selector = locator.selector;

                elements.forEach((element) => {
                    const closest = this.getClosestMatching(element, selector, container);
                    if (closest) {
                        filteredElements.push(closest);
                    }
                });
            }

            if (filteredElements.length > 0) {
                return filteredElements;
            }

        } while (container !== topContainer && (container = this.getParentElement(container)) && container !== topContainer);

        return [];
    };

    /**
     * Make sure that an element is visible and wait to trigger the callback.
     *
     * @param element Element.
     */
    protected static async ensureElementVisible(element: HTMLElement): Promise<DOMRect> {
        const initialRect = element.getBoundingClientRect();

        element.scrollIntoView(false);

        return new Promise<DOMRect>((resolve): void => {
            requestAnimationFrame(() => {
                const rect = element.getBoundingClientRect();

                if (initialRect.y !== rect.y) {
                    setTimeout(() => {
                        resolve(rect);
                    }, 300);

                    return;
                }

                resolve(rect);
            });
        });
    };

    /**
     * Press an element.
     *
     * @param element Element to press.
     */
    static async pressElement(element: HTMLElement): Promise<void> {
        NgZone.run(async () => {
            const blockKey = TestsBehatBlocking.block();

            // Events don't bubble up across Shadow DOM boundaries, and some buttons
            // may not work without doing this.
            const parentElement = this.getParentElement(element);

            if (parentElement && parentElement.matches('ion-button, ion-back-button')) {
                element = parentElement;
            }

            const rect = await this.ensureElementVisible(element);

            // Simulate a mouse click on the button.
            const eventOptions: MouseEventInit = {
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                bubbles: true,
                view: window,
                cancelable: true,
            };

            // There are some buttons in the app that don't respond to click events, for example
            // buttons using the core-supress-events directive. That's why we need to send both
            // click and mouse events.
            element.dispatchEvent(new MouseEvent('mousedown', eventOptions));

            setTimeout(() => {
                element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
                element.click();

                TestsBehatBlocking.unblock(blockKey);
            }, 300);
        });
    }

    /**
     * Set an element value.
     *
     * @param element HTML to set.
     * @param value Value to be set.
     */
    static async setElementValue(element: HTMLElement, value: string): Promise<void> {
        NgZone.run(async () => {
            const blockKey = TestsBehatBlocking.block();

            // Functions to get/set value depending on field type.
            let setValue = (text: string) => {
                element.innerHTML = text;
            };
            let getValue = () => element.innerHTML;

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                setValue = (text: string) => {
                    element.value = text;
                };
                getValue = () => element.value;
            }

            // Pretend we have cut and pasted the new text.
            let event: InputEvent;
            if (getValue() !== '') {
                event = new InputEvent('input', {
                    bubbles: true,
                    view: window,
                    cancelable: true,
                    inputType: 'deleteByCut',
                });

                await CoreUtils.nextTick();
                setValue('');
                element.dispatchEvent(event);
            }

            if (value !== '') {
                event = new InputEvent('input', {
                    bubbles: true,
                    view: window,
                    cancelable: true,
                    inputType: 'insertFromPaste',
                    data: value,
                });

                await CoreUtils.nextTick();
                setValue(value);
                element.dispatchEvent(event);
            }

            TestsBehatBlocking.unblock(blockKey);
        });
    }

}

type ElementsWithExact = {
    element: HTMLElement;
    exact: boolean;
};
