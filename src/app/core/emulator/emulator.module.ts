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

import { NgModule } from '@angular/core';

// Ionic Native services.
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { Device } from '@ionic-native/device/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { File } from '@ionic-native/file/ngx';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { FileTransfer } from '@ionic-native/file-transfer/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Globalization } from '@ionic-native/globalization/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Network } from '@ionic-native/network/ngx';
import { Push } from '@ionic-native/push/ngx';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { SQLite } from '@ionic-native/sqlite/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { WebIntent } from '@ionic-native/web-intent/ngx';
import { Zip } from '@ionic-native/zip/ngx';

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
        Clipboard,
        Device,
        Diagnostic,
        File,
        FileOpener,
        FileTransfer,
        Geolocation,
        Globalization,
        HTTP,
        InAppBrowser,
        Keyboard,
        LocalNotifications,
        Network,
        Push,
        QRScanner,
        SplashScreen,
        SQLite,
        StatusBar,
        WebIntent,
        WebView,
        Zip,
    ],
})
export class CoreEmulatorModule { }
