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
import { ModalOptions, PopoverOptions, AlertOptions, AlertButton, TextFieldTypes, getMode, ToastOptions } from '@ionic/core';
import { Md5 } from 'ts-md5';

import { CoreApp } from '@services/app';
import { CoreConfig } from '@services/config';
import { CoreFile } from '@services/file';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreTextUtils, CoreTextErrorObject } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';
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
    ToastController,
    PopoverController,
    ModalController,
    Router,
} from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreBSTooltipComponent } from '@components/bs-tooltip/bs-tooltip';
import { CoreViewerImageComponent } from '@features/viewer/components/image/image';
import { CoreModalLateralTransitionEnter, CoreModalLateralTransitionLeave } from '@classes/modal-lateral-transition';
import { CoreZoomLevel } from '@features/settings/services/settings-helper';
import { CoreSites } from '@services/sites';
import { NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { CoreNetwork } from '@services/network';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreErrorInfoComponent } from '@components/error-info/error-info';
import { CorePlatform } from '@services/platform';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreLang } from '@services/lang';
import { CorePasswordModalParams, CorePasswordModalResponse } from '@components/password-modal/password-modal';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreErrorLogs } from '@singletons/error-logs';

/*
 * "Utils" service with helper functions for UI, DOM elements and HTML code.
 */
@Injectable({ providedIn: 'root' })
export class CoreDomUtilsProvider {

    protected readonly INSTANCE_ID_ATTR_NAME = 'core-instance-id';

