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
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { Observable } from 'rxjs';
import { CoreLoggerProvider } from '@providers/logger';

/**
 * Emulates the Cordova QR Scanner plugin in desktop apps and in browser.
 */
@Injectable()
export class QRScannerMock extends QRScanner {
    protected logger;

    constructor(logger: CoreLoggerProvider) {
        super();

        this.logger = logger.getInstance('QRScannerMock');
    }

    /**
     * Request permission to use QR scanner.
     *
     * @return Promise.
     */
    prepare(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Call this method to enable scanning. You must then call the `show` method to make the camera preview visible.
     *
     * @return Observable that emits the scanned text. Unsubscribe from the observable to stop scanning.
     */
    scan(): Observable<string> {
        this.logger.error('QRScanner isn\'t available in desktop apps.');

        return null;
    }

    /**
     * Configures the native webview to have a transparent background, then sets the background of the <body> and <html> DOM
     * elements to transparent, allowing the webview to re-render with the transparent background.
     *
     * @return Promise.
     */
    show(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Configures the native webview to be opaque with a white background, covering the video preview.
     *
     * @return Promise.
     */
    hide(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Enable the device's light (for scanning in low-light environments).
     *
     * @return Promise.
     */
    enableLight(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Destroy the scanner instance.
     *
     * @return Promise.
     */
    destroy(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Disable the device's light.
     *
     * @return Promise.
     */
    disableLight(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Use front camera
     *
     * @return Promise.
     */
    useFrontCamera(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Use back camera
     *
     * @return Promise.
     */
    useBackCamera(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Set camera to be used.
     *
     * @param camera Provide `0` for back camera, and `1` for front camera.
     * @return Promise.
     */
    useCamera(camera: number): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Pauses the video preview on the current frame and pauses scanning.
     *
     * @return Promise.
     */
    pausePreview(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Resumse the video preview and resumes scanning.
     *
     * @return Promise.
     */
    resumePreview(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Returns permission status
     *
     * @return Promise.
     */
    getStatus(): Promise<QRScannerStatus> {
        return Promise.reject('QRScanner isn\'t available in desktop apps.');
    }

    /**
     * Opens settings to edit app permissions.
     */
    openSettings(): void {
        this.logger.error('QRScanner isn\'t available in desktop apps.');
    }
}
