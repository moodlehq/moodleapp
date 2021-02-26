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

import { ApplicationRef, ApplicationInitStatus, Injector, NgZone as NgZoneService, Type } from '@angular/core';
import { Router as RouterService } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import {
    Platform as PlatformService,
    AlertController as AlertControllerService,
    LoadingController as LoadingControllerService,
    ModalController as ModalControllerService,
    ToastController as ToastControllerService,
    GestureController as GestureControllerService,
    ActionSheetController as ActionSheetControllerService,
    NavController as NavControllerService,
    PopoverController as PopoverControllerService,
} from '@ionic/angular';

import { Badge as BadgeService } from '@ionic-native/badge/ngx';
import { Camera as CameraService } from '@ionic-native/camera/ngx';
import { Chooser as ChooserService } from '@ionic-native/chooser/ngx';
import { Clipboard as ClipboardService } from '@ionic-native/clipboard/ngx';
import { Diagnostic as DiagnosticService } from '@ionic-native/diagnostic/ngx';
import { Device as DeviceService } from '@ionic-native/device/ngx';
import { File as FileService } from '@ionic-native/file/ngx';
import { FileOpener as FileOpenerService } from '@ionic-native/file-opener/ngx';
import { FileTransfer as FileTransferService } from '@ionic-native/file-transfer/ngx';
import { Geolocation as GeolocationService } from '@ionic-native/geolocation/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { InAppBrowser as InAppBrowserService } from '@ionic-native/in-app-browser/ngx';
import { WebView as WebViewService } from '@ionic-native/ionic-webview/ngx';
import { Keyboard as KeyboardService } from '@ionic-native/keyboard/ngx';
import { LocalNotifications as LocalNotificationsService } from '@ionic-native/local-notifications/ngx';
import { Media as MediaService } from '@ionic-native/media/ngx';
import { MediaCapture as MediaCaptureService } from '@ionic-native/media-capture/ngx';
import { Network as NetworkService } from '@ionic-native/network/ngx';
import { Push as PushService } from '@ionic-native/push/ngx';
import { QRScanner as QRScannerService } from '@ionic-native/qr-scanner/ngx';
import { StatusBar as StatusBarService } from '@ionic-native/status-bar/ngx';
import { SplashScreen as SplashScreenService } from '@ionic-native/splash-screen/ngx';
import { SQLite as SQLiteService } from '@ionic-native/sqlite/ngx';
import { WebIntent as WebIntentService } from '@ionic-native/web-intent/ngx';
import { Zip as ZipService } from '@ionic-native/zip/ngx';

import { TranslateService } from '@ngx-translate/core';

const OBJECT_PROTOTYPE = Object.getPrototypeOf(Object);

/**
 * Injector instance used to resolve singletons.
 */
let singletonsInjector: Injector | null = null;

/**
 * Helper to get service class methods.
 */
