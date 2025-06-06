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
import { Observable } from 'rxjs';
import { QRScannerError, QRScannerStatus } from '@moodlehq/cordova-plugin-qrscanner';

/**
 * QR Scanner plugin wrapper
 */
@Injectable({ providedIn: 'root' })
export class QRScanner {

    /**
     * Destroy the scanner instance.
     *
     * @returns QR scanner status.
     */
    destroy(): Promise<QRScannerStatus> {
        return new Promise((resolve) => window.QRScanner.destroy(resolve));
    }

    /**
     * Request permission to use QR scanner.
     *
     * @returns QR scanner status.
     */
    prepare(): Promise<QRScannerStatus> {
        return new Promise((resolve, reject) => {
            window.QRScanner.prepare((error: QRScannerError, status: QRScannerStatus) => {
                error ? reject(error) : resolve(status);
            });
        });
    }

    /**
     * Configures the native webview to have a transparent background, then sets the background of the <body> and <html> DOM
     * elements to transparent, allowing the webview to re-render with the transparent background.
     *
     * @returns QR scanner status.
     */
    show(): Promise<QRScannerStatus> {
        return new Promise(resolve => window.QRScanner.show((status) => resolve(status)));
    }

    /**
     * Call this method to enable scanning. You must then call the `show` method to make the camera preview visible.
     *
     * @returns Observable that emits the scanned text. Unsubscribe from the observable to stop scanning.
     */
    scan(): Observable<string> {
        return new Observable(observer => {
            window.QRScanner.scan((error: QRScannerError, text: string) => {
                error ? observer.error(error) : observer.next(text);
            });

            return () => {
                window.QRScanner.cancelScan();
            };
        });
    }

    /**
     * Configures the native webview to be opaque with a white background, covering the video preview.
     *
     * @returns QR scanner status.
     */
    hide(): Promise<QRScannerStatus> {
        return new Promise((resolve) => window.QRScanner.hide(resolve));
    }

    /**
     * Enable the device's light (for scanning in low-light environments).
     *
     * @returns QR scanner status.
     */
    enableLight(): Promise<QRScannerStatus> {
        return new Promise((resolve, reject) => {
            window.QRScanner.enableLight((error: QRScannerError, status: QRScannerStatus) => {
                error ? reject(error) : resolve(status);
            });
        });
    }

    /**
     * Disable the device's light.
     *
     * @returns QR scanner status.
     */
    disableLight(): Promise<QRScannerStatus> {
        return new Promise((resolve, reject) => {
            window.QRScanner.disableLight((error: QRScannerError, status: QRScannerStatus) => {
                error ? reject(error) : resolve(status);
            });
        });
    }

    /**
     * Use front camera.
     *
     * @returns QR scanner status.
     */
    useFrontCamera(): Promise<QRScannerStatus> {
        return new Promise((resolve, reject) => {
            window.QRScanner.useFrontCamera((error: QRScannerError, status: QRScannerStatus) => {
                error ? reject(error) : resolve(status);
            });
        });
    }

    /**
     * Use back camera.
     *
     * @returns QR scanner status.
     */
    useBackCamera(): Promise<QRScannerStatus> {
        return new Promise((resolve, reject) => {
            window.QRScanner.useBackCamera((error: QRScannerError, status: QRScannerStatus) => {
                error ? reject(error) : resolve(status);
            });
        });
    }

    /**
     * Disable the device's light.
     *
     * @param camera Provide `0` for back camera, and `1` for front camera.
     * @returns QR scanner status.
     */
    useCamera(camera: QRScannerCamera): Promise<QRScannerStatus> {
        return new Promise((resolve, reject) => {
            window.QRScanner.useCamera(camera, (error: QRScannerError, status: QRScannerStatus) => {
                error ? reject(error) : resolve(status);
            });
        });
    }

    /**
     * Pauses the video preview on the current frame and pauses scanning.
     *
     * @returns QR scanner status.
     */
    pausePreview(): Promise<QRScannerStatus> {
        return new Promise((resolve) => window.QRScanner.pausePreview(resolve));
    }

    /**
     * Resume the video preview and resumes scanning.
     *
     * @returns QR scanner status.
     */
    resumePreview(): Promise<QRScannerStatus> {
        return new Promise((resolve) => window.QRScanner.resumePreview(resolve));
    }

    /**
     * Returns permission status.
     *
     * @returns QR scanner status.
     */
    getStatus(): Promise<QRScannerStatus> {
        return new Promise((resolve) => window.QRScanner.getStatus(resolve));
    }

    /**
     * Opens settings to edit app permissions.
     */
    openSettings(): void {
        window.QRScanner.openSettings();
    }

}

export enum QRScannerCamera {
    BACK_CAMERA = 0,
    FRONT_CAMERA = 1,
}
