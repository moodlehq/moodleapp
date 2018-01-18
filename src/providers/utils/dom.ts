// (C) Copyright 2015 Martin Dougiamas
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
import { LoadingController, Loading, ToastController, Toast, AlertController, Alert, Platform, Content,
        NavController, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from './text';
import { CoreAppProvider } from '../app';
import { CoreConfigProvider } from '../config';
import { CoreUrlUtilsProvider } from './url';
import { CoreConstants } from '../../core/constants';

/*
 * "Utils" service with helper functions for UI, DOM elements and HTML code.
 */
@Injectable()
export class CoreDomUtilsProvider {
    // List of input types that support keyboard.
    protected INPUT_SUPPORT_KEYBOARD = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'password',
                'search', 'tel', 'text', 'time', 'url', 'week'];

    protected element = document.createElement('div'); // Fake element to use in some functions, to prevent creating it each time.
    protected matchesFn: string; // Name of the "matches" function to use when simulating a closest call.

    constructor(private translate: TranslateService, private loadingCtrl: LoadingController, private toastCtrl: ToastController,
        private alertCtrl: AlertController, private textUtils: CoreTextUtilsProvider, private appProvider: CoreAppProvider,
        private platform: Platform, private configProvider: CoreConfigProvider, private urlUtils: CoreUrlUtilsProvider,
        private modalCtrl: ModalController) {}

    /**
     * Wraps a message with core-format-text if the message contains HTML tags.
     * @todo Finish the adaptation
     *
     * @param {string} message Message to wrap.
     * @return {string} Result message.
     */
    private addFormatTextIfNeeded(message: string) : string {
        // @todo
        if (this.textUtils.hasHTMLTags(message)) {
            return '<core-format-text watch="true">' + message + '</core-format-text>';
        }
        return message;
    }

    /**
     * Equivalent to element.closest(). If the browser doesn't support element.closest, it will
     * traverse the parents to achieve the same functionality.
     * Returns the closest ancestor of the current element (or the current element itself) which matches the selector.
     *
     * @param {HTMLElement} element DOM Element.
     * @param {string} selector Selector to search.
     * @return {Element} Closest ancestor.
     */
    closest(element: HTMLElement, selector: string) : Element {
        // Try to use closest if the browser supports it.
        if (typeof element.closest == 'function') {
            return element.closest(selector);
        }

        if (!this.matchesFn) {
            // Find the matches function supported by the browser.
            ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some((fn) => {
                if (typeof document.body[fn] == 'function') {
                    this.matchesFn = fn;
                    return true;
                }
                return false;
            });

            if (!this.matchesFn) {
                return;
            }
        }

        // Traverse parents.
        while (element) {
            if (element[this.matchesFn](selector)) {
                return element;
            }
            element = element.parentElement;
        }
    }

    /**
     * If the download size is higher than a certain threshold shows a confirm dialog.
     *
     * @param {any} size Object containing size to download and a boolean to indicate if its totally or partialy calculated.
     * @param {string} [message] Code of the message to show. Default: 'core.course.confirmdownload'.
     * @param {string} [unknownMessage] ID of the message to show if size is unknown.
     * @param {number} [wifiThreshold] Threshold to show confirm in WiFi connection. Default: CoreWifiDownloadThreshold.
     * @param {number} [limitedThreshold] Threshold to show confirm in limited connection. Default: CoreDownloadThreshold.
     * @param {boolean} [alwaysConfirm] True to show a confirm even if the size isn't high, false otherwise.
     * @return {Promise<void>} Promise resolved when the user confirms or if no confirm needed.
     */
    confirmDownloadSize(size: any, message?: string, unknownMessage?: string, wifiThreshold?: number, limitedThreshold?: number,
            alwaysConfirm?: boolean) : Promise<void> {
        wifiThreshold = typeof wifiThreshold == 'undefined' ? CoreConstants.WIFI_DOWNLOAD_THRESHOLD : wifiThreshold;
        limitedThreshold = typeof limitedThreshold == 'undefined' ? CoreConstants.DOWNLOAD_THRESHOLD : limitedThreshold;

        if (size.size < 0 || (size.size == 0 && !size.total)) {
            // Seems size was unable to be calculated. Show a warning.
            unknownMessage = unknownMessage || 'core.course.confirmdownloadunknownsize';
            return this.showConfirm(this.translate.instant(unknownMessage));
        } else if (!size.total) {
            // Filesize is only partial.
            let readableSize = this.textUtils.bytesToSize(size.size, 2);
            return this.showConfirm(this.translate.instant('core.course.confirmpartialdownloadsize', {size: readableSize}));
        } else if (size.size >= wifiThreshold || (this.appProvider.isNetworkAccessLimited() && size.size >= limitedThreshold)) {
            message = message || 'core.course.confirmdownload';
            let readableSize = this.textUtils.bytesToSize(size.size, 2);
            return this.showConfirm(this.translate.instant(message, {size: readableSize}));
        } else if (alwaysConfirm) {
            return this.showConfirm(this.translate.instant('core.areyousure'));
        }
        return Promise.resolve();
    }

    /**
     * Extract the downloadable URLs from an HTML code.
     *
     * @param {string} html HTML code.
     * @return {string[]} List of file urls.
     */
    extractDownloadableFilesFromHtml(html: string) : string[] {
        let elements,
            urls = [];

        this.element.innerHTML = html;
        elements = this.element.querySelectorAll('a, img, audio, video, source, track');

        for (let i in elements) {
            let element = elements[i],
                url = element.tagName === 'A' ? element.href : element.src;

            if (url && this.urlUtils.isDownloadableUrl(url) && urls.indexOf(url) == -1) {
                urls.push(url);
            }

            // Treat video poster.
            if (element.tagName == 'VIDEO' && element.getAttribute('poster')) {
                url = element.getAttribute('poster');
                if (url && this.urlUtils.isDownloadableUrl(url) && urls.indexOf(url) == -1) {
                    urls.push(url);
                }
            }
        }

        return urls;
    }

    /**
     * Extract the downloadable URLs from an HTML code and returns them in fake file objects.
     *
     * @param {string} html HTML code.
     * @return {any[]} List of fake file objects with file URLs.
     */
    extractDownloadableFilesFromHtmlAsFakeFileObjects(html: string) : any[] {
        let urls = this.extractDownloadableFilesFromHtml(html);
        // Convert them to fake file objects.
        return urls.map((url) => {
            return {
                fileurl: url
            };
        });
    }

    /**
     * Search all the URLs in a CSS file content.
     *
     * @param {string} code CSS code.
     * @return {string[]} List of URLs.
     */
    extractUrlsFromCSS(code: string) : string[] {
        // First of all, search all the url(...) occurrences that don't include "data:".
        let urls = [],
            matches = code.match(/url\(\s*["']?(?!data:)([^)]+)\)/igm);

        // Extract the URL form each match.
        matches.forEach((match) => {
            let submatches = match.match(/url\(\s*['"]?([^'"]*)['"]?\s*\)/im);
            if (submatches && submatches[1]) {
                urls.push(submatches[1]);
            }
        });

        return urls;
    }

    /**
     * Focus an element and open keyboard.
     *
     * @param {HTMLElement} el HTML element to focus.
     */
    focusElement(el: HTMLElement) : void {
        if (el && el.focus) {
            el.focus();
            if (this.platform.is('android') && this.supportsInputKeyboard(el)) {
                // On some Android versions the keyboard doesn't open automatically.
                this.appProvider.openKeyboard();
            }
        }
    }

    /**
     * Formats a size to be used as width/height of an element.
     * If the size is already valid (like '500px' or '50%') it won't be modified.
     * Returned size will have a format like '500px'.
     *
     * @param {any} size Size to format.
     * @return {string} Formatted size. If size is not valid, returns an empty string.
     */
    formatPixelsSize(size: any) : string {
        if (typeof size == 'string' && (size.indexOf('px') > -1 || size.indexOf('%') > -1)) {
            // It seems to be a valid size.
            return size;
        }

        size = parseInt(size, 10);
        if (!isNaN(size)) {
            return size + 'px';
        }
        return '';
    }

    /**
     * Returns the contents of a certain selection in a DOM element.
     *
     * @param {HTMLElement} element DOM element to search in.
     * @param {string} selector Selector to search.
     * @return {string} Selection contents. Undefined if not found.
     */
    getContentsOfElement(element: HTMLElement, selector: string) : string {
        if (element) {
            let selected = element.querySelector(selector);
            if (selected) {
                return selected.innerHTML;
            }
        }
    }

    /**
     * Returns height of an element.
     *
     * @param {any} element DOM element to measure.
     * @param {boolean} [usePadding] Whether to use padding to calculate the measure.
     * @param {boolean} [useMargin] Whether to use margin to calculate the measure.
     * @param {boolean} [useBorder] Whether to use borders to calculate the measure.
     * @param {boolean} [innerMeasure] If inner measure is needed: padding, margin or borders will be substracted.
     * @return {number} Height in pixels.
     */
    getElementHeight(element: any, usePadding?: boolean, useMargin?: boolean, useBorder?: boolean,
            innerMeasure?: boolean) : number {
        return this.getElementMeasure(element, false, usePadding, useMargin, useBorder, innerMeasure);
    }

    /**
     * Returns height or width of an element.
     *
     * @param {any} element DOM element to measure.
     * @param {boolean} [getWidth] Whether to get width or height.
     * @param {boolean} [usePadding] Whether to use padding to calculate the measure.
     * @param {boolean} [useMargin] Whether to use margin to calculate the measure.
     * @param {boolean} [useBorder] Whether to use borders to calculate the measure.
     * @param {boolean} [innerMeasure] If inner measure is needed: padding, margin or borders will be substracted.
     * @return {number} Measure in pixels.
     */
    getElementMeasure(element: any, getWidth?: boolean, usePadding?: boolean, useMargin?: boolean, useBorder?: boolean,
            innerMeasure?: boolean) : number {

        let offsetMeasure = getWidth ? 'offsetWidth' : 'offsetHeight',
            measureName = getWidth ? 'width' : 'height',
            clientMeasure = getWidth ? 'clientWidth' : 'clientHeight',
            priorSide = getWidth ? 'Left' : 'Top',
            afterSide = getWidth ? 'Right' : 'Bottom',
            measure = element[offsetMeasure] || element[measureName] || element[clientMeasure] || 0;

        // Measure not correctly taken.
        if (measure <= 0) {
            let style = getComputedStyle(element);
            if (style && style.display == '') {
                element.style.display = 'inline-block';
                measure = element[offsetMeasure] || element[measureName] || element[clientMeasure] || 0;
                element.style.display = '';
            }
        }

        if (usePadding || useMargin || useBorder) {
            let surround = 0,
                computedStyle = getComputedStyle(element);
            if (usePadding) {
                surround += parseInt(computedStyle['padding' + priorSide], 10) + parseInt(computedStyle['padding' + afterSide], 10);
            }
            if (useMargin) {
                surround += parseInt(computedStyle['margin' + priorSide], 10) + parseInt(computedStyle['margin' + afterSide], 10);
            }
            if (useBorder) {
                surround += parseInt(computedStyle['border' + priorSide], 10) + parseInt(computedStyle['border' + afterSide], 10);
            }
            if (innerMeasure) {
                measure = measure > surround ? measure - surround : 0;
            } else {
                measure += surround;
            }
        }

        return measure;

    }

    /**
     * Returns width of an element.
     *
     * @param {any} element DOM element to measure.
     * @param {boolean} [usePadding] Whether to use padding to calculate the measure.
     * @param {boolean} [useMargin] Whether to use margin to calculate the measure.
     * @param {boolean} [useBorder] Whether to use borders to calculate the measure.
     * @param {boolean} [innerMeasure] If inner measure is needed: padding, margin or borders will be substracted.
     * @return {number} Width in pixels.
     */
    getElementWidth(element: any, usePadding?: boolean, useMargin?: boolean, useBorder?: boolean,
            innerMeasure?: boolean) : number {
        return this.getElementMeasure(element, true, usePadding, useMargin, useBorder, innerMeasure);
    }

    /**
     * Retrieve the position of a element relative to another element.
     *
     * @param {HTMLElement} container Element to search in.
     * @param {string} [selector] Selector to find the element to gets the position.
     * @param {string} [positionParentClass] Parent Class where to stop calculating the position. Default scroll-content.
     * @return {number[]} positionLeft, positionTop of the element relative to.
     */
    getElementXY(container: HTMLElement, selector?: string, positionParentClass?: string) : number[] {
        let element: HTMLElement = <HTMLElement> (selector ? container.querySelector(selector) : container),
            offsetElement,
            positionTop = 0,
            positionLeft = 0;

        if (!positionParentClass) {
            positionParentClass = 'scroll-content';
        }

        if (!element) {
            return null;
        }

        while (element) {
            positionLeft += (element.offsetLeft - element.scrollLeft + element.clientLeft);
            positionTop += (element.offsetTop - element.scrollTop + element.clientTop);

            offsetElement = element.offsetParent;
            element = element.parentElement;

            // Every parent class has to be checked but the position has to be got form offsetParent.
            while (offsetElement != element && element) {
                // If positionParentClass element is reached, stop adding tops.
                if (element.className.indexOf(positionParentClass) != -1) {
                    element = null;
                } else {
                    element = element.parentElement;
                }
            }

            // Finally, check again.
            if (element && element.className.indexOf(positionParentClass) != -1) {
                element = null;
            }
        }

        return [positionLeft, positionTop];
    }

    /**
     * Given an error message, return a suitable error title.
     *
     * @param {string} message The error message.
     * @return {string} Title.
     */
    private getErrorTitle(message: string) : string {
        if (message == this.translate.instant('core.networkerrormsg') ||
                message == this.translate.instant('core.fileuploader.errormustbeonlinetoupload')) {
            return '<span class="core-icon-with-badge"><i class="icon ion-wifi"></i>\
                <i class="icon ion-alert-circled core-icon-badge"></i></span>';
        }
        return this.textUtils.decodeHTML(this.translate.instant('core.error'));
    }

    /**
     * Check if an element is outside of screen (viewport).
     *
     * @param {HTMLElement} scrollEl The element that must be scrolled.
     * @param {HTMLElement} element DOM element to check.
     * @return {boolean} Whether the element is outside of the viewport.
     */
    isElementOutsideOfScreen(scrollEl: HTMLElement, element: HTMLElement) : boolean {
        let elementRect = element.getBoundingClientRect(),
            elementMidPoint,
            scrollElRect,
            scrollTopPos = 0;

        if (!elementRect) {
            return false;
        }

        elementMidPoint = Math.round((elementRect.bottom + elementRect.top) / 2);

        scrollElRect = scrollEl.getBoundingClientRect();
        scrollTopPos = (scrollElRect && scrollElRect.top) || 0;

        return elementMidPoint > window.innerHeight || elementMidPoint < scrollTopPos;
    }

    /**
     * Check if rich text editor is enabled.
     *
     * @return {Promise<boolean>} Promise resolved with boolean: true if enabled, false otherwise.
     */
    isRichTextEditorEnabled() : Promise<boolean> {
        if (this.isRichTextEditorSupported()) {
            return this.configProvider.get(CoreConstants.SETTINGS_RICH_TEXT_EDITOR, true);
        }

        return Promise.resolve(false);
    }

    /**
     * Check if rich text editor is supported in the platform.
     *
     * @return {boolean} Whether it's supported.
     */
    isRichTextEditorSupported() : boolean {
        // Disabled just for iOS.
        return !this.platform.is('ios');
    }

    /**
     * Move children from one HTMLElement to another.
     *
     * @param {HTMLElement} oldParent The old parent.
     * @param {HTMLElement} newParent The new parent.
     */
    moveChildren(oldParent: HTMLElement, newParent: HTMLElement) : void {
        while (oldParent.childNodes.length > 0) {
            newParent.appendChild(oldParent.childNodes[0]);
        }
    }

    /**
     * Search and remove a certain element from inside another element.
     *
     * @param {HTMLElement} element DOM element to search in.
     * @param {string} selector Selector to search.
     */
    removeElement(element: HTMLElement, selector: string) : void {
        if (element) {
            let selected = element.querySelector(selector);
            if (selected) {
                selected.remove();
            }
        }
    }

    /**
     * Search and remove a certain element from an HTML code.
     *
     * @param {string} html HTML code to change.
     * @param {string} selector Selector to search.
     * @param {boolean} [removeAll] True if it should remove all matches found, false if it should only remove the first one.
     * @return {string} HTML without the element.
     */
    removeElementFromHtml(html: string, selector: string, removeAll?: boolean) : string {
        let selected;

        this.element.innerHTML = html;

        if (removeAll) {
            selected = this.element.querySelectorAll(selector);
            for (let i in selected) {
                selected[i].remove();
            }
        } else {
            selected = this.element.querySelector(selector);
            if (selected) {
                selected.remove();
            }
        }

        return this.element.innerHTML;
    }

    /**
     * Search for certain classes in an element contents and replace them with the specified new values.
     *
     * @param {HTMLElement} element DOM element.
     * @param {any} map Mapping of the classes to replace. Keys must be the value to replace, values must be
     *            the new class name. Example: {'correct': 'core-question-answer-correct'}.
     */
    replaceClassesInElement(element: HTMLElement, map: any) : void {
        for (let key in map) {
            let foundElements = element.querySelectorAll('.' + key);

            for (let i in foundElements) {
                let foundElement = foundElements[i];
                foundElement.className = foundElement.className.replace(key, map[key]);
            }
        }
    }

    /**
     * Given an HTML, search all links and media and tries to restore original sources using the paths object.
     *
     * @param {string} html HTML code.
     * @param {object} paths Object linking URLs in the html code with the real URLs to use.
     * @param {Function} [anchorFn] Function to call with each anchor. Optional.
     * @return {string} Treated HTML code.
     */
    restoreSourcesInHtml(html: string, paths: object, anchorFn?: Function) : string {
        let media,
            anchors;

        this.element.innerHTML = html;

        // Treat elements with src (img, audio, video, ...).
        media = this.element.querySelectorAll('img, video, audio, source, track');
        for (let i in media) {
            let el = media[i],
                newSrc = paths[this.textUtils.decodeURIComponent(el.getAttribute('src'))];

            if (typeof newSrc != 'undefined') {
                el.setAttribute('src', newSrc);
            }

            // Treat video posters.
            if (el.tagName == 'VIDEO' && el.getAttribute('poster')) {
                newSrc = paths[this.textUtils.decodeURIComponent(el.getAttribute('poster'))];
                if (typeof newSrc !== 'undefined') {
                    el.setAttribute('poster', newSrc);
                }
            }
        }

        // Now treat links.
        anchors = this.element.querySelectorAll('a');
        for (let i in anchors) {
            let anchor = anchors[i],
                href = this.textUtils.decodeURIComponent(anchor.getAttribute('href')),
                newUrl = paths[href];

            if (typeof newUrl != 'undefined') {
                anchor.setAttribute('href', newUrl);

                if (typeof anchorFn == 'function') {
                    anchorFn(anchor, href);
                }
            }
        }

        return this.element.innerHTML;
    }

    /**
     * Scroll to a certain element inside another element.
     *
     * @param {Content|HTMLElement} scrollEl The content that must be scrolled.
     * @param {HTMLElement} container Element to search in.
     * @param {string} [selector] Selector to find the element to scroll to. If not defined, scroll to the container.
     * @param {string} [scrollParentClass] Parent class where to stop calculating the position. Default scroll-content.
     * @return {boolean} True if the element is found, false otherwise.
     */
    scrollToElement(scrollEl: Content|HTMLElement, container: HTMLElement, selector?: string, scrollParentClass?: string)
            : boolean {
        let position = this.getElementXY(container, selector, scrollParentClass);
        if (!position) {
            return false;
        }

        scrollEl.scrollTo(position[0], position[1]);
        return true;
    }

    /**
     * Search for an input with error (core-input-error directive) and scrolls to it if found.
     *
     * @param {Content|HTMLElement} scrollEl The element that must be scrolled.
     * @param {HTMLElement} container Element to search in.
     * @param [scrollParentClass] Parent class where to stop calculating the position. Default scroll-content.
     * @return {boolean} True if the element is found, false otherwise.
     */
    scrollToInputError(scrollEl: Content|HTMLElement, container: HTMLElement, scrollParentClass?: string) : boolean {
        if (!scrollEl) {
            return false;
        }

        return this.scrollToElement(scrollEl, container, '.core-input-error', scrollParentClass);
    }

    /**
     * Show an alert modal with a button to close it.
     *
     * @param {string} title Title to show.
     * @param {string} message Message to show.
     * @param {string} [buttonText] Text of the button.
     * @param {number} [autocloseTime] Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return {Alert} The alert modal.
     */
    showAlert(title: string, message: string, buttonText?: string, autocloseTime?: number) : Alert {
        let alert = this.alertCtrl.create({
                title: title,
                message: this.addFormatTextIfNeeded(message), // Add format-text to handle links.
                buttons: [buttonText || this.translate.instant('core.ok')]
            });

        alert.present();

        if (autocloseTime > 0) {
            setTimeout(() => {
                alert.dismiss();
            }, autocloseTime);
        }

        return alert;
    }

    /**
     * Show an alert modal with a button to close it, translating the values supplied.
     *
     * @param {string} title Title to show.
     * @param {string} message Message to show.
     * @param {string} [buttonText] Text of the button.
     * @param {number} [autocloseTime] Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return {Alert} The alert modal.
     */
    showAlertTranslated(title: string, message: string, buttonText?: string, autocloseTime?: number) : Alert {
        title = title ? this.translate.instant(title) : title;
        message = message ? this.translate.instant(message) : message;
        buttonText = buttonText ? this.translate.instant(buttonText) : buttonText;

        return this.showAlert(title, message, buttonText, autocloseTime);
    }

    /**
     * Show a confirm modal.
     *
     * @param {string} message Message to show in the modal body.
     * @param {string} [title] Title of the modal.
     * @param {string} [okText] Text of the OK button.
     * @param {string} [cancelText] Text of the Cancel button.
     * @param {any} [options] More options. See https://ionicframework.com/docs/api/components/alert/AlertController/
     * @return {Promise<void>} Promise resolved if the user confirms and rejected if he cancels.
     */
    showConfirm(message: string, title?: string, okText?: string, cancelText?: string, options?: any) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            options = options || {};

            options.message = this.addFormatTextIfNeeded(message); // Add format-text to handle links.
            options.title = title;
            if (!title) {
                options.cssClass = 'core-nohead';
            }
            options.buttons = [
                {
                    text: cancelText || this.translate.instant('core.cancel'),
                    role: 'cancel',
                    handler: () => {
                        reject();
                    }
                },
                {
                    text: okText || this.translate.instant('core.ok'),
                    handler: () => {
                        resolve();
                    }
                }
            ];

            this.alertCtrl.create(options).present();
        });
    }

    /**
     * Show an alert modal with an error message.
     *
     * @param {any} error Message to show.
     * @param {boolean} [needsTranslate] Whether the error needs to be translated.
     * @param {number} [autocloseTime] Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return {Alert} The alert modal.
     */
    showErrorModal(error: any, needsTranslate?: boolean, autocloseTime?: number) : Alert {
        if (typeof error == 'object') {
            // We received an object instead of a string. Search for common properties.
            if (typeof error.content != 'undefined') {
                error = error.content;
            } else if (typeof error.body != 'undefined') {
                error = error.body;
            } else if (typeof error.message != 'undefined') {
                error = error.message;
            } else if (typeof error.error != 'undefined') {
                error = error.error;
            } else {
                // No common properties found, just stringify it.
                error = JSON.stringify(error);
            }

            // Try to remove tokens from the contents.
            let matches = error.match(/token"?[=|:]"?(\w*)/, '');
            if (matches && matches[1]) {
                error = error.replace(new RegExp(matches[1], 'g'), 'secret');
            }
        }

        let message = this.textUtils.decodeHTML(needsTranslate ? this.translate.instant(error) : error);
        return this.showAlert(this.getErrorTitle(message), message, undefined, autocloseTime);
    }

    /**
     * Show an alert modal with an error message. It uses a default message if error is not a string.
     *
     * @param {any} error Message to show.
     * @param {any} [defaultError] Message to show if the error is not a string.
     * @param {boolean} [needsTranslate] Whether the error needs to be translated.
     * @param {number} [autocloseTime] Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return {Alert} The alert modal.
     */
    showErrorModalDefault(error: any, defaultError: any, needsTranslate?: boolean, autocloseTime?: number) : Alert {
        if (error != CoreConstants.DONT_SHOW_ERROR) {
            if (error && typeof error != 'string') {
                error = error.message || error.error;
            }
            error = typeof error == 'string' ? error : defaultError;
            return this.showErrorModal(error, needsTranslate, autocloseTime);
        }
    }

    /**
     * Show an alert modal with the first warning error message. It uses a default message if error is not a string.
     *
     * @param {any} warnings Warnings returned.
     * @param {any} [defaultError] Message to show if the error is not a string.
     * @param {boolean} [needsTranslate] Whether the error needs to be translated.
     * @param {number} [autocloseTime] Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return {Alert} The alert modal.
     */
    showErrorModalFirstWarning(warnings: any, defaultError: any, needsTranslate?: boolean, autocloseTime?: number) : Alert {
        let error = warnings && warnings.length && warnings[0].message;
        return this.showErrorModalDefault(error, defaultError, needsTranslate, autocloseTime);
    }

    /**
     * Displays a loading modal window.
     *
     * @param {string} [text] The text of the modal window. Default: core.loading.
     * @param {boolean} [needsTranslate] Whether the 'text' needs to be translated.
     * @return {Loading} Loading modal instance.
     * @description
     * Usage:
     *     let modal = domUtils.showModalLoading(myText);
     *     ...
     *     modal.dismiss();
     */
    showModalLoading(text?: string, needsTranslate?: boolean) : Loading {
        if (!text) {
            text = this.translate.instant('core.loading');
        } else if (needsTranslate) {
            text = this.translate.instant(text);
        }

        let loader = this.loadingCtrl.create({
            content: text
        });

        loader.present();

        return loader;
    }

    /**
     * Show a prompt modal to input some data.
     *
     * @param {string} message Modal message.
     * @param {string} [title] Modal title.
     * @param {string} [placeholder] Placeholder of the input element. By default, "Password".
     * @param {string} [type] Type of the input element. By default, password.
     * @return {Promise<any>} Promise resolved with the input data if the user clicks OK, rejected if cancels.
     */
    showPrompt(message: string, title?: string, placeholder?: string, type = 'password') : Promise<any> {
        return new Promise((resolve, reject) => {
            this.alertCtrl.create({
                message: this.addFormatTextIfNeeded(message), // Add format-text to handle links.
                title: title,
                inputs: [
                    {
                        name: 'promptinput',
                        placeholder: placeholder || this.translate.instant('core.login.password'),
                        type: type
                    }
                ],
                buttons: [
                    {
                        text: this.translate.instant('core.cancel'),
                        role: 'cancel',
                        handler: () => {
                            reject();
                        }
                    },
                    {
                        text: this.translate.instant('core.ok'),
                        handler: (data) => {
                            resolve(data.promptinput);
                        }
                    }
                ]
            }).present();
        });
    }

    /**
     * Displays an autodimissable toast modal window.
     *
     * @param {string} text The text of the toast.
     * @param {boolean} [needsTranslate] Whether the 'text' needs to be translated.
     * @param {number} [duration=2000] Duration in ms of the dimissable toast.
     * @return {Toast} Toast instance.
     */
    showToast(text: string, needsTranslate?: boolean, duration = 2000) : Toast {
        if (needsTranslate) {
            text = this.translate.instant(text);
        }

        let loader = this.toastCtrl.create({
            message: text,
            duration: duration,
            position: 'bottom',
            dismissOnPageChange: true
        });

        loader.present();

        return loader;
    }

    /**
     * Check if an element supports input via keyboard.
     *
     * @param {any} el HTML element to check.
     * @return {boolean} Whether it supports input using keyboard.
     */
    supportsInputKeyboard(el: any) : boolean {
        return el && !el.disabled && (el.tagName.toLowerCase() == 'textarea' ||
            (el.tagName.toLowerCase() == 'input' && this.INPUT_SUPPORT_KEYBOARD.indexOf(el.type) != -1));
    }

    /**
     * View an image in a new page or modal.
     *
     * @param {string} image URL of the image.
     * @param {string} title Title of the page or modal.
     * @param {string} [component] Component to link the image to if needed.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     */
    viewImage(image: string, title?: string, component?: string, componentId?: string|number) : void {
        if (image) {
            let params: any = {
                title: title,
                image: image,
                component: component,
                componentId: componentId
            };

            let modal = this.modalCtrl.create('CoreViewerImagePage', params);
            modal.present();
        }

    }

    /**
     * Wrap an HTMLElement with another element.
     *
     * @param {HTMLElement} el The element to wrap.
     * @param {HTMLElement} wrapper Wrapper.
     */
    wrapElement(el: HTMLElement, wrapper: HTMLElement) : void {
        // Insert the wrapper before the element.
        el.parentNode.insertBefore(wrapper, el);
        // Now move the element into the wrapper.
        wrapper.appendChild(el);
    }
}
