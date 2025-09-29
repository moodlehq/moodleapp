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
import { makeSingleton, Translate } from '@singletons';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CorePromisedValue } from '@classes/promised-value';
import { QRScanner } from '@features/native/plugins';
import { CoreModals } from './overlays/modals';
import { CorePlatform } from './platform';
import { Subscription } from 'rxjs';
import { CoreCustomURLSchemes } from './urlschemes';
import { QRScannerCamera, QRScannerErrorCode } from '@features/native/plugins/qrscanner';
import { CoreAlerts } from './overlays/alerts';

/**
 * Handles qr scan services.
 */
@Injectable({ providedIn: 'root' })
export class CoreQRScanService {

    protected qrScanData?: {deferred: CorePromisedValue<string>; observable: Subscription};
    protected initialColorSchemeContent = 'light dark';

    /**
     * Check whether the app can scan QR codes.
     *
     * @returns Whether the app can scan QR codes.
     */
    canScanQR(): boolean {
        return CorePlatform.isMobile() && !!window.QRScanner;
    }

    /**
     * Open a modal to scan a QR code.
     *
     * @param title Title of the modal. Defaults to "QR reader".
     * @returns Promise resolved with the captured text or undefined if cancelled or error.
     */
    async scanQR(title?: string): Promise<string | undefined> {
        const { CoreViewerQRScannerComponent } = await import('@features/viewer/components/qr-scanner/qr-scanner');

        return CoreModals.openModal<string>({
            component: CoreViewerQRScannerComponent,
            cssClass: 'core-modal-fullscreen',
            componentProps: {
                title,
            },
        });
    }

    /**
     * Scan a QR code and handle the URL if it's a custom URL scheme.
     *
     * @param title Title of the modal. Defaults to "QR reader".
     * @returns Promise resolved with the captured text or undefined if cancelled, error or URL handled.
     */
    async scanQRWithUrlHandling(title?: string): Promise<string | undefined> {
        // Scan for a QR code.
        const text = await CoreQRScan.scanQR(title);

        if (!text) {
            return;
        }

        if (CoreCustomURLSchemes.isCustomURL(text)) {
            // Is a custom URL scheme, handle it.
            try {
                await CoreCustomURLSchemes.handleCustomURL(text);
            } catch (error) {
                CoreCustomURLSchemes.treatHandleCustomURLError(error, text, 'CoreQRScanService');
            }

            return;
        }

        return text;
    }

    /**
     * Start scanning for a QR code.
     *
     * @returns Promise resolved with the QR string, rejected if error or cancelled.
     */
    async startScanQR(): Promise<string | undefined> {
        // Ask the user for permission to use the camera.
        // The scan method also does this, but since it returns an Observable we wouldn't be able to detect if the user denied.
        try {
            const status = await QRScanner.prepare();

            if (!status.authorized) {
                if (status.denied && status.canOpenSettings){
                    await this.askForPermissionWhenDenied();

                    return;
                } else {
                    // No access to the camera, reject. In android this shouldn't happen, denying access passes through catch.
                    throw new Error(Translate.instant('core.viewer.qrscannerdeniedpermissionmessage'));
                }
            }

            if (this.qrScanData && this.qrScanData.deferred) {
                // Already scanning.
                return this.qrScanData.deferred;
            }

            // Start scanning.
            this.qrScanData = {
                deferred: new CorePromisedValue(),

                // When text is received, stop scanning and return the text.
                observable: QRScanner.scan().subscribe(text => this.stopScanQR(text, false)),
            };

            // Show the camera.
            try {
                await QRScanner.show();

                document.body.classList.add('core-scanning-qr');

                // Set color-scheme to 'normal', otherwise the camera isn't seen in Android.
                const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
                if (colorSchemeMeta) {
                    this.initialColorSchemeContent = colorSchemeMeta.getAttribute('content') || this.initialColorSchemeContent;
                    colorSchemeMeta.setAttribute('content', 'normal');
                }

                return this.qrScanData.deferred;
            } catch (error) {
                this.stopScanQR(error, true);

                throw error;
            }
        } catch (error) {
            if (error.code === QRScannerErrorCode.CAMERA_ACCESS_DENIED) {
                // User denied permission to use the camera.
                await this.askForPermissionWhenDenied();

                return;
            }
            // eslint-disable-next-line @typescript-eslint/naming-convention
            error.message = error.message || (error as { _message?: string })._message;

            throw error;
        }
    }

