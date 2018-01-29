// (C) Copyright 2015 Martin Dougiamas
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

import { NgModule } from '@angular/core';
import { Platform } from 'ionic-angular';

// Ionic Native services.
import { Camera } from '@ionic-native/camera';
import { Clipboard } from '@ionic-native/clipboard';
import { File } from '@ionic-native/file';
import { FileTransfer } from '@ionic-native/file-transfer';
import { Globalization } from '@ionic-native/globalization';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { Keyboard } from '@ionic-native/keyboard';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { MediaCapture } from '@ionic-native/media-capture';
import { Network } from '@ionic-native/network';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { SQLite } from '@ionic-native/sqlite';
import { Zip } from '@ionic-native/zip';

// Services that Mock Ionic Native in browser an desktop.
import { CameraMock } from './providers/camera';
import { ClipboardMock } from './providers/clipboard';
import { FileMock } from './providers/file';
import { FileTransferMock } from './providers/file-transfer';
import { GlobalizationMock } from './providers/globalization';
import { InAppBrowserMock } from './providers/inappbrowser';
import { LocalNotificationsMock } from './providers/local-notifications';
import { MediaCaptureMock } from './providers/media-capture';
import { NetworkMock } from './providers/network';
import { ZipMock } from './providers/zip';

import { CoreEmulatorHelperProvider } from './providers/helper';
import { CoreEmulatorCaptureHelperProvider } from './providers/capture-helper';
import { CoreAppProvider } from '../../providers/app';
import { CoreFileProvider } from '../../providers/file';
import { CoreTextUtilsProvider } from '../../providers/utils/text';
import { CoreMimetypeUtilsProvider } from '../../providers/utils/mimetype';
import { CoreUrlUtilsProvider } from '../../providers/utils/url';
import { CoreUtilsProvider } from '../../providers/utils/utils';
import { CoreInitDelegate } from '../../providers/init';

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
    ],
    providers: [
        CoreEmulatorHelperProvider,
        CoreEmulatorCaptureHelperProvider,
        {
            provide: Camera,
            deps: [CoreAppProvider, CoreEmulatorCaptureHelperProvider],
            useFactory: (appProvider: CoreAppProvider, captureHelper: CoreEmulatorCaptureHelperProvider): Camera => {
                return appProvider.isMobile() ? new Camera() : new CameraMock(captureHelper);
            }
        },
        {
            provide: Clipboard,
            deps: [CoreAppProvider],
            useFactory: (appProvider: CoreAppProvider): Clipboard => {
                return appProvider.isMobile() ? new Clipboard() : new ClipboardMock(appProvider);
            }
        },
        {
            provide: File,
            deps: [CoreAppProvider, CoreTextUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, textUtils: CoreTextUtilsProvider): File => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new File() : new FileMock(appProvider, textUtils);
            }
        },
        {
            provide: FileTransfer,
            deps: [CoreAppProvider, CoreFileProvider],
            useFactory: (appProvider: CoreAppProvider, fileProvider: CoreFileProvider): FileTransfer => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new FileTransfer() : new FileTransferMock(appProvider, fileProvider);
            }
        },
        {
            provide: Globalization,
            deps: [CoreAppProvider],
            useFactory: (appProvider: CoreAppProvider): Globalization => {
                return appProvider.isMobile() ? new Globalization() : new GlobalizationMock(appProvider);
            }
        },
        {
            provide: InAppBrowser,
            deps: [CoreAppProvider, CoreFileProvider, CoreUrlUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, fileProvider: CoreFileProvider, urlUtils: CoreUrlUtilsProvider)
                    : InAppBrowser => {
                return !appProvider.isDesktop() ? new InAppBrowser() : new InAppBrowserMock(appProvider, fileProvider, urlUtils);
            }
        },
        Keyboard,
        {
            provide: LocalNotifications,
            deps: [CoreAppProvider, CoreUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, utils: CoreUtilsProvider): LocalNotifications => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new LocalNotifications() : new LocalNotificationsMock(appProvider, utils);
            }
        },
        {
            provide: MediaCapture,
            deps: [CoreAppProvider, CoreEmulatorCaptureHelperProvider],
            useFactory: (appProvider: CoreAppProvider, captureHelper: CoreEmulatorCaptureHelperProvider): MediaCapture => {
                return appProvider.isMobile() ? new MediaCapture() : new MediaCaptureMock(captureHelper);
            }
        },
        {
            provide: Network,
            deps: [Platform],
            useFactory: (platform: Platform): Network => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return platform.is('cordova') ? new Network() : new NetworkMock();
            }
        },
        SplashScreen,
        StatusBar,
        SQLite,
        {
            provide: Zip,
            deps: [CoreAppProvider, File, CoreMimetypeUtilsProvider, CoreTextUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, file: File, mimeUtils: CoreMimetypeUtilsProvider): Zip => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new Zip() : new ZipMock(file, mimeUtils);
            }
        },
    ]
})
export class CoreEmulatorModule {
    constructor(appProvider: CoreAppProvider, initDelegate: CoreInitDelegate, helper: CoreEmulatorHelperProvider) {
        const win = <any> window; // Convert the "window" to "any" type to be able to use non-standard properties.

        // Emulate Custom URL Scheme plugin in desktop apps.
        if (appProvider.isDesktop()) {
            require('electron').ipcRenderer.on('mmAppLaunched', (event, url) => {
                if (typeof win.handleOpenURL != 'undefined') {
                    win.handleOpenURL(url);
                }
            });
        }

        if (!appProvider.isMobile()) {
            // Register an init process to load the Mocks that need it.
            initDelegate.registerProcess(helper);
        }
    }
}
