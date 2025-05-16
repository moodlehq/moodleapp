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

import { CoreWSExternalWarning } from '@services/ws';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreAnyError, CoreError } from '@classes/errors/error';
import { AlertController, makeSingleton, Translate } from '@singletons';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CorePasswordModalParams, CorePasswordModalResponse } from '@components/password-modal/password-modal';
import { CoreWait } from '@singletons/wait';
import { CoreToasts, ToastDuration, ShowToastOptions } from '../overlays/toasts';
import { CoreModals, OpenModalOptions } from '@services/overlays/modals';
import { CorePopovers, OpenPopoverOptions } from '@services/overlays/popovers';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreErrorHelper, CoreErrorObject } from '@services/error-helper';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CoreHTMLClasses } from '@singletons/html-classes';
import { CoreDom, VerticalPoint } from '@singletons/dom';
import { CoreAlerts } from '@services/overlays/alerts';
import { PromptButton } from '@services/overlays/prompts';
import { CoreBoostrap } from '@singletons/bootstrap';
import { CoreAngular } from '@singletons/angular';

/**
 * Utils service with helper functions for UI, DOM elements and HTML code.
 *
 * @deprecated since 5.0. Almost all functions have been moved to CoreDom, but check each function to see where it was moved.
 */
@Injectable({ providedIn: 'root' })
export class CoreDomUtilsProvider {

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
     * @deprecated since 5.0. Use CoreAlerts.confirmDownloadSize instead.
     */
    async confirmDownloadSize(
        size: CoreFileSizeSum,
        message?: string,
        unknownMessage?: string,
        wifiThreshold?: number,
        limitedThreshold?: number,
        alwaysConfirm?: boolean,
    ): Promise<void> {
        return CoreAlerts.confirmDownloadSize(size, { message, unknownMessage, wifiThreshold, limitedThreshold, alwaysConfirm });
    }

    /**
     * Convert some HTML as text into an HTMLElement. This HTML is put inside a div or a body.
     *
     * @param html Text to convert.
     * @returns Element.
     *
     * @deprecated since 4.5. Use convertTextToHTMLElement directly instead.
     */
    convertToElement(html: string): HTMLElement {
        return convertTextToHTMLElement(html);
    }

    /**
     * Given a list of changes for a component input detected by a KeyValueDiffers, create an object similar to the one
     * passed to the ngOnChanges functions.
     *
     * @param changes Changes detected by KeyValueDiffer.
     * @returns Changes in a format like ngOnChanges.
     * @deprecated since 5.0. Use CoreAngular.createChangesFromKeyValueDiff instead.
     */
    createChangesFromKeyValueDiff(changes: KeyValueChanges<string, unknown>): { [name: string]: SimpleChange } {
        return CoreAngular.createChangesFromKeyValueDiff(changes);
    }

    /**
     * Search all the URLs in a CSS file content.
     *
     * @param code CSS code.
     * @returns List of URLs.
     * @deprecated since 5.0. Use CoreDom.extractUrlsFromCSS instead.
     */
    extractUrlsFromCSS(code: string): string[] {
        return CoreDom.extractUrlsFromCSS(code);
    }

    /**
     * Fix syntax errors in HTML.
     *
     * @param html HTML text.
     * @returns Fixed HTML text.
     * @deprecated since 5.0. Use CoreDom.fixHtml instead.
     */
    fixHtml(html: string): string {
        return CoreDom.fixHtml(html);
    }

    /**
     * Focus an element and open keyboard.
     *
     * @param element HTML element to focus.
     * @deprecated since 5.0. Use CoreDom.focusElement instead.
     */
    async focusElement(
        element: HTMLIonInputElement | HTMLIonTextareaElement | HTMLIonSearchbarElement | HTMLIonButtonElement | HTMLElement,
    ): Promise<void> {
        await CoreDom.focusElement(element);
    }

