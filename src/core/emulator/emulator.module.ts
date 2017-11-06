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

import { CoreAppProvider } from '../../providers/app';
import { Clipboard } from '@ionic-native/clipboard';
import { Globalization } from '@ionic-native/globalization';
import { Network } from '@ionic-native/network';
import { ClipboardMock } from './providers/clipboard';
import { GlobalizationMock } from './providers/globalization';
import { NetworkMock } from './providers/network';
import { InAppBrowser } from '@ionic-native/in-app-browser';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        ClipboardMock,
        GlobalizationMock,
        {
            provide: Clipboard,
            deps: [CoreAppProvider],
            useFactory: (appProvider: CoreAppProvider) => {
                return appProvider.isMobile() ? new Clipboard() : new ClipboardMock(appProvider);
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
            provide: Network,
            deps: [Platform],
            useFactory: (platform: Platform) => {
                // Use platform instead of CoreAppProvider to prevent circular dependencies.
                return platform.is('cordova') ? new Network() : new NetworkMock();
            }
        },
        InAppBrowser
    ]
})
export class CoreEmulatorModule {
    constructor(appProvider: CoreAppProvider) {
        let win = <any>window; // Convert the "window" to "any" type to be able to use non-standard properties.

        // Emulate Custom URL Scheme plugin in desktop apps.
        if (appProvider.isDesktop()) {
            require('electron').ipcRenderer.on('mmAppLaunched', function(event, url) {
                win.handleOpenURL && win.handleOpenURL(url);
            });
        }
    }
}
