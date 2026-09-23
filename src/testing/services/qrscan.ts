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
import { QRScannerCamera } from '@features/native/plugins/qrscanner';

import { CoreQRScanService } from '@services/qrscan';

/**
 * Emulates the QRScan service for automated testing.
 */
@Injectable()
export class CoreQRScanBehatMock extends CoreQRScanService {

    /**
     * @inheritdoc
     */
    canScanQR(): boolean {
        // Return true to show the QR button, but we cannot test the scanning functionality in automated tests.
        return true;
    }

    /**
     * @inheritdoc
     */
    async scanQR(title?: string): Promise<string | undefined> {
        // For now, return the title. We would need some way to simulate scanning in automated tests.
        return title;
    }

    /**
     * @inheritdoc
     */
    stopScanQR(): void {
        return;
    }

    /**
     * @inheritdoc
     */
    async canEnableLight(): Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    async canSwitchCamera(): Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    async toggleLight(): Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    async toggleCamera(): Promise<number> {
        return QRScannerCamera.FRONT_CAMERA;
    }

    /**
     * @inheritdoc
     */
    async isLightEnabled(): Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    async getCurrentCamera(): Promise<QRScannerCamera> {
        return QRScannerCamera.FRONT_CAMERA;
    }

}
