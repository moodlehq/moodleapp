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

import { Clipboard } from '@ionic-native/clipboard';
import { File } from '@ionic-native/file';
import { FileTransfer } from '@ionic-native/file-transfer';
import { Globalization } from '@ionic-native/globalization';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { Network } from '@ionic-native/network';
import { Zip } from '@ionic-native/zip';

import { ClipboardMock } from './providers/clipboard';
import { FileMock } from './providers/file';
import { FileTransferMock } from './providers/file-transfer';
import { GlobalizationMock } from './providers/globalization';
import { LocalNotificationsMock } from './providers/local-notifications';
import { NetworkMock } from './providers/network';
import { ZipMock } from './providers/zip';
import { InAppBrowser } from '@ionic-native/in-app-browser';

import { CoreEmulatorHelperProvider } from './providers/helper';
import { CoreAppProvider } from '../../providers/app';
import { CoreFileProvider } from '../../providers/file';
import { CoreTextUtilsProvider } from '../../providers/utils/text';
import { CoreMimetypeUtilsProvider } from '../../providers/utils/mimetype';
import { CoreUtilsProvider } from '../../providers/utils/utils';
import { CoreInitDelegate } from '../../providers/init';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        CoreEmulatorHelperProvider,
        {
            provide: Clipboard,
            deps: [CoreAppProvider],
            useFactory: (appProvider: CoreAppProvider) => {
                return appProvider.isMobile() ? new Clipboard() : new ClipboardMock(appProvider);
            }
        },
        {
            provide: File,
            deps: [CoreAppProvider, CoreTextUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, textUtils: CoreTextUtilsProvider) => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new File() : new FileMock(appProvider, textUtils);
            }
        },
        {
            provide: FileTransfer,
            deps: [CoreAppProvider, CoreFileProvider],
            useFactory: (appProvider: CoreAppProvider, fileProvider: CoreFileProvider) => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new FileTransfer() : new FileTransferMock(appProvider, fileProvider);
            }
        },
        {
            provide: Globalization,
            deps: [CoreAppProvider],
            useFactory: (appProvider: CoreAppProvider) => {
                return appProvider.isMobile() ? new Globalization() : new GlobalizationMock(appProvider);
            }
        },
        {
            provide: LocalNotifications,
            deps: [CoreAppProvider, CoreUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, utils: CoreUtilsProvider) => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new LocalNotifications() : new LocalNotificationsMock(appProvider, utils);
            }
        },
        {
            provide: Network,
            deps: [Platform],
            useFactory: (platform: Platform) => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return platform.is('cordova') ? new Network() : new NetworkMock();
            }
        },
        {
            provide: Zip,
            deps: [CoreAppProvider, File, CoreMimetypeUtilsProvider, CoreTextUtilsProvider],
            useFactory: (appProvider: CoreAppProvider, file: File, mimeUtils: CoreMimetypeUtilsProvider) => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return appProvider.isMobile() ? new Zip() : new ZipMock(file, mimeUtils);
            }
        },
        InAppBrowser
    ]
})
export class CoreEmulatorModule {
    constructor(appProvider: CoreAppProvider, initDelegate: CoreInitDelegate, helper: CoreEmulatorHelperProvider) {
        let win = <any>window; // Convert the "window" to "any" type to be able to use non-standard properties.

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
