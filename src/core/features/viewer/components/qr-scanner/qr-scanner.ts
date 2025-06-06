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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, computed, input, OnDestroy, OnInit, signal } from '@angular/core';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreQRScan } from '@services/qrscan';
import { ModalController, Translate } from '@singletons';

/**
 * Page to scan a QR code.
 */
@Component({
    selector: 'core-viewer-qr-scanner',
    templateUrl: 'qr-scanner.html',
    styleUrl: 'qr-scanner.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreViewerQRScannerComponent implements OnInit, OnDestroy {

    readonly title = input(Translate.instant('core.viewer.qrscannertitle'), { transform: (value?: string) => {
        if (value === undefined || value === null) {
            return Translate.instant('core.viewer.qrscannertitle');
        }

        return value;
    } });

    canEnableTorch = false;
    canSwitchCamera = false;
    readonly torchEnabled = signal(false);

    readonly torchText = computed(() =>
        this.torchEnabled()
            ? Translate.instant('core.viewer.qrscannerdisabletorch')
            : Translate.instant('core.viewer.qrscannerenabletorch'));

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.canEnableTorch = await CoreQRScan.canEnableLight();
            this.canSwitchCamera = await CoreQRScan.canSwitchCamera();

            let text = await CoreQRScan.startScanQR();

            // Text captured, return it.
            text = typeof text === 'string' ? text.trim() : '';

            this.closeModal(text);
        } catch (error) {
            if (!CoreErrorHelper.isCanceledError(error)) {
                // Show error and stop scanning.
                CoreAlerts.showError(error, { default: 'An error occurred while scanning the QR code.' });
                CoreQRScan.stopScanQR();
            }

            this.closeModal();
        }
    }

    /**
     * Cancel scanning.
     */
    cancel(): void {
        CoreQRScan.stopScanQR();
    }

    /**
     * Close modal.
     *
     * @param text The text to return (if any).
     */
    closeModal(text?: string): void {
        ModalController.dismiss(text);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        // If this code is reached and scan hasn't been stopped yet it means the user clicked the back button, cancel.
        CoreQRScan.stopScanQR();
    }

    /**
     * Toggle the light of the camera.
     */
    async toggleTorch(): Promise<void> {
        this.torchEnabled.set(await CoreQRScan.toggleLight());
    }

    /**
     * Toggle the camera.
     */
    toggleCamera(): void {
        CoreQRScan.toggleCamera();
    }

}