    /**
     * Formats a size to be used as width/height of an element.
     * If the size is already valid (like '500px' or '50%') it won't be modified.
     * Returned size will have a format like '500px'.
     *
     * @param size Size to format.
     * @returns Formatted size. If size is not valid, returns an empty string.
     * @deprecated since 5.0. Use CoreDom.formatSizeUnits directly instead.
     */
    formatPixelsSize(size: string | number): string {
        return CoreDom.formatSizeUnits(size);
    }

    /**
     * Returns the contents of a certain selection in a DOM element.
     *
     * @param element DOM element to search in.
     * @param selector Selector to search.
     * @returns Selection contents. Undefined if not found.
     * @deprecated since 5.0. Use CoreDom.getContentsOfElement instead.
     */
    getContentsOfElement(element: HTMLElement, selector: string): string | undefined {
        return CoreDom.getContentsOfElement(element, selector);
    }

    /**
     * Returns the attribute value of a string element. Only the first element will be selected.
     *
     * @param html HTML element in string.
     * @param attribute Attribute to get.
     * @returns Attribute value.
     * @deprecated since 5.0. Use CoreDom.getHTMLElementAttribute instead.
     */
    getHTMLElementAttribute(html: string, attribute: string): string | null {
        return CoreDom.getHTMLElementAttribute(html, attribute);
    }

    /**
     * Returns the computed style measure or 0 if not found or NaN.
     *
     * @param style Style from getComputedStyle.
     * @param measure Measure to get.
     * @returns Result of the measure.
     * @deprecated since 5.0. Use CoreDom.getComputedStyleMeasure instead.
     */
    getComputedStyleMeasure(style: CSSStyleDeclaration, measure: keyof CSSStyleDeclaration): number {
        return CoreDom.getComputedStyleMeasure(style, measure);
    }

    /**
     * Get the error message from an error, including debug data if needed.
     *
     * @param error Message to show.
     * @param needsTranslate Whether the error needs to be translated.
     * @returns Error message, null if no error should be displayed.
     * @deprecated since 5.0. Use CoreAlerts.getErrorMessage instead.
     */
    getErrorMessage(error: CoreError | CoreErrorObject | string, needsTranslate?: boolean): string | null {
        const message = CoreAlerts.getErrorMessage(error);

        return needsTranslate && message ? Translate.instant(message) : message;
    }

    /**
     * Check whether an error is an error caused because the user canceled a showConfirm.
     *
     * @param error Error to check.
     * @returns Whether it's a canceled error.
     * @deprecated since 5.0. Use CoreErrorHelper.isCanceledError instead.
     */
    isCanceledError(error: CoreAnyError): boolean {
        return CoreErrorHelper.isCanceledError(error);
    }

    /**
     * Check whether an error is a silent error that shouldn't be displayed to the user.
     *
     * @param error Error to check.
     * @returns Whether it's a canceled error.
     * @deprecated since 5.0. Use CoreErrorHelper.isSilentError instead.
     */
    isSilentError(error: CoreAnyError): boolean {
        return CoreErrorHelper.isSilentError(error);
    }

    /**
     * Handle bootstrap tooltips in a certain element.
     *
     * @param element Element to check.
     * @deprecated since 5.0. Use CoreBoostrap.handleBootstrapTooltipsAndPopovers instead.
     */
    handleBootstrapTooltips(element: HTMLElement): void {
        CoreBoostrap.handleBootstrapTooltipsAndPopovers(element);
    }

    /**
     * Check if an element is outside of screen (viewport).
     *
     * @param scrollEl The element that must be scrolled.
     * @param element DOM element to check.
     * @param point The point of the element to check.
     * @returns Whether the element is outside of the viewport.
     * @deprecated since 5.0. Use CoreDom.isElementOutsideOfScreen instead.
     */
    isElementOutsideOfScreen(
        scrollEl: HTMLElement,
        element: HTMLElement,
        point: VerticalPoint = VerticalPoint.MID,
    ): boolean {
        return CoreDom.isElementOutsideOfScreen(scrollEl, element, point);
    }

