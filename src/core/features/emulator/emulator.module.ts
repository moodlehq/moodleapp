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
import { Platform } from '@ionic/angular';

import { CoreEmulatorHelperProvider } from './services/emulator-helper';
import { CoreEmulatorComponentsModule } from './components/components.module';

// Ionic Native services.
import { Badge } from '@ionic-native/badge/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { Chooser } from '@ionic-native/chooser/ngx';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { Device } from '@ionic-native/device/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { File } from '@ionic-native/file/ngx';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { FileTransfer } from '@ionic-native/file-transfer/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Media } from '@ionic-native/media/ngx';
import { MediaCapture } from '@ionic-native/media-capture/ngx';
import { Network } from '@ionic-native/network/ngx';
import { Push } from '@ionic-native/push/ngx';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { SQLite } from '@ionic-native/sqlite/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { WebIntent } from '@ionic-native/web-intent/ngx';
import { Zip } from '@ionic-native/zip/ngx';

export const IONIC_NATIVE_SERVICES = [
    Badge,
    Camera,
    Chooser,
    Clipboard,
    Device,
    Diagnostic,
    File,
    FileOpener,
    FileTransfer,
    Geolocation,
    HTTP,
    InAppBrowser,
    Keyboard,
    LocalNotifications,
    Media,
    MediaCapture,
    Network,
    Push,
    QRScanner,
    SplashScreen,
    StatusBar,
    SQLite,
    WebIntent,
    WebView,
    Zip,
];
// Mock services.
import { CameraMock } from './services/camera';
import { ClipboardMock } from './services/clipboard';
import { FileMock } from './services/file';
import { FileOpenerMock } from './services/file-opener';
import { FileTransferMock } from './services/file-transfer';
import { GeolocationMock } from './services/geolocation';
import { InAppBrowserMock } from './services/inappbrowser';
import { MediaCaptureMock } from './services/media-capture';
import { NetworkMock } from './services/network';
import { ZipMock } from './services/zip';

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
    declarations: [
    ],
    imports: [
        CoreEmulatorComponentsModule,
    ],
    providers: [
        Badge,
        {
            provide: Camera,
            deps: [Platform],
            useFactory: (platform: Platform): Camera => platform.is('cordova') ? new Camera() : new CameraMock(),
        },
        Chooser,
        {
            provide: Clipboard,
            deps: [Platform], // Use platform instead of AppProvider to prevent errors with singleton injection.
            useFactory: (platform: Platform): Clipboard => platform.is('cordova') ? new Clipboard() : new ClipboardMock(),
        },
        Device,
        Diagnostic,
        {
            provide: File,
            deps: [Platform],
            useFactory: (platform: Platform): File => platform.is('cordova') ? new File() : new FileMock(),
        },
        {
            provide: FileOpener,
            deps: [Platform],
            useFactory: (platform: Platform): FileOpener => platform.is('cordova') ? new FileOpener() : new FileOpenerMock(),
        },
        {
            provide: FileTransfer,
            deps: [Platform],
            useFactory: (platform: Platform): FileTransfer => platform.is('cordova') ? new FileTransfer() : new FileTransferMock(),
        },
        {
            provide: Geolocation,
            deps: [Platform],
            useFactory: (platform: Platform): Geolocation => platform.is('cordova') ? new Geolocation() : new GeolocationMock(),
        },
        HTTP,
        {
            provide: InAppBrowser,
            deps: [Platform],
            useFactory: (platform: Platform): InAppBrowser => platform.is('cordova') ? new InAppBrowser() : new InAppBrowserMock(),
        },
        Keyboard,
        LocalNotifications,
        {
            provide: Media,
            deps: [],
            useFactory: (): Media => new Media(),
        },
        {
            provide: MediaCapture,
            deps: [Platform],
            useFactory: (platform: Platform): MediaCapture => platform.is('cordova') ? new MediaCapture() : new MediaCaptureMock(),
        },
        {
            provide: Network,
            deps: [Platform],
            useFactory: (platform: Platform): Network => platform.is('cordova') ? new Network() : new NetworkMock(),
        },
        Push,
        QRScanner,
        SplashScreen,
        SQLite,
        StatusBar,
        WebIntent,
        WebView,
        {
            provide: Zip,
            deps: [Platform, File],
            useFactory: (platform: Platform, file: File): Zip => platform.is('cordova') ? new Zip() : new ZipMock(file),
        },
        {
            provide: APP_INITIALIZER,
            deps: [Platform, CoreEmulatorHelperProvider],
            useFactory: (platform: Platform, helperProvider: CoreEmulatorHelperProvider) => () => {
                if (platform.is('cordova')) {
                    return;
                }

                return helperProvider.load();
            },
            multi: true,
        },
    ],
})
export class CoreEmulatorModule {}
