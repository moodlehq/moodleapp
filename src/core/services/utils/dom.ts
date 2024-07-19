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

import { Injectable, SimpleChange, KeyValueChanges } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { PopoverOptions, AlertOptions, AlertButton, TextFieldTypes } from '@ionic/core';
import { Md5 } from 'ts-md5';

import { CoreConfig } from '@services/config';
import { CoreFile } from '@services/file';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreText } from '@singletons/text';
import { CoreUrl, CoreUrlPartNames } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreAnyError, CoreError } from '@classes/errors/error';
import { CoreSilentError } from '@classes/errors/silenterror';
import {
    makeSingleton,
    Translate,
    AlertController,
} from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreSites } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreErrorAccordion } from '@services/error-accordion';
import { CorePlatform } from '@services/platform';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreLang } from '@services/lang';
import { CorePasswordModalParams, CorePasswordModalResponse } from '@components/password-modal/password-modal';
import { CoreErrorLogs } from '@singletons/error-logs';
import { CoreKeyboard } from '@singletons/keyboard';
import { CoreWait } from '@singletons/wait';
import { CoreToasts, ToastDuration, ShowToastOptions } from '../toasts';
import { fixOverlayAriaHidden } from '@/core/utils/fix-aria-hidden';
import { CoreModals, OpenModalOptions } from '@services/modals';
import { CorePopovers, OpenPopoverOptions } from '@services/popovers';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreLoadings } from '@services/loadings';
import { CoreErrorHelper, CoreErrorObject } from '@services/error-helper';
import { convertHTMLToHTMLElement, CoreTemplateElement } from '@/core/utils/create-html-element';

/*
 * "Utils" service with helper functions for UI, DOM elements and HTML code.
 */
@Injectable({ providedIn: 'root' })
export class CoreDomUtilsProvider {

    protected readonly INSTANCE_ID_ATTR_NAME = 'core-instance-id';

