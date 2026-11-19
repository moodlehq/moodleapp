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
import { CoreQRScan } from '@services/qrscan';
import { Observable } from 'rxjs';

/**
 * QR Scanner plugin wrapper.
 *
 * @deprecated since 6.0. Use CoreQRScan service instead.
 */
@Injectable({ providedIn: 'root' })
export class QRScanner {

    protected buildStatus: BarcodeScannerStatus = {
        authorized: true, // Assume authorized until proven otherwise (permissions checked at scan time)
        denied: false,
        restricted: false,
        prepared: true,
        scanning: false,
        previewing: false,
        showing: false,
        lightEnabled: false,
        canOpenSettings: false,
        canEnableLight: false, // Not supported by this plugin
        canChangeCamera: false, // User controls camera in native modal
        currentCamera: 0,
    };

    /**
     * Prepare the scanner (permissions are handled automatically).
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async prepare(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * Destroy/cleanup the scanner instance.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async destroy(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async show(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async hide(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * Call this method to enable scanning. You must then call the `show` method to make the camera preview visible.
     *
     * @returns Observable that emits the scanned text. Unsubscribe from the observable to stop scanning.
     * @deprecated since 6.0. Use CoreQRScan.scanQR().
     */
    scan(): Observable<string> {
        return new Observable<string>((observer) => {
            CoreQRScan.scanQR().then((result) => {
                observer.next(result);
                observer.complete();

                return;
            }).catch((error) => {
                observer.error(error);
            });
        });
    }

    /**
     * User dismisses modal to cancel scan.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async cancelScan(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async enableLight(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async disableLight(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async useCamera(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async useFrontCamera(): Promise<BarcodeScannerStatus> {

        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async useBackCamera(): Promise<BarcodeScannerStatus> {

        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async pausePreview(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * This method is a no-op.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async resumePreview(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * Get the current scanner status.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async getStatus(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

    /**
     * The native modal handles permission requests automatically.
     * This method is a no-op.
     *
     * @deprecated since 6.0. Not supported anymore.
     */
    openSettings(): void {
        // No-op
    }

    /**
     * Permissions are requested when scan() is called.
     * This method returns a default status.
     *
     * @returns A status object compatible with Cordova API.
     * @deprecated since 6.0. Not supported anymore.
     */
    async checkPermissions(): Promise<BarcodeScannerStatus> {
        return this.buildStatus;
    }

}

interface BarcodeScannerStatus {
    authorized: boolean;
    denied: boolean;
    restricted: boolean;
    prepared: boolean;
    scanning: boolean;
    previewing: boolean;
    showing: boolean;
    lightEnabled: boolean;
    canOpenSettings: boolean;
    canEnableLight: boolean;
    canChangeCamera: boolean;
    currentCamera: number;
}
