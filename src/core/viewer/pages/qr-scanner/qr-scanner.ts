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

import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IonicPage, ViewController, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Page to scan a QR code.
 */
@IonicPage({ segment: 'core-viewer-qr-scanner' })
@Component({
    selector: 'page-core-viewer-qr-scanner',
    templateUrl: 'qr-scanner.html',
})
export class CoreViewerQRScannerPage {
    title: string; // Page title.

    constructor(params: NavParams,
            translate: TranslateService,
            protected viewCtrl: ViewController,
            protected domUtils: CoreDomUtilsProvider,
            protected utils: CoreUtilsProvider) {

        this.title = params.get('title') || translate.instant('core.scanqr');

        this.utils.startScanQR().then((text) => {
            // Text captured, return it.
            text = typeof text == 'string' ? text.trim() : '';

            this.closeModal(text);
        }).catch((error) => {
            if (!this.domUtils.isCanceledError(error)) {
                // Show error and stop scanning.
                this.domUtils.showErrorModalDefault(error, 'An error occurred.');
                this.utils.stopScanQR();
            }

            this.closeModal();
        });
    }

    /**
     * Cancel scanning.
     */
    cancel(): void {
        this.utils.stopScanQR();
    }

    /**
     * Close modal.
     *
     * @param text The text to return (if any).
     */
    closeModal(text?: string): void {
        this.viewCtrl.dismiss(text);
    }

    /**
     * View will leave.
     */
    ionViewWillLeave(): void {
        // If this code is reached and scan hasn't been stopped yet it means the user clicked the back button, cancel.
        this.utils.stopScanQR();
    }
}