    // List of input types that support keyboard.
    protected readonly INPUT_SUPPORT_KEYBOARD: string[] = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number',
        'password', 'search', 'tel', 'text', 'time', 'url', 'week'];

    protected matchesFunctionName?: string; // Name of the "matches" function to use when simulating a closest call.
    protected debugDisplay = false; // Whether to display debug messages. Store it in a variable to make it synchronous.
    protected displayedAlerts: Record<string, HTMLIonAlertElement> = {}; // To prevent duplicated alerts.
    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreDomUtilsProvider');

        this.init();
    }

    /**
     * Init some properties.
     */
    protected async init(): Promise<void> {
        // Check if debug messages should be displayed.
        const debugDisplay = await CoreConfig.get<number>(CoreConstants.SETTINGS_DEBUG_DISPLAY, 0);

        this.debugDisplay = debugDisplay != 0;
    }

    /**
     * If the download size is higher than a certain threshold shows a confirm dialog.
     *
     * @param size Object containing size to download and a boolean to indicate if its totally or partialy calculated.
     * @param message Code of the message to show. Default: 'core.course.confirmdownload'.
     * @param unknownMessage ID of the message to show if size is unknown.
     * @param wifiThreshold Threshold to show confirm in WiFi connection. Default: CoreWifiDownloadThreshold.
     * @param limitedThreshold Threshold to show confirm in limited connection. Default: CoreDownloadThreshold.
     * @param alwaysConfirm True to show a confirm even if the size isn't high, false otherwise.
     * @returns Promise resolved when the user confirms or if no confirm needed.
     */
    async confirmDownloadSize(
        size: CoreFileSizeSum,
        message?: string,
        unknownMessage?: string,
        wifiThreshold?: number,
        limitedThreshold?: number,
        alwaysConfirm?: boolean,
    ): Promise<void> {
        const readableSize = CoreText.bytesToSize(size.size, 2);

        const getAvailableBytes = async (): Promise<number | null> => {
            const availableBytes = await CoreFile.calculateFreeSpace();

            if (CorePlatform.isAndroid()) {
                return availableBytes;
            } else {
                // Space calculation is not accurate on iOS, but it gets more accurate when space is lower.
                // We'll only use it when space is <500MB, or we're downloading more than twice the reported space.
                if (availableBytes < CoreConstants.IOS_FREE_SPACE_THRESHOLD || size.size > availableBytes / 2) {
                    return availableBytes;
                } else {
                    return null;
                }
            }
        };

        const getAvailableSpace = (availableBytes: number | null): string => {
            if (availableBytes === null) {
                return '';
            } else {
                const availableSize = CoreText.bytesToSize(availableBytes, 2);

                if (CorePlatform.isAndroid() && size.size > availableBytes - CoreConstants.MINIMUM_FREE_SPACE) {
                    throw new CoreError(
                        Translate.instant(
                            'core.course.insufficientavailablespace',
                            { size: readableSize },
                        ),
                    );
                }

                return Translate.instant('core.course.availablespace', { available: availableSize });
            }
        };

        const availableBytes = await getAvailableBytes();

        const availableSpace = getAvailableSpace(availableBytes);

        wifiThreshold = wifiThreshold === undefined ? CoreConstants.WIFI_DOWNLOAD_THRESHOLD : wifiThreshold;
        limitedThreshold = limitedThreshold === undefined ? CoreConstants.DOWNLOAD_THRESHOLD : limitedThreshold;

        let wifiPrefix = '';
        if (CoreNetwork.isNetworkAccessLimited()) {
            wifiPrefix = Translate.instant('core.course.confirmlimiteddownload');
        }

        if (size.size < 0 || (size.size == 0 && !size.total)) {
            // Seems size was unable to be calculated. Show a warning.
            unknownMessage = unknownMessage || 'core.course.confirmdownloadunknownsize';

            return this.showConfirm(
                wifiPrefix + Translate.instant(
                    unknownMessage,
                    { availableSpace: availableSpace },
                ),
            );
        } else if (!size.total) {
            // Filesize is only partial.

            return this.showConfirm(
                wifiPrefix + Translate.instant(
                    'core.course.confirmpartialdownloadsize',
                    { size: readableSize, availableSpace: availableSpace },
                ),
            );
        } else if (alwaysConfirm || size.size >= wifiThreshold ||
                (CoreNetwork.isNetworkAccessLimited() && size.size >= limitedThreshold)) {
            message = message || (size.size === 0 ? 'core.course.confirmdownloadzerosize' : 'core.course.confirmdownload');

            return this.showConfirm(
                wifiPrefix + Translate.instant(
                    message,
                    { size: readableSize, availableSpace: availableSpace },
                ),
            );
        }
    }

    /**
     * Convert some HTML as text into an HTMLElement. This HTML is put inside a div or a body.
     *
     * @param html Text to convert.
     * @returns Element.
     *
     * @deprecated since 4.5. Use convertToElement directly instead.
     */
    convertToElement(html: string): HTMLElement {
        return convertHTMLToHTMLElement(html);
    }

    /**
     * Given a list of changes for a component input detected by a KeyValueDiffers, create an object similar to the one
     * passed to the ngOnChanges functions.
     *
     * @param changes Changes detected by KeyValueDiffer.
     * @returns Changes in a format like ngOnChanges.
     */
    createChangesFromKeyValueDiff(changes: KeyValueChanges<string, unknown>): { [name: string]: SimpleChange } {
        const newChanges: { [name: string]: SimpleChange } = {};

        // Added items are considered first change.
        changes.forEachAddedItem((item) => {
            newChanges[item.key] = new SimpleChange(item.previousValue, item.currentValue, true);
        });

        // Changed or removed items aren't first change.
        changes.forEachChangedItem((item) => {
            newChanges[item.key] = new SimpleChange(item.previousValue, item.currentValue, false);
        });
        changes.forEachRemovedItem((item) => {
            newChanges[item.key] = new SimpleChange(item.previousValue, item.currentValue, true);
        });

        return newChanges;
    }

    /**
     * Search all the URLs in a CSS file content.
     *
     * @param code CSS code.
     * @returns List of URLs.
     */
    extractUrlsFromCSS(code: string): string[] {
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
     * Fix syntax errors in HTML.
     *
     * @param html HTML text.
     * @returns Fixed HTML text.
     */
    fixHtml(html: string): string {
        CoreTemplateElement.innerHTML = html;

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

        Array.from(CoreTemplateElement.content.children).forEach(fixElement);

        return CoreTemplateElement.innerHTML;
    }

    /**
     * Focus an element and open keyboard.
     *
     * @param element HTML element to focus.
     */
    async focusElement(
        element: HTMLIonInputElement | HTMLIonTextareaElement | HTMLIonSearchbarElement | HTMLIonButtonElement | HTMLElement,
    ): Promise<void> {
        let elementToFocus = element;

        /**
         * See focusElement function on Ionic Framework utils/helpers.ts.
         */
        if (elementToFocus.classList.contains('ion-focusable')) {
            const app = elementToFocus.closest('ion-app');
            if (app) {
                app.setFocus([elementToFocus]);
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
                if (CorePlatform.isAndroid() && this.supportsInputKeyboard(elementToFocus)) {
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
     * Formats a size to be used as width/height of an element.
     * If the size is already valid (like '500px' or '50%') it won't be modified.
     * Returned size will have a format like '500px'.
     *
     * @param size Size to format.
     * @returns Formatted size. If size is not valid, returns an empty string.
     */
    formatPixelsSize(size: string | number): string {
        if (typeof size == 'string' && (size.indexOf('px') > -1 || size.indexOf('%') > -1 || size == 'auto' || size == 'initial')) {
            // It seems to be a valid size.
            return size;
        }

        if (typeof size == 'string') {
            // It's important to use parseInt instead of Number because Number('') is 0 instead of NaN.
            size = parseInt(size, 10);
        }

        if (!isNaN(size)) {
            return size + 'px';
        }

        return '';
    }

    /**
     * Returns the contents of a certain selection in a DOM element.
     *
     * @param element DOM element to search in.
     * @param selector Selector to search.
     * @returns Selection contents. Undefined if not found.
     */
    getContentsOfElement(element: HTMLElement, selector: string): string | undefined {
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
    getHTMLElementAttribute(html: string, attribute: string): string | null {
        return convertHTMLToHTMLElement(html).children[0].getAttribute(attribute);
    }

    /**
     * Returns the computed style measure or 0 if not found or NaN.
     *
     * @param style Style from getComputedStyle.
     * @param measure Measure to get.
     * @returns Result of the measure.
     */
    getComputedStyleMeasure(style: CSSStyleDeclaration, measure: string): number {
        return parseInt(style[measure], 10) || 0;
    }

    /**
     * Given a message, it deduce if it's a network error.
     *
     * @param message Message text.
     * @param error Error object.
     * @returns True if the message error is a network error, false otherwise.
     */
    protected isNetworkError(message: string, error?: CoreError | CoreErrorObject | string): boolean {
        return message == Translate.instant('core.networkerrormsg') ||
            message == Translate.instant('core.fileuploader.errormustbeonlinetoupload') ||
            error instanceof CoreNetworkError;
    }

    /**
     * Given a message, check if it's a site unavailable error.
     *
     * @param message Message text.
     * @returns Whether the message is a site unavailable error.
     */
    protected isSiteUnavailableError(message: string): boolean {
        let siteUnavailableMessage = Translate.instant('core.siteunavailablehelp', { site: 'SITEURLPLACEHOLDER' });
        siteUnavailableMessage = CoreText.escapeForRegex(siteUnavailableMessage);
        siteUnavailableMessage = siteUnavailableMessage.replace('SITEURLPLACEHOLDER', '.*');

        return new RegExp(siteUnavailableMessage).test(message);
    }

    /**
     * Get the error message from an error, including debug data if needed.
     *
     * @param error Message to show.
     * @param needsTranslate Whether the error needs to be translated.
     * @returns Error message, null if no error should be displayed.
     */
    getErrorMessage(error: CoreError | CoreErrorObject | string, needsTranslate?: boolean): string | null {
        if (typeof error != 'string' && !error) {
            return null;
        }

        let extraInfo = '';
        let errorMessage: string | undefined;

        if (typeof error == 'object') {
            if (this.debugDisplay) {
                // Get the debug info. Escape the HTML so it is displayed as it is in the view.
                if ('debuginfo' in error && error.debuginfo) {
                    extraInfo = '<br><br>' + CoreText.escapeHTML(error.debuginfo, false);
                }
                if ('backtrace' in error && error.backtrace) {
                    extraInfo += '<br><br>' + CoreText.replaceNewLines(
                        CoreText.escapeHTML(error.backtrace, false),
                        '<br>',
                    );
                }

                // eslint-disable-next-line no-console
                console.error(error);
            }

            if (this.isSilentError(error)) {
                // It's a silent error, don't display an error.
                return null;
            }

            // We received an object instead of a string. Search for common properties.
            errorMessage = CoreErrorHelper.getErrorMessageFromError(error);
            CoreErrorLogs.addErrorLog({ message: JSON.stringify(error), type: errorMessage || '', time: new Date().getTime() });
            if (!errorMessage) {
                // No common properties found, just stringify it.
                errorMessage = JSON.stringify(error);
                extraInfo = ''; // No need to add extra info because it's already in the error.
            }

            // Try to remove tokens from the contents.
            const matches = errorMessage.match(/token"?[=|:]"?(\w*)/);
            if (matches?.[1]) {
                errorMessage = errorMessage.replace(new RegExp(matches[1], 'g'), 'secret');
            }
        } else {
            errorMessage = error;
        }

        let message = CoreText.decodeHTML(needsTranslate ? Translate.instant(errorMessage) : errorMessage);

        if (extraInfo) {
            message += extraInfo;
        }

        return message;
    }

    /**
     * Check whether an error is an error caused because the user canceled a showConfirm.
     *
     * @param error Error to check.
     * @returns Whether it's a canceled error.
     */
    isCanceledError(error: CoreAnyError): boolean {
        return error instanceof CoreCanceledError;
    }

    /**
     * Check whether an error is an error caused because the user canceled a showConfirm.
     *
     * @param error Error to check.
     * @returns Whether it's a canceled error.
     */
    isSilentError(error: CoreAnyError): boolean {
        return error instanceof CoreSilentError;
    }

    /**
     * Handle bootstrap tooltips in a certain element.
     *
     * @param element Element to check.
     */
    handleBootstrapTooltips(element: HTMLElement): void {
        const els = Array.from(element.querySelectorAll('[data-toggle="tooltip"]'));

        els.forEach((el) => {
            const content = el.getAttribute('title') || el.getAttribute('data-original-title');
            const trigger = el.getAttribute('data-trigger') || 'hover focus';
            const treated = el.getAttribute('data-bstooltip-treated');

            if (!content || treated === 'true' ||
                    (trigger.indexOf('hover') == -1 && trigger.indexOf('focus') == -1 && trigger.indexOf('click') == -1)) {
                return;
            }

            el.setAttribute('data-bstooltip-treated', 'true'); // Mark it as treated.

            // Store the title in data-original-title instead of title, like BS does.
            el.setAttribute('data-original-title', content);
            el.setAttribute('title', '');

            el.addEventListener('click', async (ev: Event) => {
                const html = el.getAttribute('data-html');

                const { CoreBSTooltipComponent } = await import('@components/bs-tooltip/bs-tooltip');

                await CorePopovers.openWithoutResult({
                    component: CoreBSTooltipComponent,
                    componentProps: {
                        content,
                        html: html === 'true',
                    },
                    event: ev,
                });
            });
        });
    }

    /**
     * Check if an element is outside of screen (viewport).
     *
     * @param scrollEl The element that must be scrolled.
     * @param element DOM element to check.
     * @param point The point of the element to check.
     * @returns Whether the element is outside of the viewport.
     */
    isElementOutsideOfScreen(
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
     * Check if rich text editor is enabled.
     *
     * @returns Promise resolved with boolean: true if enabled, false otherwise.
     */
    async isRichTextEditorEnabled(): Promise<boolean> {
        const enabled = await CoreConfig.get(CoreConstants.SETTINGS_RICH_TEXT_EDITOR, true);

        return !!enabled;
    }

    /**
     * Move children from one HTMLElement to another.
     *
     * @param oldParent The old parent.
     * @param newParent The new parent.
     * @param prepend If true, adds the children to the beginning of the new parent.
     * @returns List of moved children.
     */
    moveChildren(oldParent: HTMLElement, newParent: HTMLElement, prepend?: boolean): Node[] {
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
    removeElement(element: HTMLElement, selector: string): void {
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
    removeElementFromHtml(html: string, selector: string, removeAll?: boolean): string {
        const element = convertHTMLToHTMLElement(html);

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
     * Search for certain classes in an element contents and replace them with the specified new values.
     *
     * @param element DOM element.
     * @param map Mapping of the classes to replace. Keys must be the value to replace, values must be
     *            the new class name. Example: {'correct': 'core-question-answer-correct'}.
     */
    replaceClassesInElement(element: HTMLElement, map: {[currentValue: string]: string}): void {
        for (const key in map) {
            const foundElements = element.querySelectorAll('.' + key);

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
    restoreSourcesInHtml(
        html: string,
        paths: {[url: string]: string},
        anchorFn?: (anchor: HTMLElement, href: string) => void,
    ): string {
        const element = convertHTMLToHTMLElement(html);

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
            if (media.tagName == 'VIDEO' && currentPoster) {
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

                if (typeof anchorFn == 'function') {
                    anchorFn(anchor, newHref);
                }
            }
        });

        return element.innerHTML;
    }

    /**
     * Returns height of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with content height.
     */
    async getContentHeight(content: IonContent): Promise<number> {
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
    async getScrollHeight(content: IonContent): Promise<number> {
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
    async getScrollTop(content: IonContent): Promise<number> {
        try {
            const scrollElement = await content.getScrollElement();

            return scrollElement.scrollTop || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Set whether debug messages should be displayed.
     *
     * @param value Whether to display or not.
     */
    setDebugDisplay(value: boolean): void {
        this.debugDisplay = value;
    }

    /**
     * Show an alert modal with a button to close it.
     *
     * @param header Title to show.
     * @param message Message to show.
     * @param buttonText Text of the button.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     */
    async showAlert(
        header: string | undefined,
        message: string,
        buttonText?: string,
        autocloseTime?: number,
    ): Promise<HTMLIonAlertElement> {
        return this.showAlertWithOptions({
            header,
            message,
            buttons: [buttonText || Translate.instant('core.ok')],
        }, autocloseTime);
    }

    /**
     * General show an alert modal.
     *
     * @param options Alert options to pass to the alert.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     */
    async showAlertWithOptions(options: AlertOptions = {}, autocloseTime?: number): Promise<HTMLIonAlertElement> {
        let message = typeof options.message == 'string'
            ? options.message
            : options.message?.value || '';

        const hasHTMLTags = CoreText.hasHTMLTags(message);

        if (hasHTMLTags && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.7')) {
            // Treat multilang.
            message = await CoreLang.filterMultilang(message);
        }

        options.message = message;

        const alertId = Md5.hashAsciiStr((options.header || '') + '#' + (message|| ''));

        if (this.displayedAlerts[alertId]) {
            // There's already an alert with the same message and title. Return it.
            return this.displayedAlerts[alertId];
        }

        const alert = await AlertController.create(options);

        if (Object.keys(this.displayedAlerts).length === 0) {
            await CoreLoadings.pauseActiveModals();
        }

        // eslint-disable-next-line promise/catch-or-return
        alert.present().then(() => {
            if (hasHTMLTags) {
                // Treat all anchors so they don't override the app.
                const alertMessageEl: HTMLElement | null = alert.querySelector('.alert-message');
                alertMessageEl && this.treatAnchors(alertMessageEl);
            }

            fixOverlayAriaHidden(alert);

            return;
        });

        // Store the alert and remove it when dismissed.
        this.displayedAlerts[alertId] = alert;

        // Set the callbacks to trigger an observable event.
        // eslint-disable-next-line promise/catch-or-return
        alert.onDidDismiss().then(async () => {
            delete this.displayedAlerts[alertId];

            // eslint-disable-next-line promise/always-return
            if (Object.keys(this.displayedAlerts).length === 0) {
                await CoreLoadings.resumeActiveModals();
            }
        });

        if (autocloseTime && autocloseTime > 0) {
            setTimeout(async () => {
                await alert.dismiss();

                if (options.buttons) {
                    // Execute dismiss function if any.
                    const cancelButton = <AlertButton | undefined> options.buttons.find(
                        (button) => typeof button != 'string' && button.handler !== undefined && button.role == 'cancel',
                    );
                    cancelButton?.handler?.(null);
                }
            }, autocloseTime);
        }

        return alert;
    }

    /**
     * Show an alert modal with a button to close it, translating the values supplied.
     *
     * @param header Title to show.
     * @param message Message to show.
     * @param buttonText Text of the button.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     */
    showAlertTranslated(
        header: string | undefined,
        message: string,
        buttonText?: string,
        autocloseTime?: number,
    ): Promise<HTMLIonAlertElement> {
        header = header ? Translate.instant(header) : header;
        message = message ? Translate.instant(message) : message;
        buttonText = buttonText ? Translate.instant(buttonText) : buttonText;

        return this.showAlert(header, message, buttonText, autocloseTime);
    }

    /**
     * Shortcut for a delete confirmation modal.
     *
     * @param translateMessage String key to show in the modal body translated. Default: 'core.areyousure'.
     * @param translateArgs Arguments to pass to translate if necessary.
     * @param options More options. See https://ionicframework.com/docs/v3/api/components/alert/AlertController/
     * @returns Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    async showDeleteConfirm(
        translateMessage: string = 'core.areyousure',
        translateArgs: Record<string, unknown> = {},
        options: AlertOptions = {},
    ): Promise<void> {
        options.message = Translate.instant(translateMessage, translateArgs);
        options.message = await CoreLang.filterMultilang(options.message);

        return new Promise((resolve, reject): void => {
            options.buttons = [
                {
                    text: Translate.instant('core.cancel'),
                    role: 'cancel',
                    handler: () => {
                        reject(new CoreCanceledError(''));
                    },
                },
                {
                    text: Translate.instant('core.delete'),
                    role: 'destructive',
                    handler: () => {
                        resolve();
                    },
                },
            ];

            if (!options.header) {
                options.cssClass = (options.cssClass || '') + ' core-nohead';
            }

            this.showAlertWithOptions(options, 0);
        });
    }

    /**
     * Show a confirm modal.
     *
     * @param message Message to show in the modal body.
     * @param header Header of the modal.
     * @param okText Text of the OK button.
     * @param cancelText Text of the Cancel button.
     * @param options More options.
     * @returns Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    showConfirm<T>(
        message: string,
        header?: string,
        okText?: string,
        cancelText?: string,
        options: AlertOptions = {},
    ): Promise<T> {
        return new Promise<T>((resolve, reject): void => {
            options.header = header;
            options.message = message;

            options.buttons = [
                {
                    text: cancelText || Translate.instant('core.cancel'),
                    role: 'cancel',
                    handler: () => {
                        reject(new CoreCanceledError(''));
                    },
                },
                {
                    text: okText || Translate.instant('core.ok'),
                    handler: (data: T) => {
                        resolve(data);
                    },
                },
            ];

            if (!header) {
                options.cssClass = (options.cssClass || '') + ' core-nohead';
            }

            this.showAlertWithOptions(options, 0);
        });
    }

    /**
     * Show an alert modal with an error message.
     *
     * @param error Message to show.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     */
    async showErrorModal(
        error: CoreError | CoreErrorObject | string,
        needsTranslate?: boolean,
        autocloseTime?: number,
    ): Promise<HTMLIonAlertElement | null> {
        if (this.isCanceledError(error)) {
            // It's a canceled error, don't display an error.
            return null;
        }

        const message = this.getErrorMessage(error, needsTranslate);

        if (message === null) {
            // Message doesn't need to be displayed, stop.
            return null;
        }

        const alertOptions: AlertOptions = { message };

        if (this.isNetworkError(message, error)) {
            alertOptions.cssClass = 'core-alert-network-error';
        }

        if (typeof error !== 'string' && 'title' in error && error.title) {
            alertOptions.header = error.title || undefined;
        } else if (message === Translate.instant('core.sitenotfoundhelp')) {
            alertOptions.header = Translate.instant('core.cannotconnect');
        } else if (this.isSiteUnavailableError(message)) {
            alertOptions.header = CoreSites.isLoggedIn()
                ? Translate.instant('core.connectionlost')
                : Translate.instant('core.cannotconnect');
        } else {
            alertOptions.header = Translate.instant('core.error');
        }

        if (typeof error !== 'string' && 'buttons' in error && typeof error.buttons !== 'undefined') {
            alertOptions.buttons = error.buttons;
        } else if (error instanceof CoreSiteError) {
            if (error.debug) {
                alertOptions.message = `<p>${alertOptions.message}</p><div class="core-error-accordion-container"></div>`;
            }

            const supportConfig = error.supportConfig;

            alertOptions.buttons = [Translate.instant('core.ok')];

            if (supportConfig?.canContactSupport()) {
                alertOptions.buttons.push({
                    text: Translate.instant('core.contactsupport'),
                    handler: () => CoreUserSupport.contact({
                        supportConfig,
                        subject: alertOptions.header,
                        message: `${error.debug?.code}\n\n${error.debug?.details}`,
                    }),
                });
            }
        } else {
            alertOptions.buttons = [Translate.instant('core.ok')];
        }

        const alertElement = await this.showAlertWithOptions(alertOptions, autocloseTime);

        if (error instanceof CoreSiteError && error.debug) {
            const containerElement = alertElement.querySelector('.core-error-accordion-container');

            if (containerElement) {
                await CoreErrorAccordion.render(containerElement, error.debug.code, error.debug.details);
            }
        }

        return alertElement;
    }

    /**
     * Show an alert modal with an error message. It uses a default message if error is not a string.
     *
     * @param error Message to show.
     * @param defaultError Message to show if the error is not a string.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     */
    async showErrorModalDefault(
        error: CoreAnyError,
        defaultError: string,
        needsTranslate = false,
        autocloseTime?: number,
    ): Promise<HTMLIonAlertElement | null> {
        if (this.isCanceledError(error) || this.isSilentError(error)) {
            // It's a canceled or a silent error, don't display an error.
            return null;
        }

        let errorMessage = error || undefined;

        if (error && typeof error != 'string') {
            errorMessage = CoreErrorHelper.getErrorMessageFromError(error);
        }

        return this.showErrorModal(
            typeof errorMessage == 'string' && errorMessage && error ? error : defaultError,
            needsTranslate,
            autocloseTime,
        );
    }

    /**
     * Show an alert modal with the first warning error message. It uses a default message if error is not a string.
     *
     * @param warnings Warnings returned.
     * @param defaultError Message to show if the error is not a string.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     */
    showErrorModalFirstWarning(
        warnings: CoreWSExternalWarning[],
        defaultError: string,
        needsTranslate?: boolean,
        autocloseTime?: number,
    ): Promise<HTMLIonAlertElement | null> {
        return this.showErrorModalDefault(warnings?.[0], defaultError, needsTranslate, autocloseTime);
    }

    /**
     * Displays a loading modal window.
     *
     * @param text The text of the modal window. Default: core.loading.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @returns Loading element instance.
     * @deprecated since 4.5. Use CoreLoading.show instead.
     */
    async showModalLoading(text?: string, needsTranslate?: boolean): Promise<CoreIonLoadingElement> {
        return CoreLoadings.show(text, needsTranslate);
    }

    /**
     * Show a loading modal whilst an operation is running, and an error modal if it fails.
     *
     * @param text Loading dialog text.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @param operation Operation.
     * @returns Operation result.
     */
    async showOperationModals<T>(text: string, needsTranslate: boolean, operation: () => Promise<T>): Promise<T | null> {
        const modal = await CoreLoadings.show(text, needsTranslate);

        try {
            return await operation();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            return null;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Show a modal warning the user that he should use a different app.
     *
     * @param message The warning message.
     * @param link Link to the app to download if any.
     * @returns Promise resolved when done.
     */
    async showDownloadAppNoticeModal(message: string, link?: string): Promise<void> {
        const buttons: AlertButton[] = [{
            text: Translate.instant('core.ok'),
            role: 'cancel',
        }];

        if (link) {
            buttons.push({
                text: Translate.instant('core.download'),
                handler: (): void => {
                    CoreUtils.openInBrowser(link, { showBrowserWarning: false });
                },
            });
        }

        const alert = await this.showAlertWithOptions({
            message: message,
            buttons: buttons,
        });

        const isDevice = CorePlatform.isAndroid() || CorePlatform.isIOS();
        if (!isDevice) {
            // Treat all anchors so they don't override the app.
            const alertMessageEl: HTMLElement | null = alert.querySelector('.alert-message');
            alertMessageEl && this.treatAnchors(alertMessageEl);
        }

        await alert.onDidDismiss();
    }

    /**
     * Show a prompt modal to input some data.
     *
     * @param message Modal message.
     * @param header Modal header.
     * @param placeholderOrLabel Placeholder (for textual/numeric inputs) or label (for radio/checkbox). By default, "Password".
     * @param type Type of the input element. By default, password.
     * @param buttons Buttons. If not provided or it's an object with texts, OK and Cancel buttons will be displayed.
     * @param options Other alert options.
     * @returns Promise resolved with the input data (true for checkbox/radio) if the user clicks OK, rejected if cancels.
     */
    showPrompt(
        message: string,
        header?: string,
        placeholderOrLabel?: string,
        type: TextFieldTypes | 'checkbox' | 'radio' | 'textarea' = 'password',
        buttons?: PromptButton[] | { okText?: string; cancelText?: string },
        options: AlertOptions = {},
    ): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
        return new Promise((resolve, reject) => {
            placeholderOrLabel = placeholderOrLabel ?? Translate.instant('core.login.password');

            const isCheckbox = type === 'checkbox';
            const isRadio = type === 'radio';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resolvePromise = (data: any) => {
                if (isCheckbox) {
                    resolve(data[0]);
                } else if (isRadio) {
                    resolve(data);
                } else {
                    resolve(data.promptinput);
                }
            };

            options.header = header;
            options.message = message;
            options.inputs = [
                {
                    name: 'promptinput',
                    placeholder: placeholderOrLabel,
                    label: placeholderOrLabel,
                    type,
                    value: (isCheckbox || isRadio) ? true : undefined,
                },
            ];

            if (Array.isArray(buttons) && buttons.length) {
                options.buttons = buttons.map((button) => ({
                    ...button,
                    handler: (data) => {
                        if (!button.handler) {
                            // Just resolve the promise.
                            resolvePromise(data);

                            return;
                        }

                        button.handler(data, resolve, reject);
                    },
                }));
            } else {
                // Default buttons.
                options.buttons = [
                    {
                        text: buttons && 'cancelText' in buttons
                            ? buttons.cancelText as string
                            : Translate.instant('core.cancel'),
                        role: 'cancel',
                        handler: () => {
                            reject();
                        },
                    },
                    {
                        text: buttons && 'okText' in buttons
                            ? buttons.okText as string
                            : Translate.instant('core.ok'),
                        handler: resolvePromise,
                    },
                ];
            }

            this.showAlertWithOptions(options);
        });
    }

    /**
     * Show a prompt modal to input a textarea.
     *
     * @param title Modal title.
     * @param message Modal message.
     * @param buttons Buttons to pass to the modal.
     * @param placeholder Placeholder of the input element if any.
     * @returns Promise resolved with the entered text if any.
     */
    async showTextareaPrompt(
        title: string,
        message: string,
        buttons: AlertButton[],
        placeholder?: string,
    ): Promise<string | undefined> {
        const alert = await AlertController.create({
            header: title,
            message,
            inputs: [
                {
                    name: 'textarea-prompt',
                    type: 'textarea',
                    placeholder: placeholder,
                },
            ],
            buttons,
        });

        await alert.present();

        const result = await alert.onWillDismiss();

        if (result.role === 'cancel') {
            return;
        }

        return result.data?.values?.['textarea-prompt'];
    }

    /**
     * Displays an autodimissable toast modal window.
     *
     * @param message The text of the toast.
     * @param translateMessage Whether the 'text' needs to be translated.
     * @param duration Duration in ms of the dimissable toast.
     * @param cssClass Class to add to the toast.
     * @returns Toast instance.
     *
     * @deprecated since 4.5. Use CoreToasts.show instead.
     */
    async showToast(
        message: string,
        translateMessage?: boolean,
        duration: ToastDuration | number = ToastDuration.SHORT,
        cssClass: string = '',
    ): Promise<HTMLIonToastElement> {
        return CoreToasts.show({
            message,
            translateMessage,
            duration,
            cssClass,
            position: 'bottom',
        });
    }

    /**
     * Show toast with some options.
     *
     * @param options Options.
     * @returns Promise resolved with Toast instance.
     *
     * @deprecated since 4.5. Use CoreToasts.show instead.
     */
    async showToastWithOptions(options: ShowToastOptions): Promise<HTMLIonToastElement> {
        return CoreToasts.show(options);
    }

    /**
     * Check if an element supports input via keyboard.
     *
     * @param el HTML element to check.
     * @returns Whether it supports input using keyboard.
     */
    supportsInputKeyboard(el: HTMLElement): boolean {
        return el &&
            !(<HTMLInputElement> el).disabled &&
            (el.tagName.toLowerCase() == 'textarea' ||
                (el.tagName.toLowerCase() == 'input' && this.INPUT_SUPPORT_KEYBOARD.indexOf((<HTMLInputElement> el).type) != -1));
    }

    /**
     * Converts HTML formatted text to DOM element(s).
     *
     * @param text HTML text.
     * @returns Same text converted to HTMLCollection.
     */
    toDom(text: string): HTMLCollection {
        const element = convertHTMLToHTMLElement(text);

        return element.children;
    }

    /**
     * Treat anchors inside alert/modals.
     *
     * @param container The HTMLElement that can contain anchors.
     */
    treatAnchors(container: HTMLElement): void {
        const anchors = Array.from(container.querySelectorAll('a'));

        anchors.forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                if (event.defaultPrevented) {
                    // Stop.
                    return;
                }

                const href = anchor.getAttribute('href');
                if (href) {
                    event.preventDefault();
                    event.stopPropagation();

                    CoreUtils.openInBrowser(href);
                }
            });
        });
    }

    /**
     * Opens a Modal.
     *
     * @param options Modal Options.
     * @returns The modal data when the modal closes.
     *
     * @deprecated since 4.5. Use CoreModals.openModal instead.
     */
    async openModal<T = unknown>(
        options: OpenModalOptions,
    ): Promise<T | undefined> {
        return CoreModals.openModal(options);
    }

    /**
     * Opens a side Modal.
     *
     * @param options Modal Options.
     * @returns The modal data when the modal closes.
     *
     * @deprecated since 4.5. Use CoreModals.openSideModal instead.
     */
    async openSideModal<T = unknown>(
        options: OpenModalOptions,
    ): Promise<T | undefined> {
        return CoreModals.openSideModal(options);
    }

    /**
     * Opens a popover and waits for it to be dismissed to return the result.
     *
     * @param options Options.
     * @returns Promise resolved when the popover is dismissed or will be dismissed.
     *
     * @deprecated since 4.5. Use CorePopovers.open instead.
     */
    async openPopover<T = void>(options: OpenPopoverOptions): Promise<T | undefined> {
        return CorePopovers.open(options);
    }

    /**
     * Opens a popover.
     *
     * @param options Options.
     * @returns Promise resolved when the popover is displayed.
     *
     * @deprecated since 4.5. Use CorePopovers.openWithoutResult instead.
     */
    async openPopoverWithoutResult(options: Omit<PopoverOptions, 'showBackdrop'>): Promise<HTMLIonPopoverElement> {
        return CorePopovers.openWithoutResult(options);
    }

    /**
     * Prompts password to the user and returns the entered text.
     *
     * @param passwordParams Params to show the modal.
     * @returns Entered password, error and validation.
     *
     * @deprecated since 4.5. Use CoreModals.promptPassword instead.
     */
    async promptPassword<T extends CorePasswordModalResponse>(passwordParams?: CorePasswordModalParams): Promise<T> {
        return CoreModals.promptPassword(passwordParams);
    }

    /**
     * View an image in a modal.
     *
     * @param image URL of the image.
     * @param title Title of the page or modal.
     * @param component Component to link the image to if needed.
     * @param componentId An ID to use in conjunction with the component.
     *
     * @deprecated since 4.5. Use CoreViewer.viewImage instead.
     */
    async viewImage(
        image: string,
        title?: string | null,
        component?: string,
        componentId?: string | number,
    ): Promise<void> {
        await CoreViewer.viewImage(image, title, component, componentId);
    }

    /**
     * Wait for images to load.
     *
     * @param element The element to search in.
     * @returns Promise resolved with a boolean: whether there was any image to load.
     */
    waitForImages(element: HTMLElement): CoreCancellablePromise<boolean> {
        const imgs = Array.from(element.querySelectorAll('img'));

        if (imgs.length === 0) {
            return CoreCancellablePromise.resolve(false);
        }

        let completedImages = 0;
        let waitedForImages = false;
        const listeners: WeakMap<Element, () => unknown> = new WeakMap();
        const imageCompleted = (resolve: (result: boolean) => void) => {
            completedImages++;

            if (completedImages === imgs.length) {
                resolve(waitedForImages);
            }
        };

        return new CoreCancellablePromise<boolean>(
            resolve => {
                for (const img of imgs) {
                    if (!img || img.complete) {
                        imageCompleted(resolve);

                        continue;
                    }

                    waitedForImages = true;

                    // Wait for image to load or fail.
                    const imgCompleted = (): void => {
                        img.removeEventListener('load', imgCompleted);
                        img.removeEventListener('error', imgCompleted);

                        imageCompleted(resolve);
                    };

                    img.addEventListener('load', imgCompleted);
                    img.addEventListener('error', imgCompleted);

                    listeners.set(img, imgCompleted);
                }
            },
            () => {
                imgs.forEach(img => {
                    const listener = listeners.get(img);

                    if (!listener) {
                        return;
                    }

                    img.removeEventListener('load', listener);
                    img.removeEventListener('error', listener);
                });
            },
        );
    }

    /**
     * Wrap an HTMLElement with another element.
     *
     * @param el The element to wrap.
     * @param wrapper Wrapper.
     */
    wrapElement(el: HTMLElement, wrapper: HTMLElement): void {
        // Insert the wrapper before the element.
        el.parentNode?.insertBefore(wrapper, el);
        // Now move the element into the wrapper.
        wrapper.appendChild(el);
    }

    /**
     * In iOS the resize event is triggered before the window size changes. Wait for the size to change.
     * Use of this function is discouraged. Please use CoreDom.onWindowResize to check window resize event.
     *
     * @param windowWidth Initial window width.
     * @param windowHeight Initial window height.
     * @param retries Number of retries done.
     * @returns Promise resolved when done.
     *
     * @deprecated since 4.5. Use CoreWait.waitForResizeDone instead.
     */
    async waitForResizeDone(windowWidth?: number, windowHeight?: number, retries = 0): Promise<void> {
        return CoreWait.waitForResizeDone(windowWidth, windowHeight, retries);
    }

    /**
     * Check whether a CSS class indicating an app mode is set.
     *
     * @param className Class name.
     * @returns Whether the CSS class is set.
     */
    hasModeClass(className: string): boolean {
        return document.documentElement.classList.contains(className);
    }

    /**
     * Get active mode CSS classes.
     *
     * @returns Mode classes.
     */
    getModeClasses(): string[] {
        return Array.from(document.documentElement.classList);
    }

    /**
     * Toggle a CSS class in the root element used to indicate app modes.
     *
     * @param className Class name.
     * @param enable Whether to add or remove the class.
     */
    toggleModeClass(
        className: string,
        enable = false,
    ): void {
        document.documentElement.classList.toggle(className, enable);
    }

}

export const CoreDomUtils = makeSingleton(CoreDomUtilsProvider);

/**
 * Buttons for prompt alert.
 */
export type PromptButton = Omit<AlertButton, 'handler'> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler?: (value: any, resolve: (value: any) => void, reject: (reason: any) => void) => void;
};

/**
 * Vertical points for an element.
 */
export enum VerticalPoint {
    TOP = 'top',
    MID = 'mid',
    BOTTOM = 'bottom',
}
