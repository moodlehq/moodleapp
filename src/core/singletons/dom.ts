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
import { CoreUtils } from '@singletons/utils';
import { CoreEventObserver } from '@singletons/events';
import { CorePlatform } from '@services/platform';
import { CoreWait } from './wait';
import { convertTextToHTMLElement } from '../utils/create-html-element';
import { CoreKeyboard } from './keyboard';
import { CoreError } from '@classes/errors/error';
import { IonContent } from '@ionic/angular';
import { CoreUrl, CoreUrlPartNames } from './url';

/**
 * Singleton with helper functions for dom.
 */
export class CoreDom {

    // List of input types that support keyboard.
    protected static readonly INPUT_SUPPORT_KEYBOARD = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number',
        'password', 'search', 'tel', 'text', 'time', 'url', 'week'];

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
     * Given some HTML code, return the HTML code inside <body> tags. If there are no body tags, return the whole HTML.
     *
     * @param html HTML text.
     * @returns Body HTML.
     */
    static getHTMLBodyContent(html: string): string {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const bodyContent = doc.body.innerHTML;

        return bodyContent ?? html;
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
     * Check if HTML content is blank.
     *
     * @param content HTML content.
     * @returns True if the string does not contain actual content: text, images, etc.
     */
    static htmlIsBlank(content: string): boolean {
        if (!content) {
            return true;
        }

        const element = convertTextToHTMLElement(content);

        return !CoreDom.elementHasContent(element);
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

                unsubscribe = CoreDom.watchElementInViewport(element, intersectionRatio, inViewport => {
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

        element.addEventListener('click', (event) => {
            if (!enabled()) {
                return;
            }

            callback(event);

            event.preventDefault();
            event.stopPropagation();
        });

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
            if (CoreDom.fontSizeZoom === null) {
                const baseFontSize = 20;
                const span = document.createElement('span');
                span.style.opacity = '0';
                span.style.fontSize = `${baseFontSize}px`;

                document.body.append(span);

                CoreDom.fontSizeZoom = baseFontSize / Number(getComputedStyle(span).fontSize.slice(0, -2));

                span.remove();
            }

            if (CoreDom.fontSizeZoom !== 1) {
                return `calc(${CoreDom.fontSizeZoom} * ${value})`;
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
     * Search all the URLs in a CSS file content.
     *
     * @param code CSS code.
     * @returns List of URLs.
     */
    static extractUrlsFromCSS(code: string): string[] {
        // First of all, search all the url(...) occurrences that don't include "data:".
        const urls: string[] = [];
        const matches = code.match(/url\(\s*["']?(?!data:)([^)]+)\)/igm);

        if (!matches) {
            return urls;
        }

        // Extract the URL from each match.
        matches.forEach((match) => {
            const submatches = match.match(/url\(\s*['"]?([^'"]*)['"]?\s*\)/im);
            if (submatches?.[1]) {
                urls.push(submatches[1]);
            }
        });

        return urls;
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

        return css.replace(regExp, `${prefix} $1 $2`);
    }

    /**
     * Formats a size to be used as width/height of an element.
     * If the size is already valid (like '500px' or '50%') it won't be modified.
     * Returned size will have a format like '500px'.
     *
     * @param size Size to format.
     * @returns Formatted size. If size is not valid, returns an empty string.
     */
    static formatSizeUnits(size: string | number): string {
        // Check for valid pixel units.
        if (typeof size === 'string') {
            size = size.replace(/ /g, ''); // Trim and remove all spaces.
            if (CoreDom.hasValidSizeUnits(size) || size === 'auto' || size === 'initial' || size === 'inherit') {
                // It seems to be a valid size.
                return size;
            }

            // It's important to use parseInt instead of Number because Number('') is 0 instead of NaN.
            size = parseInt(size, 10);
        }

        if (!isNaN(size)) {
            return `${size}px`;
        }

        return '';
    }

    /**
     * Check if a size has valid pixel units.
     *
     * @param size Size to check.
     * @returns Whether the size has valid pixel units.
     */
    protected static hasValidSizeUnits(size: string): boolean {
        const validUnits = ['px', '%', 'em', 'rem', 'cm', 'mm', 'in', 'pt', 'pc', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax'];

        const units = size.match(`^[0-9]*\\.?[0-9]+(${validUnits.join('|')})$`);

        return !!units && units.length > 1;
    }

    /**
     * Search the ion-header of the page.
     * This function is usually used to find the header of a page to add buttons.
     *
     * @returns The header element if found.
     */
    static async findIonHeaderFromElement(element: HTMLElement): Promise<HTMLElement | null> {
        await CoreDom.waitToBeInDOM(element);
        let parentPage: HTMLElement | null = element;

        while (parentPage && parentPage.parentElement) {
            const content = parentPage.closest<HTMLIonContentElement>('ion-content');
            if (content) {
                // Sometimes ion-page class is not yet added by the ViewController, wait for content to render.
                await content.componentOnReady();
            }

            parentPage = parentPage.parentElement.closest('.ion-page, .ion-page-hidden, .ion-page-invisible');

            // Check if the page has a header. If it doesn't, search the next parent page.
            let header  = parentPage?.querySelector<HTMLIonHeaderElement>(':scope > ion-header');

            if (header && getComputedStyle(header).display !== 'none') {
                return header;
            }

            // Find using content if any.
            header = content?.parentElement?.querySelector<HTMLIonHeaderElement>(':scope > ion-header');

            if (header && getComputedStyle(header).display !== 'none') {
                return header;
            }
        }

        // Header not found, reject.
        throw Error('Header not found.');
    }

    /**
     * Fix syntax errors in HTML.
     *
     * @param html HTML text.
     * @returns Fixed HTML text.
     */
    static fixHtml(html: string): string {
        // We can't use CoreText.processHTML because it removes elements that
        // are not allowed as a child of <div>, like <li> or <tr>.
        const template = document.createElement('template');
        template.innerHTML = html;

        // eslint-disable-next-line no-control-regex
        const attrNameRegExp = /[^\x00-\x20\x7F-\x9F"'>/=]+/;
        const fixElement = (element: Element): void => {
            // Remove attributes with an invalid name.
            Array.from(element.attributes).forEach((attr) => {
                if (!attrNameRegExp.test(attr.name)) {
                    element.removeAttributeNode(attr);
                }
            });

            Array.from(element.children).forEach(fixElement);
        };

        Array.from(template.content.children).forEach(fixElement);

        return template.innerHTML;
    }

    /**
     * Returns the contents of a certain selection in a DOM element.
     *
     * @param element DOM element to search in.
     * @param selector Selector to search.
     * @returns Selection contents. Undefined if not found.
     */
    static getContentsOfElement(element: HTMLElement, selector: string): string | undefined {
        const selected = element.querySelector(selector);
        if (selected) {
            return selected.innerHTML;
        }
    }

    /**
     * Returns the attribute value of a string element. Only the first element will be selected.
     *
     * @param html HTML element in string.
     * @param attribute Attribute to get.
     * @returns Attribute value.
     */
    static getHTMLElementAttribute(html: string, attribute: string): string | null {
        return convertTextToHTMLElement(html).children[0].getAttribute(attribute);
    }

    /**
     * Returns the computed style measure or 0 if not found or NaN.
     *
     * @param style Style from getComputedStyle.
     * @param measure Measure to get.
     * @returns Result of the measure.
     */
    static getComputedStyleMeasure(style: CSSStyleDeclaration, measure: keyof CSSStyleDeclaration): number {
        return parseInt(String(style[measure]), 10) || 0;
    }

    /**
     * Move children from one HTMLElement to another.
     *
     * @param oldParent The old parent.
     * @param newParent The new parent.
     * @param prepend If true, adds the children to the beginning of the new parent.
     * @returns List of moved children.
     */
    static moveChildren(oldParent: HTMLElement, newParent: HTMLElement, prepend?: boolean): Node[] {
        const movedChildren: Node[] = [];
        const referenceNode = prepend ? newParent.firstChild : null;

        while (oldParent.childNodes.length > 0) {
            const child = oldParent.childNodes[0];
            movedChildren.push(child);

            newParent.insertBefore(child, referenceNode);
        }

        return movedChildren;
    }

    /**
     * Search and remove a certain element from inside another element.
     *
     * @param element DOM element to search in.
     * @param selector Selector to search.
     */
    static removeElement(element: HTMLElement, selector: string): void {
        const selected = element.querySelector(selector);
        if (selected) {
            selected.remove();
        }
    }

    /**
     * Search and remove a certain element from an HTML code.
     *
     * @param html HTML code to change.
     * @param selector Selector to search.
     * @param removeAll True if it should remove all matches found, false if it should only remove the first one.
     * @returns HTML without the element.
     */
    static removeElementFromHtml(html: string, selector: string, removeAll?: boolean): string {
        const element = convertTextToHTMLElement(html);

        if (removeAll) {
            const selected = element.querySelectorAll(selector);
            for (let i = 0; i < selected.length; i++) {
                selected[i].remove();
            }
        } else {
            const selected = element.querySelector(selector);
            if (selected) {
                selected.remove();
            }
        }

        return element.innerHTML;
    }

    /**
     * Wrap an HTMLElement with another element.
     *
     * @param el The element to wrap.
     * @param wrapper Wrapper.
     */
    static wrapElement(el: HTMLElement, wrapper: HTMLElement): void {
        // Insert the wrapper before the element.
        el.parentNode?.insertBefore(wrapper, el);
        // Now move the element into the wrapper.
        wrapper.appendChild(el);
    }

    /**
     * Converts HTML formatted text to DOM element(s).
     *
     * @param text HTML text.
     * @returns Same text converted to HTMLCollection.
     */
    static toDom(text: string): HTMLCollection {
        const element = convertTextToHTMLElement(text);

        return element.children;
    }

    /**
     * Check if an element supports input via keyboard.
     *
     * @param el HTML element to check.
     * @returns Whether it supports input using keyboard.
     */
    static supportsInputKeyboard(el: HTMLElement): boolean {
        const element = el as HTMLInputElement;
        if (!element) {
            return false;
        }

        const tagName = element.tagName.toLowerCase();

        return !element.disabled &&
            (tagName === 'textarea' || (tagName === 'input' && CoreDom.INPUT_SUPPORT_KEYBOARD.includes(element.type)));
    }

    /**
     * Focus an element and open keyboard.
     *
     * @param element HTML element to focus.
     */
    static async focusElement(
        element: HTMLIonInputElement | HTMLIonTextareaElement | HTMLIonSearchbarElement | HTMLIonButtonElement | HTMLElement,
    ): Promise<void> {
        let elementToFocus = element;

        /**
         * See focusElement function on Ionic Framework utils/helpers.ts.
         */
        if (elementToFocus.classList.contains('ion-focusable')) {
            const app = elementToFocus.closest('ion-app');
            if (app) {
                app.setFocus([elementToFocus as HTMLElement]);
            }

            if (document.activeElement === elementToFocus) {
                return;
            }
        }

        const isIonButton = element.tagName === 'ION-BUTTON';
        if ('getInputElement' in elementToFocus) {
            // If it's an Ionic element get the right input to use.
            elementToFocus.componentOnReady && await elementToFocus.componentOnReady();
            elementToFocus = await elementToFocus.getInputElement();
        } else if (isIonButton) {
            // For ion-button, we need to call focus on the inner button. But the activeElement will be the ion-button.
            ('componentOnReady' in elementToFocus) && await elementToFocus.componentOnReady();
            elementToFocus = elementToFocus.shadowRoot?.querySelector('.button-native') ?? elementToFocus;
        }

        if (!elementToFocus || !elementToFocus.focus) {
            throw new CoreError('Element to focus cannot be focused');
        }

        let retries = 10;
        while (retries > 0 && elementToFocus !== document.activeElement) {
            elementToFocus.focus();

            if (elementToFocus === document.activeElement || (isIonButton && element === document.activeElement)) {
                await CoreWait.nextTick();
                if (CorePlatform.isAndroid() && CoreDom.supportsInputKeyboard(elementToFocus as HTMLElement)) {
                    // On some Android versions the keyboard doesn't open automatically.
                    CoreKeyboard.open();
                }
                break;
            }

            // @TODO Probably a Mutation Observer would get this working.
            await CoreWait.wait(50);
            retries--;
        }
    }

    /**
     * Returns height of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with content height.
     */
    static async getContentHeight(content: IonContent): Promise<number> {
        try {
            const scrollElement = await content.getScrollElement();

            return scrollElement.clientHeight || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Returns scroll height of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with scroll height.
     */
    static async getScrollHeight(content: IonContent): Promise<number> {
        try {
            const scrollElement = await content.getScrollElement();

            return scrollElement.scrollHeight || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Returns scrollTop of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with scroll top.
     */
    static async getScrollTop(content: IonContent): Promise<number> {
        try {
            const scrollElement = await content.getScrollElement();

            return scrollElement.scrollTop || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Search for certain classes in an element contents and replace them with the specified new values.
     *
     * @param element DOM element.
     * @param map Mapping of the classes to replace. Keys must be the value to replace, values must be
     *            the new class name. Example: {'correct': 'core-question-answer-correct'}.
     */
    static replaceClassesInElement(element: HTMLElement, map: {[currentValue: string]: string}): void {
        for (const key in map) {
            const foundElements = element.querySelectorAll(`.${key}`);

            for (let i = 0; i < foundElements.length; i++) {
                const foundElement = foundElements[i];
                foundElement.className = foundElement.className.replace(key, map[key]);
            }
        }
    }

    /**
     * Given an HTML, search all links and media and tries to restore original sources using the paths object.
     *
     * @param html HTML code.
     * @param paths Object linking URLs in the html code with the real URLs to use.
     * @param anchorFn Function to call with each anchor. Optional.
     * @returns Treated HTML code.
     */
    static restoreSourcesInHtml(
        html: string,
        paths: {[url: string]: string},
        anchorFn?: (anchor: HTMLElement, href: string) => void,
    ): string {
        const element = convertTextToHTMLElement(html);

        // Treat elements with src (img, audio, video, ...).
        const media = Array.from(element.querySelectorAll<HTMLElement>('img, video, audio, source, track, iframe, embed'));
        media.forEach((media: HTMLElement) => {
            const currentSrc = media.getAttribute('src');
            const newSrc = currentSrc ?
                paths[CoreUrl.removeUrlParts(
                    CoreUrl.decodeURIComponent(currentSrc),
                    [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment],
                )] :
                undefined;

            if (newSrc !== undefined) {
                media.setAttribute('src', newSrc);
            }

            // Treat video posters.
            const currentPoster = media.getAttribute('poster');
            if (media.tagName === 'VIDEO' && currentPoster) {
                const newPoster = paths[CoreUrl.decodeURIComponent(currentPoster)];
                if (newPoster !== undefined) {
                    media.setAttribute('poster', newPoster);
                }
            }
        });

        // Now treat links.
        const anchors = Array.from(element.querySelectorAll('a'));
        anchors.forEach((anchor: HTMLElement) => {
            const currentHref = anchor.getAttribute('href');
            const newHref = currentHref ?
                paths[CoreUrl.removeUrlParts(
                    CoreUrl.decodeURIComponent(currentHref),
                    [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment],
                )] :
                undefined;

            if (newHref !== undefined) {
                anchor.setAttribute('href', newHref);

                if (typeof anchorFn === 'function') {
                    anchorFn(anchor, newHref);
                }
            }
        });

        return element.innerHTML;
    }

    /**
     * Check if an element is outside of screen (viewport).
     *
     * @param scrollEl The element that must be scrolled.
     * @param element DOM element to check.
     * @param point The point of the element to check.
     * @returns Whether the element is outside of the viewport.
     */
    static isElementOutsideOfScreen(
        scrollEl: HTMLElement,
        element: HTMLElement,
        point: VerticalPoint = VerticalPoint.MID,
    ): boolean {
        const elementRect = element.getBoundingClientRect();

        if (!elementRect) {
            return false;
        }

        let elementPoint: number;
        switch (point) {
            case VerticalPoint.TOP:
                elementPoint = elementRect.top;
                break;

            case VerticalPoint.BOTTOM:
                elementPoint = elementRect.bottom;
                break;

            case VerticalPoint.MID:
                elementPoint = Math.round((elementRect.bottom + elementRect.top) / 2);
                break;
        }

        const scrollElRect = scrollEl.getBoundingClientRect();
        const scrollTopPos = scrollElRect?.top || 0;

        return elementPoint > window.innerHeight || elementPoint < scrollTopPos;
    }

    /**
     * Force a redraw of an element.
     *
     * @param element Element to redraw.
     */
    static async forceElementRedraw(element?: HTMLElement): Promise<void> {
        if (!element) {
            return;
        }

        const oldDisplay = element.style.display;
        element.style.display = 'none';

        await CoreWait.nextTick();

        element.style.display = oldDisplay;
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

/**
 * Vertical points for an element.
 */
export enum VerticalPoint {
    TOP = 'top',
    MID = 'mid',
    BOTTOM = 'bottom',
}
