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

import { NgModule, provideAppInitializer, Type } from '@angular/core';

import { LocalNotifications } from '@awesome-cordova-plugins/local-notifications/ngx';
import { Push } from '@features/native/plugins/push';
import { FileTransferCompat, FileTransferErrorCompat } from './services/file-transfer-compat';

/**
 * Get compatibility services that keep the Cordova API working in site plugins.
 *
 * @returns Compatibility services.
 */
export async function getCordovaCompatServices(): Promise<Type<unknown>[]> {
    /* eslint-disable @typescript-eslint/no-deprecated */
    const { Badge } = await import('./services/badge-compat');
    const { Camera } = await import('./services/camera-compat');
    const { Chooser } = await import('./services/chooser-compat');
    const { Clipboard } = await import('./services/clipboard-compat');
    const { Device } = await import('./services/device-compat');
    const { File } = await import('./services/file-compat');
    const { FileOpener } = await import('./services/file-opener-compat');
    const { InAppBrowser } = await import('./services/inappbrowser-compat');
    const { Keyboard } = await import('./services/keyboard-compat');
    const { MediaCapture } = await import('./services/media-capture-compat');
    const { QRScanner } = await import('./services/qrscanner-compat');
    const { SQLite } = await import('../cordova-compat/services/sqlite-compat');
    const { StatusBar } = await import('./services/status-bar-compat');
    const { WebIntent } = await import('./services/webintent-compat');
    const { WebView } = await import('./services/webview-compat');
    const { Zip } = await import('./services/zip-compat');
    /* eslint-enable @typescript-eslint/no-deprecated */

    return [
        Badge,
        Camera,
        Chooser,
        Clipboard,
        Device,
        File,
        FileOpener,
        InAppBrowser,
        Keyboard,
        LocalNotifications,
        MediaCapture,
        Push,
        QRScanner,
        SQLite,
        StatusBar,
        WebIntent,
        WebView,
        Zip,
    ];
}

@NgModule({
    providers: [
        provideAppInitializer(() => {
            // eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-explicit-any
            (<any> window).FileTransfer = FileTransferCompat;
            // eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-explicit-any
            (<any> window).FileTransferError = FileTransferErrorCompat;
        }),
    ],
})
export class CoreCordovaCompatModule {}
