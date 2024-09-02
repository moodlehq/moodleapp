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
import { CorePromisedValue } from '@classes/promised-value';
import { CoreWait } from '@singletons/wait';
import { makeSingleton, NgZone } from '@singletons';
import { TestingBehatElementLocator, TestingBehatFindOptions } from './behat-runtime';

/**
 * Behat Dom Utils helper functions.
 */
@Injectable({ providedIn: 'root' })
export class TestingBehatDomUtilsService {

    protected static readonly MULTI_ELEM_ALLOWED = ['P', 'SPAN', 'ION-LABEL'];

    /**
     * Check if an element is clickable.
     *
     * @param element Element.
     * @returns Whether the element is clickable or not.
     */
    isElementClickable(element: HTMLElement): boolean {
        return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
    }

    /**
     * Check if an element is visible.
     *
     * @param element Element.
     * @param container Container. If set, the function will also check parent elements visibility.
     * @returns Whether the element is visible or not.
     */
    isElementVisible(element: HTMLElement, container?: HTMLElement): boolean {
        if (element.getAttribute('aria-hidden') === 'true' || getComputedStyle(element).display === 'none') {
            return false;
        }

        if (element.tagName === 'SWIPER-SLIDE') {
            // Check if the slide is visible (in the viewport).
            const bounding = element.getBoundingClientRect();
            if (bounding.right <= 0 || bounding.left >= window.innerWidth) {
                return false;
            }
        }

        if (element.slot === 'content' && element.parentElement?.tagName === 'ION-ACCORDION') {
            return element.parentElement.classList.contains('accordion-expanded');
        }

        if (!container) {
            return true;
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
     * @param firstCall Whether this is the first call of the function.
     * @returns Whether the element is selected or not.
     */
    isElementSelected(element: HTMLElement, firstCall = true): boolean {
        const ariaCurrent = element.getAttribute('aria-current');
        const ariaSelected = element.getAttribute('aria-selected');
        const ariaChecked = element.getAttribute('aria-checked');

        if (ariaCurrent || ariaSelected || ariaChecked) {
            return (!!ariaCurrent && ariaCurrent !== 'false') ||
                (!!ariaSelected && ariaSelected === 'true') ||
                (!!ariaChecked && ariaChecked === 'true');
        }

        if (firstCall) {
            const inputElement =  element.closest('ion-checkbox, ion-radio, ion-toggle')?.querySelector('input');
            if (inputElement) {
                return inputElement.value === 'on';
            }

            const tabButtonElement =  element.closest('ion-tab-button');
            if (tabButtonElement?.classList.contains('tab-selected')) {
                return true;
            }
        }

        const parentElement = this.getParentElement(element);
        if (!parentElement || parentElement.classList.contains('ion-page')) {
            return false;
        }

        return this.isElementSelected(parentElement, false);
    }

    /**
     * Finds elements within a given container with exact info.
     *
     * @param container Parent element to search the element within
     * @param text Text to look for
     * @param options Search options.
     * @returns Elements containing the given text with exact boolean.
     */
    protected findElementsBasedOnTextWithinWithExact(
        container: HTMLElement,
        text: string | string[],
        options: TestingBehatFindOptions,
    ): ElementsWithExact[] {
        if (Array.isArray(text)) {
            return text.map((text) => this.findElementsBasedOnTextWithinWithExact(container, text, options)).flat();
        }

        // Escape double quotes to prevent breaking the query selector.
        const escapedText = text.replace(/"/g, '\\"');
        const attributesSelector = `[aria-label*="${escapedText}"], a[title*="${escapedText}"], ` +
            `img[alt*="${escapedText}"], [placeholder*="${escapedText}"]`;

        const elements = Array.from(container.querySelectorAll<HTMLElement>(attributesSelector))
            .filter(
                element => this.isElementVisible(element, container) &&
                    (!options.onlyClickable || this.isElementClickable(element)),
            )
            .map((element) => {
                const exact = this.checkElementLabel(element, text);

                return { element, exact };
            });

        const treeWalker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_TEXT,  // eslint-disable-line no-bitwise
            {
                acceptNode: node => {
                    if (
                        node instanceof HTMLStyleElement ||
                        node instanceof HTMLLinkElement ||
                        node instanceof HTMLScriptElement
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (!(node instanceof HTMLElement)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    if (options.onlyClickable && !this.isElementClickable(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (!this.isElementVisible(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                },
            },
        );

        let fallbackCandidates: ElementsWithExact[] = [];
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

                    elements.push(...this.findElementsBasedOnTextWithinWithExact(childNode, text, options));
                }
            }

            // Allow searching text split into different elements in some cases.
            if (
                elements.length === 0 &&
                currentNode instanceof HTMLElement &&
                TestingBehatDomUtilsService.MULTI_ELEM_ALLOWED.includes(currentNode.tagName) &&
                currentNode.innerText.includes(text)
            ) {
                // Only keep the child elements in the candidates list.
                fallbackCandidates = fallbackCandidates.filter(entry => !entry.element.contains(currentNode));
                fallbackCandidates.push({
                    element: currentNode,
                    exact: currentNode.innerText.trim() == text,
                });
            }
        }

        return elements.length > 0 ? elements : fallbackCandidates;
    }

    /**
     * Checks an element has exactly the same label (title, alt or aria-label).
     *
     * @param element Element to check.
     * @param text Text to check.
     * @returns If text matches any of the label attributes.
     */
    protected checkElementLabel(element: HTMLElement, text: string): boolean {
        return element.title === text ||
            element.getAttribute('alt') === text ||
            element.getAttribute('aria-label') === text ||
            element.getAttribute('placeholder') === text;
    }

    /**
     * Finds elements within a given container.
     *
     * @param container Parent element to search the element within.
     * @param text Text to look for.
     * @param options Search options.
     * @returns Elements containing the given text.
     */
    protected findElementsBasedOnTextWithin(
        container: HTMLElement,
        text: string | string[],
        options: TestingBehatFindOptions,
    ): HTMLElement[] {
        const elements = this.findElementsBasedOnTextWithinWithExact(container, text, options);

        // Give more relevance to exact matches.
        elements.sort((a, b) => Number(b.exact) - Number(a.exact));

        return elements.map(element => element.element);
    }

    /**
     * Given a list of elements, get the top ancestors among all of them.
     *
     * This will remove duplicates and drop any elements nested within each other.
     *
     * @param elements Elements list.
     * @returns Top ancestors.
     */
    protected getTopAncestors(elements: HTMLElement[]): HTMLElement[] {
        const uniqueElements = new Set(elements);

        for (const element of uniqueElements) {
            for (const otherElement of uniqueElements) {
                if (otherElement === element) {
                    continue;
                }

                let documentPosition = element.compareDocumentPosition(otherElement);
                // eslint-disable-next-line no-bitwise
                if (documentPosition & Node.DOCUMENT_POSITION_DISCONNECTED) {
                    // Check if they are inside shadow DOM so we can compare their hosts.
                    const elementHost = this.getShadowDOMHost(element) || element;
                    const otherElementHost = this.getShadowDOMHost(otherElement) || otherElement;

                    documentPosition = elementHost.compareDocumentPosition(otherElementHost);
                }

                // eslint-disable-next-line no-bitwise
                if (documentPosition & Node.DOCUMENT_POSITION_CONTAINS) {
                    uniqueElements.delete(otherElement);
                }
            }
        }

        return Array.from(uniqueElements);
    }

    /**
     * Get parent element, including Shadow DOM parents.
     *
     * @param element Element.
     * @returns Parent element.
     */
    protected getParentElement(element: HTMLElement): HTMLElement | null {
        return element.parentElement || this.getShadowDOMHost(element);
    }

    /**
     * Get shadow DOM host element.
     *
     * @param element Element.
     * @returns Shadow DOM host element.
     */
    protected getShadowDOMHost(element: HTMLElement): HTMLElement | null {
        const node = element.getRootNode();
        if (node instanceof ShadowRoot) {
            return node.host as HTMLElement;
        }

        return null;
    }

    /**
     * Get closest element matching a selector, without traversing up a given container.
     *
     * @param element Element.
     * @param selector Selector.
     * @param container Topmost container to search within.
     * @returns Closest matching element.
     */
    protected getClosestMatching(element: HTMLElement, selector: string, container: HTMLElement | null): HTMLElement | null {
        if (element.matches(selector)) {
            return element;
        }

        if (element === container || !element.parentElement) {
            return null;
        }

        return this.getClosestMatching(element.parentElement, selector, container);
    }

    /**
     * Function to find top container elements.
     *
     * @param containerName Whether to search inside the a container name.
     * @returns Found top container elements.
     */
    protected getCurrentTopContainerElements(containerName: string): HTMLElement[] {
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
                if (!this.isElementVisible(container)) {
                    // Ignore containers not visible.
                    return false;
                }

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
        containers.some(container => {
            if (container.tagName === 'ION-TOAST') {
                container = container.shadowRoot?.querySelector('.toast-container') || container;
            }
            topContainers.push(container);

            // If container has backdrop it blocks the rest of the UI.
            return container.querySelector(':scope > ion-backdrop') || container.classList.contains('backdrop');
        });

        return topContainers;
    }

    /**
     * Find a field.
     *
     * @param field Field name.
     * @returns Field element.
     */
    findField(field: string): HTMLElement | HTMLInputElement | undefined {
        const selector =
            'input, textarea, core-rich-text-editor, [contenteditable="true"], ion-select, ion-datetime-button, ion-datetime';

        let input = this.findElementBasedOnText(
            { text: field, selector },
            { onlyClickable: false, containerName: '' },
        );

        if (input?.tagName === 'CORE-RICH-TEXT-EDITOR') {
            input = input.querySelector<HTMLElement>('[contenteditable="true"]') || undefined;
        }

        if (input) {
            return input;
        }

        const label = this.findElementBasedOnText(
            { text: field, selector: 'label' },
            { onlyClickable: false, containerName: '' },
        );

        if (label) {
            const inputId = label.getAttribute('for');

            if (inputId) {
                const element = document.getElementById(inputId) || undefined;
                if (element?.tagName !== 'ION-DATETIME-BUTTON') {
                    return element;
                }

                // Search the ion-datetime associated with the button.
                const datetimeId = (<HTMLIonDatetimeButtonElement> element).datetime;
                const datetime = document.querySelector<HTMLElement>(`ion-datetime#${datetimeId}`);

                return datetime || undefined;
            }

            input = this.getShadowDOMHost(label) || undefined;

            // Add support for other input types if required by adding them to the array.
            const ionicInputFields = ['ION-INPUT', 'ION-TEXTAREA', 'ION-SELECT', 'ION-DATETIME', 'ION-TOGGLE'];
            if (input && ionicInputFields.includes(input.tagName)) {
                return input;
            }
        }
    }

    /**
     * Function to find element based on their text or Aria label.
     *
     * @param locator Element locator.
     * @param options Search options.
     * @returns First found element.
     */
    findElementBasedOnText(
        locator: TestingBehatElementLocator,
        options: TestingBehatFindOptions = {},
    ): HTMLElement | undefined {
        if (Array.isArray(locator.text)) {
            for (const text of locator.text) {
                const element = this.findElementBasedOnText({ ...locator, text });
                if (element) {
                    return element;
                }
            }

            return undefined;
        }

        // Remove extra spaces.
        const treatedText = locator.text.trim().replace(/\s\s+/g, ' ');
        if (treatedText !== locator.text) {
            const element = this.findElementsBasedOnText({
                ...locator,
                text: treatedText,
            }, options)[0];

            if (element) {
                return element;
            }
        }

        return this.findElementsBasedOnText(locator, options)[0];
    }

    /**
     * Wait until an element with the given selector is found.
     *
     * @param selector Element selector.
     * @param timeout Timeout after which an error is thrown.
     * @param retryFrequency Frequency for retries when the element is not found.
     * @returns Element.
     */
    async waitForElement<T extends HTMLElement = HTMLElement>(
        selector: string,
        timeout: number = 2000,
        retryFrequency: number = 100,
    ): Promise<T> {
        const element = document.querySelector<T>(selector);

        if (!element) {
            if (timeout < retryFrequency) {
                throw new Error(`Element with '${selector}' selector not found`);
            }

            await new Promise(resolve => setTimeout(resolve, retryFrequency));

            return this.waitForElement<T>(selector, timeout - retryFrequency, retryFrequency);
        }

        return element;
    }

    /**
     * Function to find elements based on their text or Aria label.
     *
     * @param locator Element locator.
     * @param options Search options.
     * @returns Found elements
     */
    protected findElementsBasedOnText(
        locator: TestingBehatElementLocator,
        options: TestingBehatFindOptions,
    ): HTMLElement[] {
        const topContainers = this.getCurrentTopContainerElements(options.containerName ?? '');
        let elements: HTMLElement[] = [];

        for (let i = 0; i < topContainers.length; i++) {
            elements = elements.concat(this.findElementsBasedOnTextInContainer(locator, topContainers[i], options));
            if (elements.length) {
                break;
            }
        }

        return elements;
    }

    /**
     * Function to find elements based on their text or Aria label.
     *
     * @param locator Element locator.
     * @param topContainer Container to search in.
     * @param options Search options.
     * @returns Found elements
     */
    protected findElementsBasedOnTextInContainer(
        locator: TestingBehatElementLocator,
        topContainer: HTMLElement,
        options: TestingBehatFindOptions = {},
    ): HTMLElement[] {
        let container: HTMLElement | null = topContainer;

        if (locator.within) {
            const withinElements = this.findElementsBasedOnTextInContainer(locator.within, topContainer, options);

            if (withinElements.length === 0) {
                return [];
            } else if (withinElements.length > 1) {
                const withinElementsAncestors = this.getTopAncestors(withinElements);

                if (withinElementsAncestors.length > 1) {
                    // Too many matches for within text.
                    return [];
                }

                topContainer = container = withinElementsAncestors[0];
            } else {
                topContainer = container = withinElements[0];
            }
        }

        if (topContainer && locator.near) {
            const nearElements = this.findElementsBasedOnTextInContainer(locator.near, topContainer, {
                ...options,
                onlyClickable: false,
            });

            if (nearElements.length === 0) {
                return [];
            } else if (nearElements.length > 1) {
                const nearElementsAncestors = this.getTopAncestors(nearElements);

                if (nearElementsAncestors.length > 1) {
                    // Too many matches for near text.
                    return [];
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

            const elements = this.findElementsBasedOnTextWithin(container, locator.text, options);

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
    }

    /**
     * Make sure that an element is visible and wait to trigger the callback.
     *
     * @param element Element.
     * @returns Promise resolved with the DOM rectangle.
     */
    protected async ensureElementVisible(element: HTMLElement): Promise<DOMRect> {
        const initialRect = element.getBoundingClientRect();

        element.scrollIntoView(false);

        const promise = new CorePromisedValue<DOMRect>();

        requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();

            if (initialRect.y !== rect.y) {
                setTimeout(() => {
                    promise.resolve(rect);
                }, 300);

                return;
            }

            promise.resolve(rect);
        });

        return promise;
    }

    /**
     * Press an element.
     *
     * @param element Element to press.
     */
    async pressElement(element: HTMLElement): Promise<void> {
        await NgZone.run(async () => {
            const promise = new CorePromisedValue<void>();

            // Events don't bubble up across Shadow DOM boundaries, and some buttons
            // may not work without doing this.
            const parentElement = this.getParentElement(element);

            if (parentElement?.matches('ion-button, ion-back-button')) {
                element = parentElement;
            } else if (parentElement?.tagName === 'ION-ITEM' && parentElement?.classList.contains('clickable')) {
                element = parentElement.querySelector<HTMLElement>('ion-toggle') || element;
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

                promise.resolve();
            }, 300);

            return promise;
        });
    }

    /**
     * Set an input element value.
     *
     * @param element Input element.
     * @param value Value.
     */
    async setInputValue(element: HTMLInputElement | HTMLElement, value: string): Promise<void> {
        await NgZone.run(async () => {
            // Functions to get/set value depending on field type.
            const setValue = async (text: string) => {
                if (element.tagName === 'ION-SELECT') {
                    this.setIonSelectInputValue(element, value);
                } else if ('value' in element) {
                    element.value = text;
                } else {
                    element.innerHTML = text;
                }

                element.dispatchEvent(new Event('ionChange'));
            };

            const getValue = () => {
                if ('value' in element) {
                    return element.value;
                } else {
                    return element.innerHTML;
                }
            };

            // Pretend we have cut and pasted the new text.
            if (element.tagName !== 'ION-SELECT' && getValue() !== '') {
                await CoreWait.nextTick();
                await setValue('');

                element.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    view: window,
                    cancelable: true,
                    inputType: 'deleteByCut',
                }));
            }

            if (value !== '') {
                await CoreWait.nextTick();
                await setValue(value);

                element.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    view: window,
                    cancelable: true,
                    inputType: 'insertFromPaste',
                    data: value,
                }));
            }
        });
    }

    /**
     * Select an option in an ion-select element.
     *
     * @param element IonSelect element.
     * @param value Value.
     */
    protected async setIonSelectInputValue(element: HTMLElement, value: string): Promise<void> {
        // Press select.
        await TestingBehatDomUtils.pressElement(element);

        // Press option.
        type IonSelectInterface = 'alert' | 'action-sheet' | 'popover';
        const selectInterface = element.getAttribute('interface') as IonSelectInterface ?? 'alert';
        const containerSelector = ({
            'alert': 'ion-alert.select-alert',
            'action-sheet': 'ion-action-sheet.select-action-sheet',
            'popover': 'ion-popover.select-popover',
        })[selectInterface];
        const optionSelector = ({
            'alert': 'button',
            'action-sheet': 'button',
            'popover': 'ion-radio',
        })[selectInterface] ?? '';
        const optionsContainer = await TestingBehatDomUtils.waitForElement(containerSelector);
        const options = this.findElementsBasedOnTextInContainer(
            { text: value, selector: optionSelector },
            optionsContainer,
            {},
        );

        if (options.length === 0) {
            throw new Error('Couldn\'t find ion-select option.');
        }

        await TestingBehatDomUtils.pressElement(options[0]);

        // Press options submit.
        if (selectInterface === 'alert') {
            const submitButton = optionsContainer.querySelector<HTMLElement>('.alert-button-group button:last-child');

            if (!submitButton) {
                throw new Error('Couldn\'t find ion-select submit button.');
            }

            await TestingBehatDomUtils.pressElement(submitButton);
        }
    }

}

export const TestingBehatDomUtils = makeSingleton(TestingBehatDomUtilsService);

type ElementsWithExact = {
    element: HTMLElement;
    exact: boolean;
};
