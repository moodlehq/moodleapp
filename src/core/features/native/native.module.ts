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

import { Badge } from '@awesome-cordova-plugins/badge/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { Chooser } from '@features/native/plugins/chooser';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { Diagnostic } from '@awesome-cordova-plugins/diagnostic/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { LocalNotifications } from '@awesome-cordova-plugins/local-notifications/ngx';
import { MediaCapture } from '@awesome-cordova-plugins/media-capture/ngx';
import { Push } from '@features/native/plugins/push';
import { QRScanner } from './plugins/qrscanner';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { SQLite } from '@awesome-cordova-plugins/sqlite/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
import { WebIntent } from '@awesome-cordova-plugins/web-intent/ngx';
import { Zip } from '@features/native/plugins/zip';

export const CORE_NATIVE_SERVICES = [
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
    MediaCapture,
    Push,
    QRScanner,
    SplashScreen,
    StatusBar,
    SQLite,
    WebIntent,
    WebView,
    Zip,
];

@NgModule({
    providers: [
        Badge,
        Camera,
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
        MediaCapture,
        SplashScreen,
        SQLite,
        StatusBar,
        WebIntent,
        WebView,
    ],
})
export class CoreNativeModule {}
