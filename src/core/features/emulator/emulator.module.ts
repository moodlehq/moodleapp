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

import { APP_INITIALIZER, NgModule } from '@angular/core';

import { CoreEmulatorHelper } from './services/emulator-helper';
import { CoreEmulatorComponentsModule } from './components/components.module';

// Ionic Native services.
import { Camera } from '@ionic-native/camera/ngx';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { File } from '@ionic-native/file/ngx';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { FileTransfer } from '@ionic-native/file-transfer/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { MediaCapture } from '@ionic-native/media-capture/ngx';
import { Zip } from '@ionic-native/zip/ngx';

// Mock services.
import { CameraMock } from './services/camera';
import { ClipboardMock } from './services/clipboard';
import { FileMock } from './services/file';
import { FileOpenerMock } from './services/file-opener';
import { FileTransferMock } from './services/file-transfer';
import { GeolocationMock } from './services/geolocation';
import { InAppBrowserMock } from './services/inappbrowser';
import { LocalNotificationsMock } from './services/local-notifications';
import { MediaCaptureMock } from './services/media-capture';
import { ZipMock } from './services/zip';
import { CorePlatform } from '@services/platform';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreNative } from '@features/native/services/native';
import { SecureStorageMock } from '@features/emulator/classes/SecureStorage';

/**
 * This module handles the emulation of Cordova plugins in browser and desktop.
 *
 * It includes the "mock" of all the Ionic Native services that should be supported in browser and desktop,
 * otherwise those features would only work in a Cordova environment.
 *
 * This module also determines if the app should use the original service or the mock. In each of the "useFactory"
 * functions we check if the app is running in mobile or not, and then provide the right service to use.
 */
@NgModule({
    imports: [
        CoreEmulatorComponentsModule,
    ],
    providers: [
        {
            provide: Camera,
            useFactory: (): Camera => CorePlatform.is('cordova') ? new Camera() : new CameraMock(),
        },
        {
            provide: Clipboard,
            useFactory: (): Clipboard => CorePlatform.is('cordova') ? new Clipboard() : new ClipboardMock(),
        },
        {
            provide: File,
            useFactory: (): File => CorePlatform.is('cordova') ? new File() : new FileMock(),
        },
        {
            provide: FileOpener,
            useFactory: (): FileOpener => CorePlatform.is('cordova') ? new FileOpener() : new FileOpenerMock(),
        },
        {
            provide: FileTransfer,
            useFactory: (): FileTransfer => CorePlatform.is('cordova') ? new FileTransfer() : new FileTransferMock(),
        },
        {
            provide: Geolocation,
            useFactory: (): Geolocation => CorePlatform.is('cordova') ? new Geolocation() : new GeolocationMock(),
        },
        {
            provide: InAppBrowser,
            useFactory: (): InAppBrowser => CorePlatform.is('cordova') ? new InAppBrowser() : new InAppBrowserMock(),
        },
        {
            provide: MediaCapture,
            useFactory: (): MediaCapture => CorePlatform.is('cordova') ? new MediaCapture() : new MediaCaptureMock(),
        },
        {
            provide: Zip,
            useFactory: (): Zip => CorePlatform.is('cordova') ? new Zip() : new ZipMock(),
        },
        {
            provide: LocalNotifications,
            useFactory: (): LocalNotifications => CoreLocalNotifications.isPluginAvailable()
                ? new LocalNotifications()
                : new LocalNotificationsMock(),
        },
        {
            provide: APP_INITIALIZER,
            useValue: async () => {
                if (CorePlatform.is('cordova')) {
                    return;
                }

                CoreNative.registerBrowserMock('secureStorage', new SecureStorageMock());

                await CoreEmulatorHelper.load();
            },
            multi: true,
        },
    ],
})
export class CoreEmulatorModule {}
