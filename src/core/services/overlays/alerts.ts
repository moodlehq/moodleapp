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
import { AlertButton, AlertOptions } from '@ionic/angular';
import { CoreLang } from '@services/lang';
import { CoreSites } from '@services/sites';
import { AlertController, makeSingleton, Translate } from '@singletons';
import { CoreText } from '@singletons/text';
import { Md5 } from 'ts-md5';
import { CoreLoadings } from './loadings';
import { fixOverlayAriaHidden } from '@/core/utils/fix-aria-hidden';
import { CoreOpener } from '@singletons/opener';
import { CoreAnyError, CoreError } from '@classes/errors/error';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreLogger } from '@singletons/logger';
import { CoreConfig } from '@services/config';
import { CoreConstants } from '@/core/constants';
import { CoreErrorLogs } from '@singletons/error-logs';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreErrorAccordion } from '@services/error-accordion';
import { CorePlatform } from '@services/platform';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreFile } from '@services/file';
import { CoreNetwork } from '@services/network';

/**
 * Helper service to display alerts.
 */
@Injectable({ providedIn: 'root' })
export class CoreAlertsService {

    protected displayedAlerts: Record<string, HTMLIonAlertElement> = {}; // To prevent duplicated alerts.
    protected debugDisplay = false; // Whether to display debug messages. Store it in a variable to make it synchronous.
    protected logger = CoreLogger.getInstance('CoreAlerts');

    constructor() {
        this.init();
    }

    /**
     * Init some properties.
     */
    protected async init(): Promise<void> {
        // Check if debug messages should be displayed.
        const debugDisplay = await CoreConfig.get<number>(CoreConstants.SETTINGS_DEBUG_DISPLAY, 0);

        this.debugDisplay = debugDisplay !== 0;
    }

    /**
     * Show a confirm alert.
     *
     * @param message Message to display.
     * @param options Options of the confirm alert.
     * @returns Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    confirm<T>(message: string, options: CoreAlertsConfirmOptions = {}): Promise<T> {
        return new Promise<T>((resolve, reject): void => {
            const { okText, cancelText, isDestructive, ...alertOptions } = options;
            const buttons = [
                {
                    text: cancelText || Translate.instant('core.cancel'),
                    role: 'cancel',
                    handler: () => {
                        reject(new CoreCanceledError());
                    },
                },
                {
                    text: okText || Translate.instant('core.ok'),
                    role: isDestructive ? 'destructive' : undefined,
                    handler: (data: T) => {
                        resolve(data);
                    },
                },
            ];

            let cssClass = alertOptions.cssClass || '';
            if (!alertOptions.header) {
                cssClass = `${cssClass} core-nohead`;
            }

            this.show({
                ...alertOptions,
                message,
                buttons,
                cssClass,
            });
        });
    }

    /**
     * Show a delete confirmation modal.
     *
     * @param message Message to show.
     * @param options Alert options.
     * @returns Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    async confirmDelete(message: string, options: Omit<AlertOptions, 'message'|'buttons'> = {}): Promise<void> {
        message = await CoreLang.filterMultilang(message);

        await this.confirm(message, {
            ...options,
            okText: Translate.instant('core.delete'),
            isDestructive: true,
        });
    }

    /**
     * Show a confirmation modal to confirm leaving a page with unsaves changes.
     *
     * @returns Promise resolved if the user confirms and rejected with a canceled error if he cancels.
     */
    async confirmLeaveWithChanges(): Promise<void> {
        await this.confirm(Translate.instant('core.confirmleavepagedescription'), {
            header: Translate.instant('core.confirmleavepagetitle'),
            okText: Translate.instant('core.leave'),
        });
    }

    /**
     * If the download size is higher than a certain threshold shows a confirm dialog.
     *
     * @param size Object containing size to download and a boolean to indicate if its totally or partialy calculated.
     * @param options Other options.
     * @returns Promise resolved when the user confirms or if no confirm needed.
     */
    async confirmDownloadSize(
        size: CoreFileSizeSum,
        options: CoreAlertsConfirmDownloadSizeOptions = {},
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
        const wifiThreshold = options.wifiThreshold ?? CoreConstants.WIFI_DOWNLOAD_THRESHOLD;
        const limitedThreshold = options.limitedThreshold ?? CoreConstants.DOWNLOAD_THRESHOLD;

        let wifiPrefix = '';
        if (CoreNetwork.isCellular()) {
            wifiPrefix = Translate.instant('core.course.confirmlimiteddownload');
        }

        if (size.size < 0 || (size.size == 0 && !size.total)) {
            // Seems size was unable to be calculated. Show a warning.
            return this.confirm(wifiPrefix + Translate.instant(
                options.unknownMessage ?? 'core.course.confirmdownloadunknownsize',
                { availableSpace: availableSpace },
            ));
        } else if (!size.total) {
            // Filesize is only partial.
            return this.confirm(wifiPrefix + Translate.instant(
                'core.course.confirmpartialdownloadsize',
                { size: readableSize, availableSpace: availableSpace },
            ));
        } else if (options.alwaysConfirm || size.size >= wifiThreshold ||
                (CoreNetwork.isCellular() && size.size >= limitedThreshold)) {

            return this.confirm(wifiPrefix + Translate.instant(
                options.message ?? (size.size === 0 ? 'core.course.confirmdownloadzerosize' : 'core.course.confirmdownload'),
                { size: readableSize, availableSpace: availableSpace },
            ));
        }
    }