    /**
     * Check if rich text editor is enabled.
     *
     * @returns Promise resolved with boolean: true if enabled, false otherwise.
     * @deprecated since 5.0. Plain text area editor has been removed.
     */
    async isRichTextEditorEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Move children from one HTMLElement to another.
     *
     * @param oldParent The old parent.
     * @param newParent The new parent.
     * @param prepend If true, adds the children to the beginning of the new parent.
     * @returns List of moved children.
     * @deprecated since 5.0. Use CoreDom.moveChildren instead.
     */
    moveChildren(oldParent: HTMLElement, newParent: HTMLElement, prepend?: boolean): Node[] {
        return CoreDom.moveChildren(oldParent, newParent, prepend);
    }

    /**
     * Search and remove a certain element from inside another element.
     *
     * @param element DOM element to search in.
     * @param selector Selector to search.
     * @deprecated since 5.0. Use CoreDom.removeElementFromElement instead.
     */
    removeElement(element: HTMLElement, selector: string): void {
        CoreDom.removeElement(element, selector);
    }

    /**
     * Search and remove a certain element from an HTML code.
     *
     * @param html HTML code to change.
     * @param selector Selector to search.
     * @param removeAll True if it should remove all matches found, false if it should only remove the first one.
     * @returns HTML without the element.
     * @deprecated since 5.0. Use CoreDom.removeElementFromHtml instead.
     */
    removeElementFromHtml(html: string, selector: string, removeAll?: boolean): string {
        return CoreDom.removeElementFromHtml(html, selector, removeAll);
    }

    /**
     * Search for certain classes in an element contents and replace them with the specified new values.
     *
     * @param element DOM element.
     * @param map Mapping of the classes to replace. Keys must be the value to replace, values must be
     *            the new class name. Example: {'correct': 'core-question-answer-correct'}.
     * @deprecated since 5.0. Use CoreDom.replaceClassesInElement instead.
     */
    replaceClassesInElement(element: HTMLElement, map: {[currentValue: string]: string}): void {
        CoreDom.replaceClassesInElement(element, map);
    }

    /**
     * Given an HTML, search all links and media and tries to restore original sources using the paths object.
     *
     * @param html HTML code.
     * @param paths Object linking URLs in the html code with the real URLs to use.
     * @param anchorFn Function to call with each anchor. Optional.
     * @returns Treated HTML code.
     * @deprecated since 5.0. Use CoreDom.restoreSourcesInHtml instead.
     */
    restoreSourcesInHtml(
        html: string,
        paths: {[url: string]: string},
        anchorFn?: (anchor: HTMLElement, href: string) => void,
    ): string {
        return CoreDom.restoreSourcesInHtml(html, paths, anchorFn);
    }

    /**
     * Returns height of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with content height.
     * @deprecated since 5.0. Use CoreDom.getContentHeight instead.
     */
    async getContentHeight(content: IonContent): Promise<number> {
        return CoreDom.getContentHeight(content);
    }

    /**
     * Returns scroll height of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with scroll height.
     * @deprecated since 5.0. Use CoreDom.getScrollHeight instead.
     */
    async getScrollHeight(content: IonContent): Promise<number> {
        return CoreDom.getScrollHeight(content);
    }

    /**
     * Returns scrollTop of the content.
     *
     * @param content Content where to execute the function.
     * @returns Promise resolved with scroll top.
     * @deprecated since 5.0. Use CoreDom.getScrollTop instead.
     */
    async getScrollTop(content: IonContent): Promise<number> {
        return CoreDom.getScrollTop(content);
    }

    /**
     * Show an alert modal with a button to close it.
     *
     * @param header Title to show.
     * @param message Message to show.
     * @param buttonText Text of the button.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     * @deprecated since 5.0. Use CoreAlerts.show instead.
     */
    async showAlert(
        header: string | undefined,
        message: string,
        buttonText?: string,
        autocloseTime?: number,
    ): Promise<HTMLIonAlertElement> {
        return CoreAlerts.show({
            header,
            message,
            buttons: [buttonText || Translate.instant('core.ok')],
            autoCloseTime: autocloseTime,
        });
    }