type GetMethods<T> = {
    [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? K : never;
}[keyof T];

/**
 * Singleton proxy created using the factory method.
 *
 * @see makeSingleton
 */
export type CoreSingletonProxy<Service, Getters extends keyof Service = never> =
    Pick<Service, GetMethods<Service>> &
    Pick<Service, Getters> &
    {
        instance: Service;
        setInstance(instance: Service): void;
    };

/**
 * Set the injector that will be used to resolve instances in the singletons of this module.
 *
 * @param injector Module injector.
 */
export function setSingletonsInjector(injector: Injector): void {
    singletonsInjector = injector;
}

/**
 * Make a singleton proxy for the given injection token.
 *
 * This method will return an object that will proxy method calls to an underlying service instance. Getters will also be proxied,
 * but these need to be configured manually using the `getters` argument. Most of the time, this proxy can be used directly like
 * you would use a service instance. If you need to get the real service instance, it can be accessed through the `instance`
 * property and it can be set with the `setInstance` method.
 *
 * @param injectionToken Injection token used to resolve the service. This is usually the service class if the provider was
 * defined using a class or the string used in the `provide` key if it was defined using an object.
 * @param getters Getter names to proxy.
 * @return Singleton proxy.
 */
export function makeSingleton<Service>(injectionToken: Type<Service> | Type<unknown> | string): CoreSingletonProxy<Service, never>;
export function makeSingleton<Service, Getters extends keyof Service>(
    injectionToken: Type<Service> | Type<unknown> | string,
    getters: Getters[],
): CoreSingletonProxy<Service, Getters>;
export function makeSingleton<Service, Getters extends keyof Service>(
    injectionToken: Type<Service> | Type<unknown> | string,
    getters: Getters[] = [],
): CoreSingletonProxy<Service, Getters> {
    // Define instance manipulation affordances.
    const proxy = {
        setInstance(instance: Service) {
            Object.defineProperty(proxy, 'instance', {
                value: instance,
                configurable: true,
            });
        },
    } as CoreSingletonProxy<Service, Getters>;

    Object.defineProperty(proxy, 'instance', {
        get: () => {
            if (!singletonsInjector) {
                throw new Error('Can\'t resolve a singleton instance without an injector');
            }

            const instance = singletonsInjector.get(injectionToken);

            proxy.setInstance(instance);

            return instance;
        },
        configurable: true,
    });

    // Define method and getter proxies.
    if (isServiceClass(injectionToken)) {
        // Get property descriptors, going all the way up the prototype chain (for services extending other classes).
        let parentPrototype = injectionToken;
        let descriptors: Record<string, PropertyDescriptor> = {};

        do {
            descriptors = {
                ...Object.getOwnPropertyDescriptors(parentPrototype.prototype),
                ...descriptors,
            };

            parentPrototype = Object.getPrototypeOf(parentPrototype);
        } while (parentPrototype !== OBJECT_PROTOTYPE);

        // Don't proxy constructor calls.
        delete descriptors['constructor'];

        // Define method proxies.
        for (const [property, descriptor] of Object.entries(descriptors)) {
            // Skip getters and setters.
            if (descriptor.get || descriptor.set) {
                continue;
            }

            // Define method proxy.
            Object.defineProperty(proxy, property, {
                value: (...args) => proxy.instance[property].call(proxy.instance, ...args),
                configurable: true,
            });
        }

        // Define getter proxies.
        for (const getter of getters) {
            Object.defineProperty(proxy, getter, { get: () => proxy.instance[getter] });
        }
    }

    return proxy;
}

/**
 * Type guard to check if an injection token is a service class.
 *
 * @param injectionToken Injection token.
 * @return Whether the token is a class.
 */
function isServiceClass(injectionToken: Type<unknown> | string): injectionToken is Type<unknown> {
    return typeof injectionToken !== 'string';
}

// Convert ionic-native services to singleton.
export const Badge = makeSingleton(BadgeService);
export const Chooser = makeSingleton(ChooserService);
export const Clipboard = makeSingleton(ClipboardService);
export const Diagnostic = makeSingleton(DiagnosticService, ['permissionStatus']);
export const File = makeSingleton(FileService, ['documentsDirectory', 'externalApplicationStorageDirectory']);
export const FileOpener = makeSingleton(FileOpenerService);
export const FileTransfer = makeSingleton(FileTransferService);
export const Geolocation = makeSingleton(GeolocationService);
export const InAppBrowser = makeSingleton(InAppBrowserService);
export const Keyboard = makeSingleton(KeyboardService);
export const LocalNotifications = makeSingleton(LocalNotificationsService);
export const Media = makeSingleton(MediaService);
export const MediaCapture = makeSingleton(MediaCaptureService);
export const NativeHttp = makeSingleton(HTTP);
export const Network = makeSingleton(NetworkService, ['Connection', 'type']);
export const Push = makeSingleton(PushService);
export const QRScanner = makeSingleton(QRScannerService);
export const StatusBar = makeSingleton(StatusBarService);
export const SplashScreen = makeSingleton(SplashScreenService);
export const SQLite = makeSingleton(SQLiteService);
export const WebIntent = makeSingleton(WebIntentService, ['ACTION_VIEW']);
export const WebView = makeSingleton(WebViewService);
export const Zip = makeSingleton(ZipService);

export const Camera = makeSingleton(CameraService, [
    'DestinationType',
    'Direction',
    'EncodingType',
    'MediaType',
    'PictureSourceType',
    'PopoverArrowDirection',
]);

export const Device = makeSingleton(DeviceService, [
    'cordova',
    'isVirtual',
    'manufacturer',
    'model',
    'platform',
    'serial',
    'uuid',
    'version',
]);

// Convert some Angular and Ionic injectables to singletons.
export const NgZone = makeSingleton(NgZoneService);
export const Http = makeSingleton(HttpClient);
export const Platform = makeSingleton(PlatformService, ['isRTL', 'resume']);
export const ActionSheetController = makeSingleton(ActionSheetControllerService);
export const AlertController = makeSingleton(AlertControllerService);
export const LoadingController = makeSingleton(LoadingControllerService);
export const ModalController = makeSingleton(ModalControllerService);
export const PopoverController = makeSingleton(PopoverControllerService);
export const ToastController = makeSingleton(ToastControllerService);
export const GestureController = makeSingleton(GestureControllerService);
export const ApplicationInit = makeSingleton(ApplicationInitStatus, ['donePromise']);
export const Application = makeSingleton(ApplicationRef);
export const NavController = makeSingleton(NavControllerService);
export const Router = makeSingleton(RouterService, ['routerState', 'url']);

// Convert external libraries injectables.
export const Translate = makeSingleton(TranslateService, ['onLangChange', 'translations']);