    // List of input types that support keyboard.
    protected readonly INPUT_SUPPORT_KEYBOARD: string[] = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number',
        'password', 'search', 'tel', 'text', 'time', 'url', 'week'];

    protected template: HTMLTemplateElement = document.createElement('template'); // A template element to convert HTML to element.

    protected matchesFunctionName?: string; // Name of the "matches" function to use when simulating a closest call.
    protected debugDisplay = false; // Whether to display debug messages. Store it in a variable to make it synchronous.
    protected displayedAlerts: Record<string, HTMLIonAlertElement> = {}; // To prevent duplicated alerts.
    protected displayedModals: Record<string, HTMLIonModalElement> = {}; // To prevent duplicated modals.
    protected activeLoadingModals: CoreIonLoadingElement[] = [];
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
        const readableSize = CoreTextUtils.bytesToSize(size.size, 2);

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
                const availableSize = CoreTextUtils.bytesToSize(availableBytes, 2);

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
     */
    convertToElement(html: string): HTMLElement {
        // Add a div to hold the content, that's the element that will be returned.
        this.template.innerHTML = '<div>' + html + '</div>';

        return <HTMLElement> this.template.content.children[0];
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
        this.template.innerHTML = html;

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

        Array.from(this.template.content.children).forEach(fixElement);

        return this.template.innerHTML;
    }

    /**
     * Focus an element and open keyboard.
     *
     * @param element HTML element to focus.
     */
    async focusElement(
        element: HTMLIonInputElement | HTMLIonTextareaElement | HTMLIonSearchbarElement | HTMLElement,
    ): Promise<void> {
        let retries = 10;

        let focusElement = element;

        if ('getInputElement' in focusElement) {
            // If it's an Ionic element get the right input to use.
            focusElement.componentOnReady && await focusElement.componentOnReady();
            focusElement = await focusElement.getInputElement();
        }

        if (!focusElement || !focusElement.focus) {
            throw new CoreError('Element to focus cannot be focused');
        }

        while (retries > 0 && focusElement !== document.activeElement) {
            focusElement.focus();

            if (focusElement === document.activeElement) {
                await CoreUtils.nextTick();
                if (CorePlatform.isAndroid() && this.supportsInputKeyboard(focusElement)) {
                    // On some Android versions the keyboard doesn't open automatically.
                    CoreApp.openKeyboard();
                }
                break;
            }

            // @TODO Probably a Mutation Observer would get this working.
            await CoreUtils.wait(50);
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
        return this.convertToElement(html).children[0].getAttribute(attribute);
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
    protected isNetworkError(message: string, error?: CoreError | CoreTextErrorObject | string): boolean {
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
        siteUnavailableMessage = CoreTextUtils.escapeForRegex(siteUnavailableMessage);
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
    getErrorMessage(error: CoreError | CoreTextErrorObject | string, needsTranslate?: boolean): string | null {
        if (typeof error != 'string' && !error) {
            return null;
        }

        let extraInfo = '';
        let errorMessage: string | undefined;

        if (typeof error == 'object') {
            if (this.debugDisplay) {
                // Get the debug info. Escape the HTML so it is displayed as it is in the view.
                if ('debuginfo' in error && error.debuginfo) {
                    extraInfo = '<br><br>' + CoreTextUtils.escapeHTML(error.debuginfo, false);
                }
                if ('backtrace' in error && error.backtrace) {
                    extraInfo += '<br><br>' + CoreTextUtils.replaceNewLines(
                        CoreTextUtils.escapeHTML(error.backtrace, false),
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
            errorMessage = CoreTextUtils.getErrorMessageFromError(error);
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

        let message = CoreTextUtils.decodeHTML(needsTranslate ? Translate.instant(errorMessage) : errorMessage);

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

                await CoreDomUtils.openPopover({
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
        const element = this.convertToElement(html);

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
        const element = this.convertToElement(html);

        // Treat elements with src (img, audio, video, ...).
        const media = Array.from(element.querySelectorAll<HTMLElement>('img, video, audio, source, track'));
        media.forEach((media: HTMLElement) => {
            const currentSrc = media.getAttribute('src');
            const newSrc = currentSrc ?
                paths[CoreUrlUtils.removeUrlParams(CoreTextUtils.decodeURIComponent(currentSrc))] :
                undefined;

            if (newSrc !== undefined) {
                media.setAttribute('src', newSrc);
            }

            // Treat video posters.
            const currentPoster = media.getAttribute('poster');
            if (media.tagName == 'VIDEO' && currentPoster) {
                const newPoster = paths[CoreTextUtils.decodeURIComponent(currentPoster)];
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
                paths[CoreUrlUtils.removeUrlParams(CoreTextUtils.decodeURIComponent(currentHref))] :
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
        const hasHTMLTags = CoreTextUtils.hasHTMLTags(<string> options.message || '');

        if (hasHTMLTags && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.7')) {
            // Treat multilang.
            options.message = await CoreLang.filterMultilang(<string> options.message);
        }

        const alertId = <string> Md5.hashAsciiStr((options.header || '') + '#' + (options.message || ''));

        if (this.displayedAlerts[alertId]) {
            // There's already an alert with the same message and title. Return it.
            return this.displayedAlerts[alertId];
        }

        const alert = await AlertController.create(options);

        if (Object.keys(this.displayedAlerts).length === 0) {
            await Promise.all(this.activeLoadingModals.slice(0).reverse().map(modal => modal.pause()));
        }

        // eslint-disable-next-line promise/catch-or-return
        alert.present().then(() => {
            if (hasHTMLTags) {
                // Treat all anchors so they don't override the app.
                const alertMessageEl: HTMLElement | null = alert.querySelector('.alert-message');
                alertMessageEl && this.treatAnchors(alertMessageEl);
            }

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
                await Promise.all(this.activeLoadingModals.map(modal => modal.resume()));
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
    showDeleteConfirm(
        translateMessage: string = 'core.areyousure',
        translateArgs: Record<string, unknown> = {},
        options: AlertOptions = {},
    ): Promise<void> {
        return new Promise((resolve, reject): void => {
            options.message = Translate.instant(translateMessage, translateArgs);

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
        error: CoreError | CoreTextErrorObject | string,
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
            if (error.errorDetails) {
                alertOptions.message = `<p>${alertOptions.message}</p><div class="core-error-info-container"></div>`;
            }

            const supportConfig = error.supportConfig;

            alertOptions.buttons = [Translate.instant('core.ok')];

            if (supportConfig?.canContactSupport()) {
                alertOptions.buttons.push({
                    text: Translate.instant('core.contactsupport'),
                    handler: () => CoreUserSupport.contact({
                        supportConfig,
                        subject: alertOptions.header,
                        message: `${error.errorcode}\n\n${error.errorDetails}`,
                    }),
                });
            }
        } else {
            alertOptions.buttons = [Translate.instant('core.ok')];
        }

        const alertElement = await this.showAlertWithOptions(alertOptions, autocloseTime);

        if (error instanceof CoreSiteError && error.errorDetails) {
            const containerElement = alertElement.querySelector('.core-error-info-container');

            if (containerElement) {
                containerElement.innerHTML = CoreErrorInfoComponent.render(error.errorDetails, error.errorcode);
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
            errorMessage = CoreTextUtils.getErrorMessageFromError(error);
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
     * @description
     * Usage:
     *     let modal = await domUtils.showModalLoading(myText);
     *     ...
     *     modal.dismiss();
     */
    async showModalLoading(text?: string, needsTranslate?: boolean): Promise<CoreIonLoadingElement> {
        if (!text) {
            text = Translate.instant('core.loading');
        } else if (needsTranslate) {
            text = Translate.instant(text);
        }

        const loading = new CoreIonLoadingElement(text);

        loading.onDismiss(() => {
            const index = this.activeLoadingModals.indexOf(loading);

            if (index !== -1) {
                this.activeLoadingModals.splice(index, 1);
            }
        });

        this.activeLoadingModals.push(loading);

        await loading.present();

        return loading;
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
        const modal = await this.showModalLoading(text, needsTranslate);

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
     * @param text The text of the toast.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @param duration Duration in ms of the dimissable toast.
     * @param cssClass Class to add to the toast.
     * @returns Toast instance.
     */
    async showToast(
        text: string,
        needsTranslate?: boolean,
        duration: ToastDuration | number = ToastDuration.SHORT,
        cssClass: string = '',
    ): Promise<HTMLIonToastElement> {
        if (needsTranslate) {
            text = Translate.instant(text);
        }

        return this.showToastWithOptions({
            message: text,
            duration: duration,
            position: 'bottom',
            cssClass: cssClass,
        });
    }

    /**
     * Show toast with some options.
     *
     * @param options Options.
     * @returns Promise resolved with Toast instance.
     */
    async showToastWithOptions(options: ShowToastOptions): Promise<HTMLIonToastElement> {
        // Convert some values and set default values.
        const toastOptions: ToastOptions = {
            ...options,
            duration: CoreConstants.CONFIG.toastDurations[options.duration] ?? options.duration ?? 2000,
            position: options.position ?? 'bottom',
        };

        const loader = await ToastController.create(toastOptions);

        await loader.present();

        return loader;
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
        const element = this.convertToElement(text);

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
     */
    async openModal<T = unknown>(
        options: OpenModalOptions,
    ): Promise<T | undefined> {
        const { waitForDismissCompleted, closeOnNavigate, ...modalOptions } = options;
        const listenCloseEvents = closeOnNavigate ?? true; // Default to true.

        // TODO: Improve this if we need two modals with same component open at the same time.
        const modalId = <string> Md5.hashAsciiStr(options.component?.toString() || '');

        const modal = this.displayedModals[modalId]
            ? this.displayedModals[modalId]
            : await ModalController.create(modalOptions);

        let navSubscription: Subscription | undefined;

        // Get the promise before presenting to get result if modal is suddenly hidden.
        const resultPromise = waitForDismissCompleted ? modal.onDidDismiss<T>() : modal.onWillDismiss<T>();

        if (!this.displayedModals[modalId]) {
            // Store the modal and remove it when dismissed.
            this.displayedModals[modalId] = modal;

            if (listenCloseEvents) {
                // Listen navigation events to close modals.
                navSubscription = Router.events
                    .pipe(filter(event => event instanceof NavigationStart))
                    .subscribe(async () => {
                        modal.dismiss();
                    });
            }

            await modal.present();
        }

        const result = await resultPromise;

        navSubscription?.unsubscribe();
        delete this.displayedModals[modalId];

        if (result?.data) {
            return result?.data;
        }
    }

    /**
     * Opens a side Modal.
     *
     * @param options Modal Options.
     * @returns The modal data when the modal closes.
     */
    async openSideModal<T = unknown>(
        options: OpenModalOptions,
    ): Promise<T | undefined> {

        options = Object.assign({
            cssClass: 'core-modal-lateral',
            showBackdrop: true,
            backdropDismiss: true,
            enterAnimation: CoreModalLateralTransitionEnter,
            leaveAnimation: CoreModalLateralTransitionLeave,
        }, options);

        return this.openModal<T>(options);
    }

    /**
     * Opens a popover.
     *
     * @param options Options.
     * @returns Promise resolved when the popover is dismissed or will be dismissed.
     */
    async openPopover<T = void>(options: OpenPopoverOptions): Promise<T | undefined> {

        const { waitForDismissCompleted, ...popoverOptions } = options;
        const popover = await PopoverController.create(popoverOptions);
        const zoomLevel = await CoreConfig.get(CoreConstants.SETTINGS_ZOOM_LEVEL, CoreConstants.CONFIG.defaultZoomLevel);

        await popover.present();

        // Fix popover position if zoom is applied.
        if (zoomLevel !== CoreZoomLevel.NONE) {
            switch (getMode()) {
                case 'ios':
                    fixIOSPopoverPosition(popover, options.event);
                    break;
                case 'md':
                    fixMDPopoverPosition(popover, options.event);
                    break;
            }
        }

        const result = waitForDismissCompleted ? await popover.onDidDismiss<T>() : await popover.onWillDismiss<T>();
        if (result?.data) {
            return result?.data;
        }
    }

    /**
     * Prompts password to the user and returns the entered text.
     *
     * @param passwordParams Params to show the modal.
     * @returns Entered password, error and validation.
     */
    async promptPassword<T extends CorePasswordModalResponse>(passwordParams?: CorePasswordModalParams): Promise<T> {
        const { CorePasswordModalComponent } =
            await import('@/core/components/password-modal/password-modal.module');

        const modalData = await CoreDomUtils.openModal<T>(
            {
                cssClass: 'core-password-modal',
                showBackdrop: true,
                backdropDismiss: true,
                component: CorePasswordModalComponent,
                componentProps: passwordParams,
            },
        );

        if (modalData === undefined) {
            throw new CoreCanceledError();
        } else if (modalData instanceof CoreWSError) {
            throw modalData;
        }

        return modalData;
    }

    /**
     * View an image in a modal.
     *
     * @param image URL of the image.
     * @param title Title of the page or modal.
     * @param component Component to link the image to if needed.
     * @param componentId An ID to use in conjunction with the component.
     */
    async viewImage(
        image: string,
        title?: string | null,
        component?: string,
        componentId?: string | number,
    ): Promise<void> {
        if (!image) {
            return;
        }

        await CoreDomUtils.openModal({
            component: CoreViewerImageComponent,
            componentProps: {
                title,
                image,
                component,
                componentId,
            },
            cssClass: 'core-modal-transparent',
        });

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
     */
    async waitForResizeDone(windowWidth?: number, windowHeight?: number, retries = 0): Promise<void> {
        if (!CorePlatform.isIOS()) {
            return; // Only wait in iOS.
        }

        windowWidth = windowWidth || window.innerWidth;
        windowHeight = windowHeight || window.innerHeight;

        if (windowWidth != window.innerWidth || windowHeight != window.innerHeight || retries >= 10) {
            // Window size changed or max number of retries reached, stop.
            return;
        }

        // Wait a bit and try again.
        await CoreUtils.wait(50);

        return this.waitForResizeDone(windowWidth, windowHeight, retries+1);
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
     * @param options Legacy options, deprecated since 4.1.
     */
    toggleModeClass(
        className: string,
        enable = false,
        options: { includeLegacy: boolean } = { includeLegacy: false },
    ): void {
        document.documentElement.classList.toggle(className, enable);

        // @deprecated since 4.1.
        document.body.classList.toggle(className, enable && options.includeLegacy);
    }

}

/**
 * Fix the position of a popover that was created with a zoom level applied in iOS.
 *
 * This is necessary because Ionic's implementation gets the body dimensions from `element.ownerDocument.defaultView.innerXXX`,
 * which doesn't return the correct dimensions when the `zoom` CSS property is being used. This is specially necessary
 * in iOS because Android already respects system font sizes. Eventually, we should find an alternative implementation for iOS
 * that doesn't require this workaround (also because the `zoom` CSS property is not standard and its usage is discouraged for
 * production).
 *
 * This function has been copied in its entirety from Ionic's source code, only changing the aforementioned calculation
 * of the body dimensions with `document.body.clientXXX`.
 *
 * @see https://github.com/ionic-team/ionic-framework/blob/v5.6.6/core/src/components/popover/animations/ios.enter.ts
 */
function fixIOSPopoverPosition(baseEl: HTMLElement, ev?: Event): void {
    let originY = 'top';
    let originX = 'left';

    const POPOVER_IOS_BODY_PADDING = 5;
    const contentEl = baseEl.querySelector('.popover-content') as HTMLElement;
    const contentDimentions = contentEl.getBoundingClientRect();
    const contentWidth = contentDimentions.width;
    const contentHeight = contentDimentions.height;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    const targetDim = ev && ev.target && (ev.target as HTMLElement).getBoundingClientRect();
    const targetTop = targetDim != null && 'top' in targetDim ? targetDim.top : bodyHeight / 2 - contentHeight / 2;
    const targetLeft = targetDim != null && 'left' in targetDim ? targetDim.left : bodyWidth / 2;
    const targetWidth = (targetDim && targetDim.width) || 0;
    const targetHeight = (targetDim && targetDim.height) || 0;
    const arrowEl = baseEl.querySelector('.popover-arrow') as HTMLElement;
    const arrowDim = arrowEl.getBoundingClientRect();
    const arrowWidth = arrowDim.width;
    const arrowHeight = arrowDim.height;

    if (targetDim == null) {
        arrowEl.style.display = 'none';
    }

    const arrowCSS = {
        top: targetTop + targetHeight,
        left: targetLeft + targetWidth / 2 - arrowWidth / 2,
    };

    const popoverCSS: { top: number; left: number } = {
        top: targetTop + targetHeight + (arrowHeight - 1),
        left: targetLeft + targetWidth / 2 - contentWidth / 2,
    };

    let checkSafeAreaLeft = false;
    let checkSafeAreaRight = false;

    if (popoverCSS.left < POPOVER_IOS_BODY_PADDING + 25) {
        checkSafeAreaLeft = true;
        popoverCSS.left = POPOVER_IOS_BODY_PADDING;
    } else if (
        contentWidth + POPOVER_IOS_BODY_PADDING + popoverCSS.left + 25 > bodyWidth
    ) {
        checkSafeAreaRight = true;
        popoverCSS.left = bodyWidth - contentWidth - POPOVER_IOS_BODY_PADDING;
        originX = 'right';
    }

    if (targetTop + targetHeight + contentHeight > bodyHeight && targetTop - contentHeight > 0) {
        arrowCSS.top = targetTop - (arrowHeight + 1);
        popoverCSS.top = targetTop - contentHeight - (arrowHeight - 1);

        baseEl.className = baseEl.className + ' popover-bottom';
        originY = 'bottom';
    } else if (targetTop + targetHeight + contentHeight > bodyHeight) {
        contentEl.style.bottom = POPOVER_IOS_BODY_PADDING + '%';
    }

    arrowEl.style.top = arrowCSS.top + 'px';
    arrowEl.style.left = arrowCSS.left + 'px';

    contentEl.style.top = popoverCSS.top + 'px';
    contentEl.style.left = popoverCSS.left + 'px';

    if (checkSafeAreaLeft) {
        contentEl.style.left = `calc(${popoverCSS.left}px + var(--ion-safe-area-left, 0px))`;
    }

    if (checkSafeAreaRight) {
        contentEl.style.left = `calc(${popoverCSS.left}px - var(--ion-safe-area-right, 0px))`;
    }

    contentEl.style.transformOrigin = originY + ' ' + originX;
}

/**
 * Fix the position of a popover that was created with a zoom level applied in Android.
 *
 * This is necessary because Ionic's implementation gets the body dimensions from `element.ownerDocument.defaultView.innerXXX`,
 * which doesn't return the correct dimensions when the `zoom` CSS property is being used. This is only a temporary solution
 * in Android because system zooming is already supported, so it won't be necessary to do it at an app level.
 *
 * @todo MOBILE-3790 remove the ability to zoom in Android.
 *
 * This function has been copied in its entirety from Ionic's source code, only changing the aforementioned calculation
 * of the body dimensions with `document.body.clientXXX`.
 *
 * @see https://github.com/ionic-team/ionic-framework/blob/v5.6.6/core/src/components/popover/animations/md.enter.ts
 */
function fixMDPopoverPosition(baseEl: HTMLElement, ev?: Event): void {
    const POPOVER_MD_BODY_PADDING = 12;
    const isRTL = document.dir === 'rtl';

    let originY = 'top';
    let originX = isRTL ? 'right' : 'left';

    const contentEl = baseEl.querySelector('.popover-content') as HTMLElement;
    const contentDimentions = contentEl.getBoundingClientRect();
    const contentWidth = contentDimentions.width;
    const contentHeight = contentDimentions.height;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    const targetDim = ev && ev.target && (ev.target as HTMLElement).getBoundingClientRect();
    const targetTop = targetDim != null && 'bottom' in targetDim
        ? targetDim.bottom
        : bodyHeight / 2 - contentHeight / 2;
    const targetLeft = targetDim != null && 'left' in targetDim
        ? isRTL
            ? targetDim.left - contentWidth + targetDim.width
            : targetDim.left
        : bodyWidth / 2 - contentWidth / 2;
    const targetHeight = (targetDim && targetDim.height) || 0;
    const popoverCSS: { top: number; left: number } = {
        top: targetTop,
        left: targetLeft,
    };

    if (popoverCSS.left < POPOVER_MD_BODY_PADDING) {
        popoverCSS.left = POPOVER_MD_BODY_PADDING;
        originX = 'left';
    } else if (contentWidth + POPOVER_MD_BODY_PADDING + popoverCSS.left > bodyWidth) {
        popoverCSS.left = bodyWidth - contentWidth - POPOVER_MD_BODY_PADDING;
        originX = 'right';
    }

    if (targetTop + targetHeight + contentHeight > bodyHeight && targetTop - contentHeight > 0) {
        popoverCSS.top = targetTop - contentHeight - targetHeight;
        baseEl.className = baseEl.className + ' popover-bottom';
        originY = 'bottom';
    } else if (targetTop + targetHeight + contentHeight > bodyHeight) {
        contentEl.style.bottom = POPOVER_MD_BODY_PADDING + 'px';
    }

    contentEl.style.top = popoverCSS.top + 'px';
    contentEl.style.left = popoverCSS.left + 'px';
    contentEl.style.transformOrigin = originY + ' ' + originX;
}

export const CoreDomUtils = makeSingleton(CoreDomUtilsProvider);

/**
 * Options for the openPopover function.
 */
export type OpenPopoverOptions = Omit<PopoverOptions, 'showBackdrop'> & {
    waitForDismissCompleted?: boolean;
};

/**
 * Options for the openModal function.
 */
export type OpenModalOptions = ModalOptions & {
    waitForDismissCompleted?: boolean;
    closeOnNavigate?: boolean; // Default true.
};

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

/**
 * Toast duration.
 */
export enum ToastDuration {
    LONG = 'long',
    SHORT = 'short',
    STICKY = 'sticky',
}

/**
 * Options for showToastWithOptions.
 */
export type ShowToastOptions = Omit<ToastOptions, 'duration'> & {
    duration: ToastDuration | number;
};