    /**
     * Get the error message from an error to be displayed in an alert, including debug data if needed.
     *
     * @param error Message to show.
     * @param options Other options.
     * @returns Error message, null if no error should be displayed.
     */
    getErrorMessage(error: CoreAnyError, options: CoreAlertsGetErrorMessageOptions = {}): string | null {
        let errorMessage: string | undefined;

        if (typeof error !== 'string' && !error) {
            errorMessage = options.default;
        } else if (typeof error === 'object') {
            if (this.debugDisplay) {
                // eslint-disable-next-line no-console
                console.error(error);
            }

            // We received an object instead of a string. Search for common properties.
            errorMessage = CoreErrorHelper.getErrorMessageFromError(error) || options.default;
            CoreErrorLogs.addErrorLog({ message: JSON.stringify(error), type: errorMessage || '', time: new Date().getTime() });
            if (!errorMessage) {
                // No common properties found, just stringify it.
                errorMessage = JSON.stringify(error);
            }

            // Try to remove tokens from the contents.
            const matches = errorMessage.match(/token"?[=|:]"?(\w*)/);
            if (matches?.[1]) {
                errorMessage = errorMessage.replace(new RegExp(matches[1], 'g'), 'secret');
            }
        } else {
            errorMessage = error || options.default || '';
        }

        if (!errorMessage) {
            return null;
        }

        return CoreText.decodeHTML(errorMessage);
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
     * Show an alert modal.
     *
     * @param options Alert options.
     * @returns Alert modal.
     */
    async show(options: CoreAlertsShowOptions = {}): Promise<HTMLIonAlertElement> {
        let message = typeof options.message == 'string'
            ? options.message
            : options.message?.value || '';
        const buttons = options.buttons || [Translate.instant('core.ok')];

        const hasHTMLTags = CoreText.hasHTMLTags(message);

        if (hasHTMLTags && !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.7')) {
            // Treat multilang.
            message = await CoreLang.filterMultilang(message);
        }

        const alertId = Md5.hashAsciiStr(`${options.header || ''}#${message|| ''}`);

        if (this.displayedAlerts[alertId]) {
            // There's already an alert with the same message and title. Return it.
            return this.displayedAlerts[alertId];
        }

        const { autoCloseTime, ...alertOptions } = options;
        const alert = await AlertController.create({
            ...alertOptions,
            message,
            buttons,
        });

        if (Object.keys(this.displayedAlerts).length === 0) {
            await CoreLoadings.pauseActiveModals();
        }

        // eslint-disable-next-line promise/catch-or-return
        alert.present().then(() => {
            if (hasHTMLTags) {
                // Treat all anchors so they don't override the app.
                const alertMessageEl: HTMLElement | null = alert.querySelector('.alert-message');
                alertMessageEl && this.treatAnchors(alertMessageEl, options.showBrowserWarningInLinks);
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

        if (autoCloseTime && autoCloseTime > 0) {
            setTimeout(async () => {
                await alert.dismiss();

                if (buttons) {
                    // Execute dismiss function if any.
                    const cancelButton = <AlertButton | undefined> buttons.find(
                        (button) => typeof button != 'string' && button.handler !== undefined && button.role == 'cancel',
                    );
                    cancelButton?.handler?.(null);
                }
            }, autoCloseTime);
        }

        return alert;
    }

    /**
     * Show a modal warning the user that he should use a different app.
     *
     * @param message The warning message.
     * @param link Link to the app to download if any.
     * @returns Promise resolved when done.
     */
    async showDownloadAppNotice(message: string, link?: string): Promise<void> {
        const buttons: AlertButton[] = [{
            text: Translate.instant('core.ok'),
            role: 'cancel',
        }];

        if (link) {
            buttons.push({
                text: Translate.instant('core.download'),
                handler: (): void => {
                    CoreOpener.openInBrowser(link, { showBrowserWarning: false });
                },
            });
        }

        const alert = await this.show({
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
     * Show an alert modal with an error message.
     *
     * @param error Error to show.
     * @param options Other options.
     * @returns Alert modal.
     */
    async showError(
        error: CoreAnyError,
        options: CoreAlertsShowErrorOptions = {},
    ): Promise<HTMLIonAlertElement | null> {
        if (CoreErrorHelper.isCanceledError(error) || CoreErrorHelper.isSilentError(error)) {
            // It's a canceled or a silent error, don't display an error.
            return null;
        }

        const message = this.getErrorMessage(error, { default: options.default });
        if (message === null) {
            return null;
        }

        const alertOptions: CoreAlertsShowOptions = {
            message,
            autoCloseTime: options.autoCloseTime,
            showBrowserWarningInLinks: options.showBrowserWarningInLinks,
        };

        if (CoreErrorHelper.isNetworkError(error)) {
            alertOptions.cssClass = 'core-alert-network-error';
        }

        if (typeof error !== 'string' && error && 'title' in error && error.title) {
            alertOptions.header = error.title || undefined;
        } else if (message === Translate.instant('core.sitenotfoundhelp')) {
            alertOptions.header = Translate.instant('core.cannotconnect');
        } else if (CoreErrorHelper.isSiteUnavailableErrorMessage(message)) {
            alertOptions.header = CoreSites.isLoggedIn()
                ? Translate.instant('core.connectionlost')
                : Translate.instant('core.cannotconnect');
        } else {
            alertOptions.header = Translate.instant('core.error');
        }

        if (typeof error !== 'string' && error && 'buttons' in error && typeof error.buttons !== 'undefined') {
            alertOptions.buttons = error.buttons;
        } else {
            alertOptions.buttons = [Translate.instant('core.ok')];
        }

        // For site errors, always show debug info.
        const showDebugInfo = this.debugDisplay || error instanceof CoreSiteError;
        const debugInfo = showDebugInfo && CoreErrorHelper.getDebugInfoFromError(error);
        if (debugInfo) {
            alertOptions.message = `<p>${message}</p><div class="core-error-accordion-container"></div>`;
        }

        if (error instanceof CoreSiteError && error.supportConfig?.canContactSupport()) {
            alertOptions.buttons.push({
                text: Translate.instant('core.contactsupport'),
                handler: () => CoreUserSupport.contact({
                    supportConfig: error.supportConfig,
                    subject: alertOptions.header,
                    message: `${error.debug?.code}\n\n${error.debug?.details}`,
                }),
            });
        }

        const alertElement = await this.show(alertOptions);

        if (debugInfo) {
            const containerElement = alertElement.querySelector('.core-error-accordion-container');

            if (containerElement) {
                await CoreErrorAccordion.render(containerElement, debugInfo.details, debugInfo.code);
            }
        }

        return alertElement;
    }

    /**
     * Treat anchors inside an alert.
     *
     * @param container The HTMLElement that can contain anchors.
     * @param showBrowserWarning Whether to show the browser warning when opening links.
     */
    protected treatAnchors(container: HTMLElement, showBrowserWarning = true): void {
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

                    CoreOpener.openInBrowser(href, { showBrowserWarning });
                }
            });
        });
    }

}

export const CoreAlerts = makeSingleton(CoreAlertsService);

/**
 * Options to pass to CoreAlerts.confirm.
 */
export type CoreAlertsConfirmOptions = Omit<AlertOptions, 'message'|'buttons'> & {
    okText?: string; // Text of the OK button. By default, 'OK'.
    cancelText?: string; // Text of the Cancel button. By default, 'Cancel'.
    isDestructive?: boolean; // Whether confirming is destructive (will remove data), so the button will have a danger color.
};

/**
 * Options to pass to CoreAlerts.confirmDownloadSize.
 */
export type CoreAlertsConfirmDownloadSizeOptions = {
    message?: string; // Message to show. If not set, uses a default message.
    unknownMessage?: string; // Message to show if size is unknown.
    wifiThreshold?: number; // Threshold to show confirm in WiFi connection. Default: CoreWifiDownloadThreshold.
    limitedThreshold?: number; // Threshold to show confirm in limited connection. Default: CoreDownloadThreshold.
    alwaysConfirm?: boolean; // True to show a confirm even if the size isn't high, false otherwise.
};

/**
 * Options to pass to CoreAlerts.getErrorMessage.
 */
export type CoreAlertsGetErrorMessageOptions = {
    default?: string; // Default error message to show if the error is empty.
};

/**
 * Options to pass to CoreAlerts.show.
 */
export type CoreAlertsShowOptions = AlertOptions & {
    autoCloseTime?: number; // Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
    showBrowserWarningInLinks?: boolean; // Whether to show the browser warning when opening links. Defaults to true.
};

/**
 * Options to pass to CoreAlerts.showError.
 */
export type CoreAlertsShowErrorOptions = {
    autoCloseTime?: number; // Number of milliseconds to wait to close the modal. If not defined, modal won't be closed.
    default?: string; // Default error message to show if the error is empty.
    showBrowserWarningInLinks?: boolean; // Whether to show the browser warning when opening links. Defaults to true.
};
