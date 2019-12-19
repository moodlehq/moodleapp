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

import { Injectable, SimpleChange } from '@angular/core';
import {
    LoadingController, Loading, ToastController, Toast, AlertController, Alert, Platform, Content, PopoverController,
    ModalController,
} from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from './text';
import { CoreAppProvider } from '../app';
import { CoreConfigProvider } from '../config';
import { CoreLoggerProvider } from '../logger';
import { CoreUrlUtilsProvider } from './url';
import { CoreFileProvider } from '@providers/file';
import { CoreConstants } from '@core/constants';
import { CoreBSTooltipComponent } from '@components/bs-tooltip/bs-tooltip';
import { Md5 } from 'ts-md5/dist/md5';
import { Subject } from 'rxjs';

/**
 * Interface that defines an extension of the Ionic Alert class, to support multiple listeners.
 */
export interface CoreAlert extends Alert {
    /**
     * Observable that will notify when the alert is dismissed.
     */
    didDismiss: Subject<{data: any, role: string}>;

    /**
     * Observable that will notify when the alert will be dismissed.
     */
    willDismiss: Subject<{data: any, role: string}>;
}

/*
 * "Utils" service with helper functions for UI, DOM elements and HTML code.
 */
@Injectable()
export class CoreDomUtilsProvider {
    // List of input types that support keyboard.
    protected INPUT_SUPPORT_KEYBOARD = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'password',
        'search', 'tel', 'text', 'time', 'url', 'week'];
    protected INSTANCE_ID_ATTR_NAME = 'core-instance-id';

    protected template = document.createElement('template'); // A template element to convert HTML to element.

    protected matchesFn: string; // Name of the "matches" function to use when simulating a closest call.
    protected instances: {[id: string]: any} = {}; // Store component/directive instances by id.
    protected lastInstanceId = 0;
    protected debugDisplay = false; // Whether to display debug messages. Store it in a variable to make it synchronous.
    protected displayedAlerts = {}; // To prevent duplicated alerts.
    protected logger;

    constructor(private translate: TranslateService,
            private loadingCtrl: LoadingController,
            private toastCtrl: ToastController,
            private alertCtrl: AlertController,
            private textUtils: CoreTextUtilsProvider,
            private appProvider: CoreAppProvider,
            private platform: Platform,
            private configProvider: CoreConfigProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private modalCtrl: ModalController,
            private sanitizer: DomSanitizer,
            private popoverCtrl: PopoverController,
            private fileProvider: CoreFileProvider,
            loggerProvider: CoreLoggerProvider) {

        this.logger = loggerProvider.getInstance('CoreDomUtilsProvider');

        // Check if debug messages should be displayed.
        configProvider.get(CoreConstants.SETTINGS_DEBUG_DISPLAY, false).then((debugDisplay) => {
            this.debugDisplay = !!debugDisplay;
        });
    }

    /**
     * Equivalent to element.closest(). If the browser doesn't support element.closest, it will
     * traverse the parents to achieve the same functionality.
     * Returns the closest ancestor of the current element (or the current element itself) which matches the selector.
     *
     * @param element DOM Element.
     * @param selector Selector to search.
     * @return Closest ancestor.
     */
    closest(element: HTMLElement, selector: string): Element {
        // Try to use closest if the browser supports it.
        if (typeof element.closest == 'function') {
            return element.closest(selector);
        }

        if (!this.matchesFn) {
            // Find the matches function supported by the browser.
            ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'].some((fn) => {
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
     * @param size Object containing size to download and a boolean to indicate if its totally or partialy calculated.
     * @param message Code of the message to show. Default: 'core.course.confirmdownload'.
     * @param unknownMessage ID of the message to show if size is unknown.
     * @param wifiThreshold Threshold to show confirm in WiFi connection. Default: CoreWifiDownloadThreshold.
     * @param limitedThreshold Threshold to show confirm in limited connection. Default: CoreDownloadThreshold.
     * @param alwaysConfirm True to show a confirm even if the size isn't high, false otherwise.
     * @return Promise resolved when the user confirms or if no confirm needed.
     */
    confirmDownloadSize(size: any, message?: string, unknownMessage?: string, wifiThreshold?: number, limitedThreshold?: number,
            alwaysConfirm?: boolean): Promise<void> {
        const readableSize = this.textUtils.bytesToSize(size.size, 2);

        const getAvailableBytes = new Promise((resolve): void => {
            if (this.appProvider.isDesktop()) {
                // Free space calculation is not supported on desktop.
                resolve(null);
            } else {
                this.fileProvider.calculateFreeSpace().then((availableBytes) => {
                    if (this.platform.is('android')) {
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
                }).then((availableBytes) => {
                    resolve(availableBytes);
                });
            }
        });

        const getAvailableSpace = getAvailableBytes.then((availableBytes: number) => {
            if (availableBytes === null) {
                return '';
            } else {
                const availableSize = this.textUtils.bytesToSize(availableBytes, 2);
                if (this.platform.is('android') && size.size > availableBytes - CoreConstants.MINIMUM_FREE_SPACE) {
                    return Promise.reject(this.translate.instant('core.course.insufficientavailablespace', { size: readableSize }));
                }

                return this.translate.instant('core.course.availablespace', {available: availableSize});
            }
        });

        return getAvailableSpace.then((availableSpace) => {
            wifiThreshold = typeof wifiThreshold == 'undefined' ? CoreConstants.WIFI_DOWNLOAD_THRESHOLD : wifiThreshold;
            limitedThreshold = typeof limitedThreshold == 'undefined' ? CoreConstants.DOWNLOAD_THRESHOLD : limitedThreshold;

            let wifiPrefix = '';
            if (this.appProvider.isNetworkAccessLimited()) {
                wifiPrefix = this.translate.instant('core.course.confirmlimiteddownload');
            }

            if (size.size < 0 || (size.size == 0 && !size.total)) {
                // Seems size was unable to be calculated. Show a warning.
                unknownMessage = unknownMessage || 'core.course.confirmdownloadunknownsize';

                return this.showConfirm(wifiPrefix + this.translate.instant(unknownMessage, {availableSpace: availableSpace}));
            } else if (!size.total) {
                // Filesize is only partial.

                return this.showConfirm(wifiPrefix + this.translate.instant('core.course.confirmpartialdownloadsize',
                    { size: readableSize, availableSpace: availableSpace }));
            } else if (alwaysConfirm || size.size >= wifiThreshold ||
                (this.appProvider.isNetworkAccessLimited() && size.size >= limitedThreshold)) {
                message = message || (size.size === 0 ? 'core.course.confirmdownloadzerosize' : 'core.course.confirmdownload');

                return this.showConfirm(wifiPrefix + this.translate.instant(message,
                    { size: readableSize, availableSpace: availableSpace }));
            }

            return Promise.resolve();
        });
    }

    /**
     * Convert some HTML as text into an HTMLElement. This HTML is put inside a div or a body.
     *
     * @param html Text to convert.
     * @return Element.
     */
    convertToElement(html: string): HTMLElement {
        // Add a div to hold the content, that's the element that will be returned.
        this.template.innerHTML = '<div>' + html + '</div>';

        return <HTMLElement> this.template.content.children[0];
    }

    /**
     * Create a "cancelled" error. These errors won't display an error message in showErrorModal functions.
     *
     * @return The error object.
     */
    createCanceledError(): any {
        return {coreCanceled: true};
    }

    /**
     * Given a list of changes for a component input detected by a KeyValueDiffers, create an object similar to the one
     * passed to the ngOnChanges functions.
     *
     * @param changes Changes detected by KeyValueDiffer.
     * @return Changes in a format like ngOnChanges.
     */
    createChangesFromKeyValueDiff(changes: any): { [name: string]: SimpleChange } {
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
     * Extract the downloadable URLs from an HTML code.
     *
     * @param html HTML code.
     * @return List of file urls.
     * @deprecated since 3.8. Use CoreFilepoolProvider.extractDownloadableFilesFromHtml instead.
     */
    extractDownloadableFilesFromHtml(html: string): string[] {
        this.logger.error('The function extractDownloadableFilesFromHtml has been moved to CoreFilepoolProvider.' +
                ' Please use that function instead of this one.');

        const urls = [];
        let elements;

        const element = this.convertToElement(html);
        elements = element.querySelectorAll('a, img, audio, video, source, track');

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            let url = element.tagName === 'A' ? element.href : element.src;

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
     * @param html HTML code.
     * @return List of fake file objects with file URLs.
     * @deprecated since 3.8. Use CoreFilepoolProvider.extractDownloadableFilesFromHtmlAsFakeFileObjects instead.
     */
    extractDownloadableFilesFromHtmlAsFakeFileObjects(html: string): any[] {
        const urls = this.extractDownloadableFilesFromHtml(html);

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
     * @param code CSS code.
     * @return List of URLs.
     */
    extractUrlsFromCSS(code: string): string[] {
        // First of all, search all the url(...) occurrences that don't include "data:".
        const urls = [],
            matches = code.match(/url\(\s*["']?(?!data:)([^)]+)\)/igm);

        if (!matches) {
            return urls;
        }

        // Extract the URL form each match.
        matches.forEach((match) => {
            const submatches = match.match(/url\(\s*['"]?([^'"]*)['"]?\s*\)/im);
            if (submatches && submatches[1]) {
                urls.push(submatches[1]);
            }
        });

        return urls;
    }

    /**
     * Fix syntax errors in HTML.
     *
     * @param html HTML text.
     * @return Fixed HTML text.
     */
    fixHtml(html: string): string {
        this.template.innerHTML = html;

        const attrNameRegExp = /[^\x00-\x20\x7F-\x9F"'>\/=]+/;

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
     * @param el HTML element to focus.
     */
    focusElement(el: HTMLElement): void {
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
     * @param size Size to format.
     * @return Formatted size. If size is not valid, returns an empty string.
     */
    formatPixelsSize(size: any): string {
        if (typeof size == 'string' && (size.indexOf('px') > -1 || size.indexOf('%') > -1 || size == 'auto' || size == 'initial')) {
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
     * @param element DOM element to search in.
     * @param selector Selector to search.
     * @return Selection contents. Undefined if not found.
     */
    getContentsOfElement(element: HTMLElement, selector: string): string {
        if (element) {
            const selected = element.querySelector(selector);
            if (selected) {
                return selected.innerHTML;
            }
        }
    }

    /**
     * Get the data from a form. It will only collect elements that have a name.
     *
     * @param form The form to get the data from.
     * @return Object with the data. The keys are the names of the inputs.
     */
    getDataFromForm(form: HTMLFormElement): any {
        if (!form || !form.elements) {
            return {};
        }

        const data = {};

        for (let i = 0; i < form.elements.length; i++) {
            const element: any = form.elements[i],
                name = element.name || '';

            // Ignore submit inputs.
            if (!name || element.type == 'submit' || element.tagName == 'BUTTON') {
                continue;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                data[name] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    data[name] = element.value;
                }
            } else {
                data[name] = element.value;
            }
        }

        return data;
    }

    /**
     * Returns the attribute value of a string element. Only the first element will be selected.
     *
     * @param html HTML element in string.
     * @param attribute Attribute to get.
     * @return Attribute value.
     */
    getHTMLElementAttribute(html: string, attribute: string): string {
        return this.convertToElement(html).children[0].getAttribute('src');
    }

    /**
     * Returns height of an element.
     *
     * @param element DOM element to measure.
     * @param usePadding Whether to use padding to calculate the measure.
     * @param useMargin Whether to use margin to calculate the measure.
     * @param useBorder Whether to use borders to calculate the measure.
     * @param innerMeasure If inner measure is needed: padding, margin or borders will be substracted.
     * @return Height in pixels.
     */
    getElementHeight(element: any, usePadding?: boolean, useMargin?: boolean, useBorder?: boolean,
            innerMeasure?: boolean): number {
        return this.getElementMeasure(element, false, usePadding, useMargin, useBorder, innerMeasure);
    }

    /**
     * Returns height or width of an element.
     *
     * @param element DOM element to measure.
     * @param getWidth Whether to get width or height.
     * @param usePadding Whether to use padding to calculate the measure.
     * @param useMargin Whether to use margin to calculate the measure.
     * @param useBorder Whether to use borders to calculate the measure.
     * @param innerMeasure If inner measure is needed: padding, margin or borders will be substracted.
     * @return Measure in pixels.
     */
    getElementMeasure(element: any, getWidth?: boolean, usePadding?: boolean, useMargin?: boolean, useBorder?: boolean,
            innerMeasure?: boolean): number {

        const offsetMeasure = getWidth ? 'offsetWidth' : 'offsetHeight',
            measureName = getWidth ? 'width' : 'height',
            clientMeasure = getWidth ? 'clientWidth' : 'clientHeight',
            priorSide = getWidth ? 'Left' : 'Top',
            afterSide = getWidth ? 'Right' : 'Bottom';
        let measure = element[offsetMeasure] || element[measureName] || element[clientMeasure] || 0;

        // Measure not correctly taken.
        if (measure <= 0) {
            const style = getComputedStyle(element);
            if (style && style.display == '') {
                element.style.display = 'inline-block';
                measure = element[offsetMeasure] || element[measureName] || element[clientMeasure] || 0;
                element.style.display = '';
            }
        }

        if (usePadding || useMargin || useBorder) {
            const computedStyle = getComputedStyle(element);
            let surround = 0;

            if (usePadding) {
                surround += this.getComputedStyleMeasure(computedStyle, 'padding' + priorSide) +
                    this.getComputedStyleMeasure(computedStyle, 'padding' + afterSide);
            }
            if (useMargin) {
                surround += this.getComputedStyleMeasure(computedStyle, 'margin' + priorSide) +
                    this.getComputedStyleMeasure(computedStyle, 'margin' + afterSide);
            }
            if (useBorder) {
                surround += this.getComputedStyleMeasure(computedStyle, 'border' + priorSide + 'Width') +
                    this.getComputedStyleMeasure(computedStyle, 'border' + afterSide + 'Width');
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
     * Returns the computed style measure or 0 if not found or NaN.
     *
     * @param style Style from getComputedStyle.
     * @param measure Measure to get.
     * @return Result of the measure.
     */
    getComputedStyleMeasure(style: any, measure: string): number {
        return parseInt(style[measure], 10) || 0;
    }

    /**
     * Get the HTML code to render a connection warning icon.
     *
     * @return HTML Code.
     */
    getConnectionWarningIconHtml(): string {
        return '<div text-center><span class="core-icon-with-badge">' +
                '<ion-icon role="img" class="icon fa fa-wifi" aria-label="wifi"></ion-icon>' +
                '<ion-icon class="icon fa fa-exclamation-triangle core-icon-badge"></ion-icon>' +
            '</span></div>';
    }

    /**
     * Returns width of an element.
     *
     * @param element DOM element to measure.
     * @param usePadding Whether to use padding to calculate the measure.
     * @param useMargin Whether to use margin to calculate the measure.
     * @param useBorder Whether to use borders to calculate the measure.
     * @param innerMeasure If inner measure is needed: padding, margin or borders will be substracted.
     * @return Width in pixels.
     */
    getElementWidth(element: any, usePadding?: boolean, useMargin?: boolean, useBorder?: boolean,
            innerMeasure?: boolean): number {
        return this.getElementMeasure(element, true, usePadding, useMargin, useBorder, innerMeasure);
    }

    /**
     * Retrieve the position of a element relative to another element.
     *
     * @param container Element to search in.
     * @param selector Selector to find the element to gets the position.
     * @param positionParentClass Parent Class where to stop calculating the position. Default scroll-content.
     * @return positionLeft, positionTop of the element relative to.
     */
    getElementXY(container: HTMLElement, selector?: string, positionParentClass?: string): number[] {
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
     * @param message The error message.
     * @return Title.
     */
    private getErrorTitle(message: string): any {
        if (message == this.translate.instant('core.networkerrormsg') ||
                message == this.translate.instant('core.fileuploader.errormustbeonlinetoupload')) {

            return this.sanitizer.bypassSecurityTrustHtml(this.getConnectionWarningIconHtml());
        }

        return this.textUtils.decodeHTML(this.translate.instant('core.error'));
    }

    /**
     * Get the error message from an error, including debug data if needed.
     *
     * @param error Message to show.
     * @param needsTranslate Whether the error needs to be translated.
     * @return Error message, null if no error should be displayed.
     */
    getErrorMessage(error: any, needsTranslate?: boolean): string {
        let extraInfo = '';

        if (typeof error == 'object') {
            if (this.debugDisplay) {
                // Get the debug info. Escape the HTML so it is displayed as it is in the view.
                if (error.debuginfo) {
                    extraInfo = '<br><br>' + this.textUtils.escapeHTML(error.debuginfo);
                }
                if (error.backtrace) {
                    extraInfo += '<br><br>' + this.textUtils.replaceNewLines(this.textUtils.escapeHTML(error.backtrace), '<br>');
                }

                // tslint:disable-next-line
                console.error(error);
            }

            // We received an object instead of a string. Search for common properties.
            if (error.coreCanceled) {
                // It's a canceled error, don't display an error.
                return null;
            }

            error = this.textUtils.getErrorMessageFromError(error);
            if (!error) {
                // No common properties found, just stringify it.
                error = JSON.stringify(error);
                extraInfo = ''; // No need to add extra info because it's already in the error.
            }

            // Try to remove tokens from the contents.
            const matches = error.match(/token"?[=|:]"?(\w*)/, '');
            if (matches && matches[1]) {
                error = error.replace(new RegExp(matches[1], 'g'), 'secret');
            }
        }

        if (error == CoreConstants.DONT_SHOW_ERROR) {
            // The error shouldn't be shown, stop.
            return null;
        }

        let message = this.textUtils.decodeHTML(needsTranslate ? this.translate.instant(error) : error);

        if (extraInfo) {
            message += extraInfo;
        }

        return message;
    }

    /**
     * Retrieve component/directive instance.
     * Please use this function only if you cannot retrieve the instance using parent/child methods: ViewChild (or similar)
     * or Angular's injection.
     *
     * @param element The root element of the component/directive.
     * @return The instance, undefined if not found.
     */
    getInstanceByElement(element: Element): any {
        const id = element.getAttribute(this.INSTANCE_ID_ATTR_NAME);

        return this.instances[id];
    }

    /**
     * Wait an element to exists using the findFunction.
     *
     * @param findFunction The function used to find the element.
     * @return Resolved if found, rejected if too many tries.
     */
    waitElementToExist(findFunction: Function): Promise<HTMLElement> {
        const promiseInterval = {
            promise: null,
            resolve: null,
            reject: null
        };

        let tries = 100;

        promiseInterval.promise = new Promise((resolve, reject): void => {
            promiseInterval.resolve = resolve;
            promiseInterval.reject = reject;
        });

        const clear = setInterval(() => {
            const element: HTMLElement = findFunction();

            if (element) {
                clearInterval(clear);
                promiseInterval.resolve(element);
            } else {
                tries--;

                if (tries <= 0) {
                    clearInterval(clear);
                    promiseInterval.reject();
                }
            }
        }, 100);

        return promiseInterval.promise;
    }

    /**
     * Handle bootstrap tooltips in a certain element.
     *
     * @param element Element to check.
     */
    handleBootstrapTooltips(element: HTMLElement): void {
        const els = Array.from(element.querySelectorAll('[data-toggle="tooltip"]'));

        els.forEach((el) => {
            const content = el.getAttribute('title') || el.getAttribute('data-original-title'),
                trigger = el.getAttribute('data-trigger') || 'hover focus',
                treated = el.getAttribute('data-bstooltip-treated');

            if (!content || treated === 'true' ||
                    (trigger.indexOf('hover') == -1 && trigger.indexOf('focus') == -1 && trigger.indexOf('click') == -1)) {
                return;
            }

            el.setAttribute('data-bstooltip-treated', 'true'); // Mark it as treated.

            // Store the title in data-original-title instead of title, like BS does.
            el.setAttribute('data-original-title', content);
            el.setAttribute('title', '');

            el.addEventListener('click', (e) => {
                const html = el.getAttribute('data-html');

                const popover = this.popoverCtrl.create(CoreBSTooltipComponent, {
                    content: content,
                    html: html === 'true'
                });

                popover.present({
                    ev: e
                });
            });
        });
    }

    /**
     * Check if an element is outside of screen (viewport).
     *
     * @param scrollEl The element that must be scrolled.
     * @param element DOM element to check.
     * @return Whether the element is outside of the viewport.
     */
    isElementOutsideOfScreen(scrollEl: HTMLElement, element: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();
        let elementMidPoint,
            scrollElRect,
            scrollTopPos = 0;

        if (!elementRect) {
            return false;
        }

        elementMidPoint = Math.round((elementRect.bottom + elementRect.top) / 2);

        scrollElRect = scrollEl.getBoundingClientRect();
        scrollTopPos = (scrollElRect && scrollElRect.top) || 0;

        return elementMidPoint > window.innerHeight || elementMidPoint < scrollTopPos;
    }

    /**
     * Check if rich text editor is enabled.
     *
     * @return Promise resolved with boolean: true if enabled, false otherwise.
     */
    isRichTextEditorEnabled(): Promise<boolean> {
        if (this.isRichTextEditorSupported()) {
            return this.configProvider.get(CoreConstants.SETTINGS_RICH_TEXT_EDITOR, true).then((enabled) => {
                return !!enabled;
            });
        }

        return Promise.resolve(false);
    }

    /**
     * Check if rich text editor is supported in the platform.
     *
     * @return Whether it's supported.
     */
    isRichTextEditorSupported(): boolean {
        return true;
    }

    /**
     * Move children from one HTMLElement to another.
     *
     * @param oldParent The old parent.
     * @param newParent The new parent.
     * @param prepend If true, adds the children to the beginning of the new parent.
     * @return List of moved children.
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
        if (element) {
            const selected = element.querySelector(selector);
            if (selected) {
                selected.remove();
            }
        }
    }

    /**
     * Search and remove a certain element from an HTML code.
     *
     * @param html HTML code to change.
     * @param selector Selector to search.
     * @param removeAll True if it should remove all matches found, false if it should only remove the first one.
     * @return HTML without the element.
     */
    removeElementFromHtml(html: string, selector: string, removeAll?: boolean): string {
        let selected;

        const element = this.convertToElement(html);

        if (removeAll) {
            selected = element.querySelectorAll(selector);
            for (let i = 0; i < selected.length; i++) {
                selected[i].remove();
            }
        } else {
            selected = element.querySelector(selector);
            if (selected) {
                selected.remove();
            }
        }

        return element.innerHTML;
    }

    /**
     * Remove a component/directive instance using the DOM Element.
     *
     * @param element The root element of the component/directive.
     */
    removeInstanceByElement(element: Element): void {
        const id = element.getAttribute(this.INSTANCE_ID_ATTR_NAME);
        delete this.instances[id];
    }

    /**
     * Remove a component/directive instance using the ID.
     *
     * @param id The ID to remove.
     */
    removeInstanceById(id: string): void {
        delete this.instances[id];
    }

    /**
     * Search for certain classes in an element contents and replace them with the specified new values.
     *
     * @param element DOM element.
     * @param map Mapping of the classes to replace. Keys must be the value to replace, values must be
     *            the new class name. Example: {'correct': 'core-question-answer-correct'}.
     */
    replaceClassesInElement(element: HTMLElement, map: any): void {
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
     * @return Treated HTML code.
     */
    restoreSourcesInHtml(html: string, paths: object, anchorFn?: Function): string {
        let media,
            anchors;

        const element = this.convertToElement(html);

        // Treat elements with src (img, audio, video, ...).
        media = Array.from(element.querySelectorAll('img, video, audio, source, track'));
        media.forEach((media: HTMLElement) => {
            let newSrc = paths[this.textUtils.decodeURIComponent(media.getAttribute('src'))];

            if (typeof newSrc != 'undefined') {
                media.setAttribute('src', newSrc);
            }

            // Treat video posters.
            if (media.tagName == 'VIDEO' && media.getAttribute('poster')) {
                newSrc = paths[this.textUtils.decodeURIComponent(media.getAttribute('poster'))];
                if (typeof newSrc !== 'undefined') {
                    media.setAttribute('poster', newSrc);
                }
            }
        });

        // Now treat links.
        anchors = Array.from(element.querySelectorAll('a'));
        anchors.forEach((anchor: HTMLElement) => {
            const href = this.textUtils.decodeURIComponent(anchor.getAttribute('href')),
                newUrl = paths[href];

            if (typeof newUrl != 'undefined') {
                anchor.setAttribute('href', newUrl);

                if (typeof anchorFn == 'function') {
                    anchorFn(anchor, href);
                }
            }
        });

        return element.innerHTML;
    }

    /**
     * Scroll to somehere in the content.
     * Checks hidden property _scroll to avoid errors if view is not active.
     *
     * @param content Content where to execute the function.
     * @param x The x-value to scroll to.
     * @param y The y-value to scroll to.
     * @param duration Duration of the scroll animation in milliseconds. Defaults to `300`.
     * @return Returns a promise which is resolved when the scroll has completed.
     */
    scrollTo(content: Content, x: number, y: number, duration?: number, done?: Function): Promise<any> {
        return content && content._scroll && content.scrollTo(x, y, duration, done);
    }

    /**
     * Scroll to Bottom of the content.
     * Checks hidden property _scroll to avoid errors if view is not active.
     *
     * @param content Content where to execute the function.
     * @param duration Duration of the scroll animation in milliseconds. Defaults to `300`.
     * @return Returns a promise which is resolved when the scroll has completed.
     */
    scrollToBottom(content: Content, duration?: number): Promise<any> {
        return content && content._scroll && content.scrollToBottom(duration);
    }

    /**
     * Scroll to Top of the content.
     * Checks hidden property _scroll to avoid errors if view is not active.
     *
     * @param content Content where to execute the function.
     * @param duration Duration of the scroll animation in milliseconds. Defaults to `300`.
     * @return Returns a promise which is resolved when the scroll has completed.
     */
    scrollToTop(content: Content, duration?: number): Promise<any> {
        return content && content._scroll && content.scrollToTop(duration);
    }

    /**
     * Returns contentHeight of the content.
     * Checks hidden property _scroll to avoid errors if view is not active.
     *
     * @param content Content where to execute the function.
     * @return Content contentHeight or 0.
     */
    getContentHeight(content: Content): number {
        return (content && content._scroll && content.contentHeight) || 0;
    }

    /**
     * Returns scrollHeight of the content.
     * Checks hidden property _scroll to avoid errors if view is not active.
     *
     * @param content Content where to execute the function.
     * @return Content scrollHeight or 0.
     */
    getScrollHeight(content: Content): number {
        return (content && content._scroll && content.scrollHeight) || 0;
    }

    /**
     * Returns scrollTop of the content.
     * Checks hidden property _scroll to avoid errors if view is not active.
     *
     * @param content Content where to execute the function.
     * @return Content scrollTop or 0.
     */
    getScrollTop(content: Content): number {
        return (content && content._scroll && content.scrollTop) || 0;
    }

    /**
     * Scroll to a certain element.
     *
     * @param content The content that must be scrolled.
     * @param element The element to scroll to.
     * @param scrollParentClass Parent class where to stop calculating the position. Default scroll-content.
     * @return True if the element is found, false otherwise.
     */
    scrollToElement(content: Content, element: HTMLElement, scrollParentClass?: string): boolean {
        const position = this.getElementXY(element, undefined, scrollParentClass);
        if (!position) {
            return false;
        }

        this.scrollTo(content, position[0], position[1]);

        return true;
    }

    /**
     * Scroll to a certain element using a selector to find it.
     *
     * @param content The content that must be scrolled.
     * @param selector Selector to find the element to scroll to.
     * @param scrollParentClass Parent class where to stop calculating the position. Default scroll-content.
     * @return True if the element is found, false otherwise.
     */
    scrollToElementBySelector(content: Content, selector: string, scrollParentClass?: string): boolean {
        const position = this.getElementXY(content.getScrollElement(), selector, scrollParentClass);
        if (!position) {
            return false;
        }

        this.scrollTo(content, position[0], position[1]);

        return true;
    }

    /**
     * Search for an input with error (core-input-error directive) and scrolls to it if found.
     *
     * @param content The content that must be scrolled.
     * @param [scrollParentClass] Parent class where to stop calculating the position. Default scroll-content.
     * @return True if the element is found, false otherwise.
     */
    scrollToInputError(content: Content, scrollParentClass?: string): boolean {
        if (!content) {
            return false;
        }

        return this.scrollToElementBySelector(content, '.core-input-error', scrollParentClass);
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
     * @param title Title to show.
     * @param message Message to show.
     * @param buttonText Text of the button.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return Promise resolved with the alert modal.
     */
    showAlert(title: string, message: string, buttonText?: string, autocloseTime?: number): Promise<CoreAlert> {
        const hasHTMLTags = this.textUtils.hasHTMLTags(message);
        let promise;

        if (hasHTMLTags) {
            // Format the text.
            promise = this.textUtils.formatText(message);
        } else {
            promise = Promise.resolve(message);
        }

        return promise.then((message) => {
            const alertId = <string> Md5.hashAsciiStr((title || '') + '#' + (message || ''));

            if (this.displayedAlerts[alertId]) {
                // There's already an alert with the same message and title. Return it.
                return this.displayedAlerts[alertId];
            }

            const alert: CoreAlert = <any> this.alertCtrl.create({
                title: title,
                message: message,
                buttons: [buttonText || this.translate.instant('core.ok')]
            });

            alert.present().then(() => {
                if (hasHTMLTags) {
                    // Treat all anchors so they don't override the app.
                    const alertMessageEl: HTMLElement = alert.pageRef().nativeElement.querySelector('.alert-message');
                    this.treatAnchors(alertMessageEl);
                }
            });

            // Store the alert and remove it when dismissed.
            this.displayedAlerts[alertId] = alert;

            // Define the observables to extend the Alert class. This will allow several callbacks instead of just one.
            alert.didDismiss = new Subject();
            alert.willDismiss = new Subject();

            // Set the callbacks to trigger an observable event.
            alert.onDidDismiss((data: any, role: string) => {
                delete this.displayedAlerts[alertId];

                alert.didDismiss.next({data: data, role: role});
            });

            alert.onWillDismiss((data: any, role: string) => {
                alert.willDismiss.next({data: data, role: role});
            });

            if (autocloseTime > 0) {
                setTimeout(() => {
                    alert.dismiss();
                }, autocloseTime);
            }

            return alert;
        });
    }

    /**
     * Show an alert modal with a button to close it, translating the values supplied.
     *
     * @param title Title to show.
     * @param message Message to show.
     * @param buttonText Text of the button.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return Promise resolved with the alert modal.
     */
    showAlertTranslated(title: string, message: string, buttonText?: string, autocloseTime?: number): Promise<Alert> {
        title = title ? this.translate.instant(title) : title;
        message = message ? this.translate.instant(message) : message;
        buttonText = buttonText ? this.translate.instant(buttonText) : buttonText;

        return this.showAlert(title, message, buttonText, autocloseTime);
    }

    /**
     * Shortcut for a delete confirmation modal.
     *
     * @param translateMessage String key to show in the modal body translated. Default: 'core.areyousure'.
     * @param translateArgs Arguments to pass to translate if necessary.
     * @param options More options. See https://ionicframework.com/docs/v3/api/components/alert/AlertController/
     * @return Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    showDeleteConfirm(translateMessage: string = 'core.areyousure', translateArgs: any = {}, options?: any): Promise<any> {
        return this.showConfirm(this.translate.instant(translateMessage, translateArgs), undefined,
            this.translate.instant('core.delete'), undefined, options);
    }

    /**
     * Show a confirm modal.
     *
     * @param message Message to show in the modal body.
     * @param title Title of the modal.
     * @param okText Text of the OK button.
     * @param cancelText Text of the Cancel button.
     * @param options More options. See https://ionicframework.com/docs/v3/api/components/alert/AlertController/
     * @return Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    showConfirm(message: string, title?: string, okText?: string, cancelText?: string, options?: any): Promise<any> {
        return new Promise<void>((resolve, reject): void => {
            const hasHTMLTags = this.textUtils.hasHTMLTags(message);
            let promise;

            if (hasHTMLTags) {
                // Format the text.
                promise = this.textUtils.formatText(message);
            } else {
                promise = Promise.resolve(message);
            }

            promise.then((message) => {
                options = options || {};

                options.message = message;
                options.title = title;
                if (!title) {
                    options.cssClass = 'core-nohead';
                }
                options.buttons = [
                    {
                        text: cancelText || this.translate.instant('core.cancel'),
                        role: 'cancel',
                        handler: (): void => {
                            reject(this.createCanceledError());
                        }
                    },
                    {
                        text: okText || this.translate.instant('core.ok'),
                        handler: (data: any): void => {
                            resolve(data);
                        }
                    }
                ];

                const alert = this.alertCtrl.create(options);

                alert.present().then(() => {
                    if (hasHTMLTags) {
                        // Treat all anchors so they don't override the app.
                        const alertMessageEl: HTMLElement = alert.pageRef().nativeElement.querySelector('.alert-message');
                        this.treatAnchors(alertMessageEl);
                    }
                });
            });
        });
    }

    /**
     * Show an alert modal with an error message.
     *
     * @param error Message to show.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return Promise resolved with the alert modal.
     */
    showErrorModal(error: any, needsTranslate?: boolean, autocloseTime?: number): Promise<Alert> {
        const message = this.getErrorMessage(error, needsTranslate);

        if (message === null) {
            // Message doesn't need to be displayed, stop.
            return Promise.resolve(null);
        }

        return this.showAlert(this.getErrorTitle(message), message, undefined, autocloseTime);
    }

    /**
     * Show an alert modal with an error message. It uses a default message if error is not a string.
     *
     * @param error Message to show.
     * @param defaultError Message to show if the error is not a string.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return Promise resolved with the alert modal.
     */
    showErrorModalDefault(error: any, defaultError: any, needsTranslate?: boolean, autocloseTime?: number): Promise<Alert> {
        if (error && error.coreCanceled) {
            // It's a canceled error, don't display an error.
            return;
        }

        let errorMessage = error;

        if (error && typeof error != 'string') {
            errorMessage = this.textUtils.getErrorMessageFromError(error);
        }

        return this.showErrorModal(typeof errorMessage == 'string' ? error : defaultError, needsTranslate, autocloseTime);
    }

    /**
     * Show an alert modal with the first warning error message. It uses a default message if error is not a string.
     *
     * @param warnings Warnings returned.
     * @param defaultError Message to show if the error is not a string.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @return Promise resolved with the alert modal.
     */
    showErrorModalFirstWarning(warnings: any, defaultError: any, needsTranslate?: boolean, autocloseTime?: number): Promise<Alert> {
        const error = warnings && warnings.length && warnings[0].message;

        return this.showErrorModalDefault(error, defaultError, needsTranslate, autocloseTime);
    }

    /**
     * Displays a loading modal window.
     *
     * @param text The text of the modal window. Default: core.loading.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @return Loading modal instance.
     * @description
     * Usage:
     *     let modal = domUtils.showModalLoading(myText);
     *     ...
     *     modal.dismiss();
     */
    showModalLoading(text?: string, needsTranslate?: boolean): Loading {
        if (!text) {
            text = this.translate.instant('core.loading');
        } else if (needsTranslate) {
            text = this.translate.instant(text);
        }

        const loader = this.loadingCtrl.create({
                content: text
            }),
            dismiss = loader.dismiss.bind(loader);
        let isPresented = false,
            isDismissed = false;

        // Override dismiss to prevent dismissing a modal twice (it can throw an error and cause problems).
        loader.dismiss = (data, role, navOptions): Promise<any> => {
            if (!isPresented || isDismissed) {
                isDismissed = true;

                return Promise.resolve();
            }

            isDismissed = true;

            return dismiss(data, role, navOptions);
        };

        // Wait a bit before presenting the modal, to prevent it being displayed if dissmiss is called fast.
        setTimeout(() => {
            if (!isDismissed) {
                isPresented = true;
                loader.present();
            }
        }, 40);

        return loader;
    }

    /**
     * Show a prompt modal to input some data.
     *
     * @param message Modal message.
     * @param title Modal title.
     * @param placeholder Placeholder of the input element. By default, "Password".
     * @param type Type of the input element. By default, password.
     * @return Promise resolved with the input data if the user clicks OK, rejected if cancels.
     */
    showPrompt(message: string, title?: string, placeholder?: string, type: string = 'password'): Promise<any> {
        return new Promise((resolve, reject): void => {
            const hasHTMLTags = this.textUtils.hasHTMLTags(message);
            let promise;

            if (hasHTMLTags) {
                // Format the text.
                promise = this.textUtils.formatText(message);
            } else {
                promise = Promise.resolve(message);
            }

            promise.then((message) => {
                const alert = this.alertCtrl.create({
                    message: message,
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
                            handler: (): void => {
                                reject();
                            }
                        },
                        {
                            text: this.translate.instant('core.ok'),
                            handler: (data): void => {
                                resolve(data.promptinput);
                            }
                        }
                    ]
                });

                alert.present().then(() => {
                    if (hasHTMLTags) {
                        // Treat all anchors so they don't override the app.
                        const alertMessageEl: HTMLElement = alert.pageRef().nativeElement.querySelector('.alert-message');
                        this.treatAnchors(alertMessageEl);
                    }
                });
            });
        });
    }

    /**
     * Displays an autodimissable toast modal window.
     *
     * @param text The text of the toast.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @param duration Duration in ms of the dimissable toast.
     * @param cssClass Class to add to the toast.
     * @param dismissOnPageChange Dismiss the Toast on page change.
     * @return Toast instance.
     */
    showToast(text: string, needsTranslate?: boolean, duration: number = 2000, cssClass: string = '',
            dismissOnPageChange: boolean = true): Toast {

        if (needsTranslate) {
            text = this.translate.instant(text);
        }

        const loader = this.toastCtrl.create({
            message: text,
            duration: duration,
            position: 'bottom',
            cssClass: cssClass,
            dismissOnPageChange: dismissOnPageChange
        });

        loader.present();

        return loader;
    }

    /**
     * Stores a component/directive instance.
     *
     * @param element The root element of the component/directive.
     * @param instance The instance to store.
     * @return ID to identify the instance.
     */
    storeInstanceByElement(element: Element, instance: any): string {
        const id = String(this.lastInstanceId++);

        element.setAttribute(this.INSTANCE_ID_ATTR_NAME, id);
        this.instances[id] = instance;

        return id;
    }

    /**
     * Check if an element supports input via keyboard.
     *
     * @param el HTML element to check.
     * @return Whether it supports input using keyboard.
     */
    supportsInputKeyboard(el: any): boolean {
        return el && !el.disabled && (el.tagName.toLowerCase() == 'textarea' ||
            (el.tagName.toLowerCase() == 'input' && this.INPUT_SUPPORT_KEYBOARD.indexOf(el.type) != -1));
    }

    /**
     * Converts HTML formatted text to DOM element(s).
     *
     * @param text HTML text.
     * @return Same text converted to HTMLCollection.
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

                    // We cannot use CoreDomUtilsProvider.openInBrowser due to circular dependencies.
                    if (this.appProvider.isDesktop()) {
                        // It's a desktop app, use Electron shell library to open the browser.
                        const shell = require('electron').shell;
                        if (!shell.openExternal(href)) {
                            // Open browser failed, open a new window in the app.
                            window.open(href, '_system');
                        }
                    } else {
                        window.open(href, '_system');
                    }
                }
            });
        });
    }

    /**
     * View an image in a new page or modal.
     *
     * @param image URL of the image.
     * @param title Title of the page or modal.
     * @param component Component to link the image to if needed.
     * @param componentId An ID to use in conjunction with the component.
     */
    viewImage(image: string, title?: string, component?: string, componentId?: string | number): void {
        if (image) {
            const params: any = {
                    title: title,
                    image: image,
                    component: component,
                    componentId: componentId
                },
                modal = this.modalCtrl.create('CoreViewerImagePage', params);
            modal.present();
        }

    }

    /**
     * Wait for images to load.
     *
     * @param element The element to search in.
     * @return Promise resolved with a boolean: whether there was any image to load.
     */
    waitForImages(element: HTMLElement): Promise<boolean> {
        const imgs = Array.from(element.querySelectorAll('img')),
            promises = [];
        let hasImgToLoad = false;

        imgs.forEach((img) => {
            if (img && !img.complete) {
                hasImgToLoad = true;

                // Wait for image to load or fail.
                promises.push(new Promise((resolve, reject): void => {
                    const imgLoaded = (): void => {
                        resolve();
                        img.removeEventListener('load', imgLoaded);
                        img.removeEventListener('error', imgLoaded);
                    };

                    img.addEventListener('load', imgLoaded);
                    img.addEventListener('error', imgLoaded);
                }));
            }
        });

        return Promise.all(promises).then(() => {
            return hasImgToLoad;
        });
    }

    /**
     * Wrap an HTMLElement with another element.
     *
     * @param el The element to wrap.
     * @param wrapper Wrapper.
     */
    wrapElement(el: HTMLElement, wrapper: HTMLElement): void {
        // Insert the wrapper before the element.
        el.parentNode.insertBefore(wrapper, el);
        // Now move the element into the wrapper.
        wrapper.appendChild(el);
    }
}
