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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { ModalController, Translate } from '@singletons';

/**
 * Page to scan a QR code.
 */
@Component({
    selector: 'core-viewer-qr-scanner',
    templateUrl: 'qr-scanner.html',
})
export class CoreViewerQRScannerComponent implements OnInit, OnDestroy {

    @Input() title?: string; // Page title.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.title = this.title || Translate.instant('core.scanqr');

        try {

            let text = await CoreUtils.startScanQR();

            // Text captured, return it.
            text = typeof text == 'string' ? text.trim() : '';

            this.closeModal(text);
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                // Show error and stop scanning.
                CoreDomUtils.showErrorModalDefault(error, 'An error occurred.');
                CoreUtils.stopScanQR();
            }

            this.closeModal();
        }
    }

    /**
     * Cancel scanning.
     */
    cancel(): void {
        CoreUtils.stopScanQR();
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
        CoreUtils.stopScanQR();
    }

}
