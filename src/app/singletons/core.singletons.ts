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

import { Injector, NgZone as NgZoneService } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
    Platform as PlatformService,
    AlertController as AlertControllerService,
    LoadingController as LoadingControllerService,
    ModalController as ModalControllerService,
    ToastController as ToastControllerService,
} from '@ionic/angular';

import { Clipboard as ClipboardService } from '@ionic-native/clipboard/ngx';
import { Diagnostic as DiagnosticService } from '@ionic-native/diagnostic/ngx';
import { Device as DeviceService } from '@ionic-native/device/ngx';
import { File as FileService } from '@ionic-native/file/ngx';
import { FileOpener as FileOpenerService } from '@ionic-native/file-opener/ngx';
import { FileTransfer as FileTransferService } from '@ionic-native/file-transfer/ngx';
import { Geolocation as GeolocationService } from '@ionic-native/geolocation/ngx';
import { Globalization as GlobalizationService } from '@ionic-native/globalization/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { InAppBrowser as InAppBrowserService } from '@ionic-native/in-app-browser/ngx';
import { WebView as WebViewService } from '@ionic-native/ionic-webview/ngx';
import { Keyboard as KeyboardService } from '@ionic-native/keyboard/ngx';
import { LocalNotifications as LocalNotificationsService } from '@ionic-native/local-notifications/ngx';
import { Network as NetworkService } from '@ionic-native/network/ngx';
import { Push as PushService } from '@ionic-native/push/ngx';
import { QRScanner as QRScannerService } from '@ionic-native/qr-scanner/ngx';
import { StatusBar as StatusBarService } from '@ionic-native/status-bar/ngx';
import { SplashScreen as SplashScreenService } from '@ionic-native/splash-screen/ngx';
import { SQLite as SQLiteService } from '@ionic-native/sqlite/ngx';
import { WebIntent as WebIntentService } from '@ionic-native/web-intent/ngx';
import { Zip as ZipService } from '@ionic-native/zip/ngx';

import { TranslateService } from '@ngx-translate/core';

import { CoreSingletonsFactory, CoreInjectionToken, CoreSingletonClass } from '@classes/singletons-factory';

const factory = new CoreSingletonsFactory();

/**
 * Set the injector that will be used to resolve instances in the singletons of this module.
 *
 * @param injector Module injector.
 */
export function setSingletonsInjector(injector: Injector): void {
    factory.setInjector(injector);
}

/**
 * Make a singleton for this module.
 *
 * @param injectionToken Injection token used to resolve the singleton instance. This is usually the service class if the
 * provider was defined using a class or the string used in the `provide` key if it was defined using an object.
 */
export function makeSingleton<Service>(injectionToken: CoreInjectionToken<Service>): CoreSingletonClass<Service> {
    return factory.makeSingleton(injectionToken);
}

// Convert ionic-native services to singleton.
export class Clipboard extends makeSingleton(ClipboardService) {}
export class Device extends makeSingleton(DeviceService) {}
export class Diagnostic extends makeSingleton(DiagnosticService) {}
export class File extends makeSingleton(FileService) {}
export class FileOpener extends makeSingleton(FileOpenerService) {}
export class FileTransfer extends makeSingleton(FileTransferService) {}
export class Geolocation extends makeSingleton(GeolocationService) {}
export class Globalization extends makeSingleton(GlobalizationService) {}
export class InAppBrowser extends makeSingleton(InAppBrowserService) {}
export class Keyboard extends makeSingleton(KeyboardService) {}
export class LocalNotifications extends makeSingleton(LocalNotificationsService) {}
export class NativeHttp extends makeSingleton(HTTP) {}
export class Network extends makeSingleton(NetworkService) {}
export class Push extends makeSingleton(PushService) {}
export class QRScanner extends makeSingleton(QRScannerService) {}
export class StatusBar extends makeSingleton(StatusBarService) {}
export class SplashScreen extends makeSingleton(SplashScreenService) {}
export class SQLite extends makeSingleton(SQLiteService) {}
export class WebIntent extends makeSingleton(WebIntentService) {}
export class WebView extends makeSingleton(WebViewService) {}
export class Zip extends makeSingleton(ZipService) {}

// Convert some Angular and Ionic injectables to singletons.
export class NgZone extends makeSingleton(NgZoneService) {}
export class Http extends makeSingleton(HttpClient) {}
export class Platform extends makeSingleton(PlatformService) {}
export class AlertController extends makeSingleton(AlertControllerService) {}
export class LoadingController extends makeSingleton(LoadingControllerService) {}
export class ModalController extends makeSingleton(ModalControllerService) {}
export class ToastController extends makeSingleton(ToastControllerService) {}

// Convert external libraries injectables.
export class Translate extends makeSingleton(TranslateService) {}