    /**
     * Prompts the user to grant permission for QR scanning if previously denied.
     *
     * Displays a confirmation dialog informing the user about the denied permission,
     * with options to open the device settings or cancel. If the user chooses to open
     * settings, the app permission settings are opened. If the user cancels, a
     * `CoreCanceledError` is thrown.
     *
     * @returns Resolves when the user responds to the prompt.
     */
    protected async askForPermissionWhenDenied(): Promise<void> {
        try {
            await CoreAlerts.confirm(
                Translate.instant('core.viewer.qrscannerdeniedpermissionmessage'),
                {
                    header: Translate.instant('core.viewer.qrscannerdeniedpermissiontitle'),
                    okText: Translate.instant('core.opensettings'),
                    cancelText: Translate.instant('core.cancel'),
                },
            );

            QRScanner.openSettings();
        } catch {
            // User canceled.
            throw new CoreCanceledError('');
        }
    }

    /**
     * Stop scanning for QR code. If no param is provided, the app will consider the user cancelled.
     *
     * @param data If success, the text of the QR code. If error, the error object or message. Undefined for cancelled.
     * @param error True if the data belongs to an error, false otherwise.
     */
    stopScanQR(data?: string | Error, error?: boolean): void {
        if (!this.qrScanData) {
            // Not scanning.
            return;
        }

        // Hide camera preview.
        document.body.classList.remove('core-scanning-qr');

        // Set color-scheme to the initial value.
        document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', this.initialColorSchemeContent);

        QRScanner.hide();
        QRScanner.destroy();

        this.qrScanData.observable.unsubscribe(); // Stop scanning.

        if (error) {
            this.qrScanData.deferred.reject(typeof data === 'string' ? new Error(data) : data);
        } else if (data !== undefined) {
            this.qrScanData.deferred.resolve(data as string);
        } else {
            this.qrScanData.deferred.reject(new CoreCanceledError());
        }

        delete this.qrScanData;
    }

    /**
     * Check if the QR scanner camera light can be enabled.
     *
     * @returns Whether the QR scanner camera light can be enabled.
     */
    async canEnableLight(): Promise<boolean> {
        const status = await QRScanner.getStatus();

        return !!status.canEnableLight;
    }

    /**
     * Check if the QR scanner can switch camera.
     *
     * @returns Whether the QR scanner can switch camera.
     */
    async canSwitchCamera(): Promise<boolean> {
        const status = await QRScanner.getStatus();

        return !!status.canChangeCamera;
    }

    /**
     * Toggle the light of the camera.
     *
     * @param enable Whether to enable or disable the light.
     * @returns Whether the light is enabled or not after toggling.
     */
    async toggleLight(enable?: boolean): Promise<boolean> {
        if (enable === undefined) {
            let status = await QRScanner.getStatus();

            status = status.lightEnabled
                ? await QRScanner.disableLight()
                : await QRScanner.enableLight();

            return !!status.lightEnabled;
        } else {
            const status = enable
                ? await QRScanner.enableLight()
                : await QRScanner.disableLight();

            return !!status.lightEnabled;
        }
    }

     /**
      * Toggle the camera of the phone.
      *
      * @returns The current camera being used after toggling.
      */
    async toggleCamera(): Promise<number> {
        let status = await QRScanner.getStatus();

        status = status.currentCamera === QRScannerCamera.FRONT_CAMERA
            ? await QRScanner.useBackCamera()
            : await QRScanner.useFrontCamera();

        return status.currentCamera ?? QRScannerCamera.FRONT_CAMERA;
    }

    /**
     * Check if the light is enabled.
     *
     * @returns Whether the light is enabled or not.
     */
    async isLightEnabled(): Promise<boolean> {
        const status = await QRScanner.getStatus();

        return !!status.lightEnabled;
    }

    /**
     * Get the current camera being used by the QR scanner.
     *
     * @returns The current camera.
     */
    async getCurrentCamera(): Promise<QRScannerCamera> {
        const status = await QRScanner.getStatus();

        return status.currentCamera ?? QRScannerCamera.FRONT_CAMERA;
    }

}

export const CoreQRScan = makeSingleton(CoreQRScanService);