    /**
     * General show an alert modal.
     *
     * @param options Alert options to pass to the alert.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     * @deprecated since 5.0. Use CoreAlerts.show instead.
     */
    async showAlertWithOptions(options: AlertOptions = {}, autocloseTime?: number): Promise<HTMLIonAlertElement> {
        return CoreAlerts.show({
            ...options,
            autoCloseTime: autocloseTime,
        });
    }

    /**
     * Show an alert modal with a button to close it, translating the values supplied.
     *
     * @param header Title to show.
     * @param message Message to show.
     * @param buttonText Text of the button.
     * @param autocloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     * @deprecated since 5.0. Use CoreAlerts.show instead, and pass the strings already translated.
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

        return CoreAlerts.show({
            header,
            message,
            buttons: [buttonText || Translate.instant('core.ok')],
            autoCloseTime: autocloseTime,
        });
    }

    /**
     * Shortcut for a delete confirmation modal.
     *
     * @param translateMessage String key to show in the modal body translated. Default: 'core.areyousure'.
     * @param translateArgs Arguments to pass to translate if necessary.
     * @param options More options. See https://ionicframework.com/docs/v3/api/components/alert/AlertController/
     * @returns Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     * @deprecated since 5.0. Use CoreAlerts.confirmDelete instead.
     */
    async showDeleteConfirm(
        translateMessage: string = 'core.areyousure',
        translateArgs: Record<string, unknown> = {},
        options: AlertOptions = {},
    ): Promise<void> {
        return CoreAlerts.confirmDelete(Translate.instant(translateMessage, translateArgs), { ...options });
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
     * @deprecated since 5.0. Use CoreAlerts.confirm instead.
     */
    showConfirm<T>(
        message: string,
        header?: string,
        okText?: string,
        cancelText?: string,
        options: AlertOptions = {},
    ): Promise<T> {
        return CoreAlerts.confirm(message, { header, okText, cancelText, ...options });
    }

    /**
     * Show an alert modal with an error message.
     *
     * @param error Message to show.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autoCloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     * @deprecated since 5.0. Use CoreAlerts.showError instead.
     */
    async showErrorModal(
        error: CoreError | CoreErrorObject | string,
        needsTranslate?: boolean,
        autoCloseTime?: number,
    ): Promise<HTMLIonAlertElement | null> {
        if (needsTranslate && typeof error === 'string') {
            error = Translate.instant(error);
        }

        return CoreAlerts.showError(error, { autoCloseTime });
    }

    /**
     * Show an alert modal with an error message. It uses a default message if error is not a string.
     *
     * @param error Message to show.
     * @param defaultError Message to show if the error is not a string.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autoCloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     * @deprecated since 5.0. Use CoreAlerts.showError instead.
     */
    async showErrorModalDefault(
        error: CoreAnyError,
        defaultError: string,
        needsTranslate = false,
        autoCloseTime?: number,
    ): Promise<HTMLIonAlertElement | null> {
        if (needsTranslate && typeof error === 'string') {
            error = Translate.instant(error);
        }

        return CoreAlerts.showError(error, {
            autoCloseTime,
            default: needsTranslate ? Translate.instant(defaultError) : defaultError,
        });
    }

    /**
     * Show an alert modal with the first warning error message. It uses a default message if error is not a string.
     *
     * @param warnings Warnings returned.
     * @param defaultError Message to show if the error is not a string.
     * @param needsTranslate Whether the error needs to be translated.
     * @param autoCloseTime Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
     * @returns Promise resolved with the alert modal.
     * @deprecated since 5.0. Use CoreAlerts.showError instead.
     */
    showErrorModalFirstWarning(
        warnings: CoreWSExternalWarning[],
        defaultError: string,
        needsTranslate?: boolean,
        autoCloseTime?: number,
    ): Promise<HTMLIonAlertElement | null> {
        // eslint-disable-next-line deprecation/deprecation
        return this.showErrorModalDefault(warnings?.[0], defaultError, needsTranslate, autoCloseTime);
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
     * @deprecated since 5.0. Use CoreLoadings.showOperationModals instead.
     */
    async showOperationModals<T>(text: string, needsTranslate: boolean, operation: () => Promise<T>): Promise<T | null> {
        return CoreLoadings.showOperationModals(text, needsTranslate, operation);
    }

    /**
     * Show a modal warning the user that he should use a different app.
     *
     * @param message The warning message.
     * @param link Link to the app to download if any.
     * @returns Promise resolved when done.
     * @deprecated since 5.0. Use CoreAlerts.showDownloadAppNotice instead.
     */
    async showDownloadAppNoticeModal(message: string, link?: string): Promise<void> {
        await CoreAlerts.showDownloadAppNotice(message, link);
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
    async showPrompt(
        message: string,
        header?: string,
        placeholderOrLabel?: string,
        type: TextFieldTypes | 'checkbox' | 'radio' | 'textarea' = 'password',
        buttons?: PromptButton[] | { okText?: string; cancelText?: string },
        options: AlertOptions = {},
    ): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
        const { CorePrompts } = await import('../overlays/prompts');

        return CorePrompts.show(message, type, { ...options, header, placeholderOrLabel, buttons });
    }

    /**
     * Show a prompt modal to input a textarea.
     *
     * @param title Modal title.
     * @param message Modal message.
     * @param buttons Buttons to pass to the modal.
     * @param placeholder Placeholder of the input element if any.
     * @returns Promise resolved with the entered text if any.
     * @deprecated since 5.0. Use CorePrompts.show instead.
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
     * @deprecated since 5.0. Use CoreDom.supportsInputKeyboard instead.
     */
    supportsInputKeyboard(el: HTMLElement): boolean {
        return CoreDom.supportsInputKeyboard(el);
    }

    /**
     * Converts HTML formatted text to DOM element(s).
     *
     * @param text HTML text.
     * @returns Same text converted to HTMLCollection.
     * @deprecated since 5.0. Use CoreDom.toDom instead.
     */
    toDom(text: string): HTMLCollection {
        return CoreDom.toDom(text);
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
     * @deprecated since 4.5. Use CorePrompts.promptPassword instead.
     */
    async promptPassword<T extends CorePasswordModalResponse>(passwordParams?: CorePasswordModalParams): Promise<T> {
        const { CorePrompts } = await import('../overlays/prompts');

        return CorePrompts.promptPassword(passwordParams);
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
     * @deprecated since 5.0. Use CoreWait.waitForImages instead.
     */
    waitForImages(element: HTMLElement): CoreCancellablePromise<boolean> {
        return CoreWait.waitForImages(element);
    }

    /**
     * Wrap an HTMLElement with another element.
     *
     * @param el The element to wrap.
     * @param wrapper Wrapper.
     * @deprecated since 5.0. Use CoreDom.wrapElement instead.
     */
    wrapElement(el: HTMLElement, wrapper: HTMLElement): void {
        CoreDom.wrapElement(el, wrapper);
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
     *
     * @deprecated since 4.5. Use CoreHTMLClasses.hasModeClass instead.
     */
    hasModeClass(className: string): boolean {
        return CoreHTMLClasses.hasModeClass(className);
    }

    /**
     * Get active mode CSS classes.
     *
     * @returns Mode classes.
     *
     * @deprecated since 4.5. Use CoreHTMLClasses.getModeClasses instead.
     */
    getModeClasses(): string[] {
        return CoreHTMLClasses.getModeClasses();
    }

    /**
     * Toggle a CSS class in the root element used to indicate app modes.
     *
     * @param className Class name.
     * @param enable Whether to add or remove the class.
     *
     * @deprecated since 4.5. Use CoreHTMLClasses.toggleModeClass instead.
     */
    toggleModeClass(
        className: string,
        enable = false,
    ): void {
        CoreHTMLClasses.toggleModeClass(className, enable);
    }

}
/**
 * @deprecated since 4.5. Use CoreDom instead.
 */
// eslint-disable-next-line deprecation/deprecation
export const CoreDomUtils = makeSingleton(CoreDomUtilsProvider);
