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

import {
    ApplicationInitStatus,
    ApplicationRef,
    Injector,
    NgZone as NgZoneService,
    EnvironmentInjector,
    ProviderToken,
} from '@angular/core';
import { Router as RouterService } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer as DomSanitizerService } from '@angular/platform-browser';

import {
    AngularDelegate as AngularDelegateService,
    AlertController as AlertControllerService,
    LoadingController as LoadingControllerService,
    ModalController as ModalControllerService,
    ToastController as ToastControllerService,
    GestureController as GestureControllerService,
    ActionSheetController as ActionSheetControllerService,
    NavController as NavControllerService,
    PopoverController as PopoverControllerService,
} from '@ionic/angular';

import { Badge as BadgeService } from '@awesome-cordova-plugins/badge/ngx';
import { Camera as CameraService } from '@awesome-cordova-plugins/camera/ngx';
import { Clipboard as ClipboardService } from '@awesome-cordova-plugins/clipboard/ngx';
import { Device as DeviceService } from '@awesome-cordova-plugins/device/ngx';
import { File as FileService } from '@awesome-cordova-plugins/file/ngx';
import { FileOpener as FileOpenerService } from '@awesome-cordova-plugins/file-opener/ngx';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { InAppBrowser as InAppBrowserService } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { WebView as WebViewService } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { Keyboard as KeyboardService } from '@awesome-cordova-plugins/keyboard/ngx';
import { LocalNotifications as LocalNotificationsService } from '@awesome-cordova-plugins/local-notifications/ngx';
import { MediaCapture as MediaCaptureService } from '@awesome-cordova-plugins/media-capture/ngx';
import { StatusBar as StatusBarService } from '@awesome-cordova-plugins/status-bar/ngx';
import { SplashScreen as SplashScreenService } from '@awesome-cordova-plugins/splash-screen/ngx';
import { SQLite as SQLiteService } from '@awesome-cordova-plugins/sqlite/ngx';
import { WebIntent as WebIntentService } from '@awesome-cordova-plugins/web-intent/ngx';

import { TranslateService } from '@ngx-translate/core';

import { CoreApplicationInitStatus } from '@classes/application-init-status';
import { asyncInstance } from '@/core/utils/async-instance';
import { CorePromisedValue } from '@classes/promised-value';

/**
 * Injector instance used to resolve singletons.
 */
const singletonsInjector = new CorePromisedValue<Injector>();

/**
 * Helper to create a method that proxies calls to the underlying singleton instance.
 *
 * @returns Function.
 */
// eslint-disable-next-line
let createSingletonMethodProxy = (instance: any, method: Function, property: string | number | symbol) => method.bind(instance);

/**
 * Singleton proxy created using the factory method.
 *
 * @see makeSingleton
 */
export type CoreSingletonProxy<Service = unknown> = Service & {
    instance: Service;
    injectionToken: ProviderToken<Service>;
    setInstance(instance: Service): void;
};

/**
 * Set the injector that will be used to resolve instances in the singletons of this module.
 *
 * @param injector Module injector.
 */
export function setSingletonsInjector(injector: Injector): void {
    singletonsInjector.resolve(injector);
}

/**
 * Set the method to create method proxies.
 *
 * @param method Method.
 */
export function setCreateSingletonMethodProxy(method: typeof createSingletonMethodProxy): void {
    createSingletonMethodProxy = method;
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
 * @returns Singleton proxy.
 */
export function makeSingleton<Service extends object = object>(
    injectionToken: ProviderToken<Service>,
): CoreSingletonProxy<Service> {
    const singleton = {
        injectionToken,
        setInstance(instance: Service) {
            Object.defineProperty(singleton, 'instance', {
                value: instance,
                configurable: true,
            });
        },
    } as Pick<CoreSingletonProxy<Service>, 'injectionToken' | 'instance' | 'setInstance'>;

    Object.defineProperty(singleton, 'instance', {
        get: () => {
            const injector = singletonsInjector.value;

            if (!injector) {
                throw new Error('Can\'t resolve a singleton instance without an injector');
            }

            const instance = injector.get(injectionToken);

            singleton.setInstance(instance);

            return instance;
        },
        configurable: true,
    });

    return new Proxy(singleton, {
        get(target, property, receiver) {
            if (property in target) {
                return Reflect.get(target, property, receiver);
            }

            const value = target.instance[property];

            return typeof value === 'function'
                ? createSingletonMethodProxy(target.instance, value, property)
                : value;
        },
        set(target, property, value, receiver) {
            Reflect.set(target.instance, property, value, receiver);

            return true;
        },
    }) as CoreSingletonProxy<Service>;
}

// Convert ionic-native services to singleton.
export const Badge = makeSingleton(BadgeService);
export const Clipboard = makeSingleton(ClipboardService);
export const File = makeSingleton(FileService);
export const FileOpener = makeSingleton(FileOpenerService);
export const InAppBrowser = makeSingleton(InAppBrowserService);
export const Keyboard = makeSingleton(KeyboardService);
export const LocalNotifications = makeSingleton(LocalNotificationsService);
export const MediaCapture = makeSingleton(MediaCaptureService);
export const NativeHttp = makeSingleton(HTTP);
export const StatusBar = makeSingleton(StatusBarService);
export const SplashScreen = makeSingleton(SplashScreenService);
export const SQLite = makeSingleton(SQLiteService);
export const WebIntent = makeSingleton(WebIntentService);
export const WebView = makeSingleton(WebViewService);

export const Camera = makeSingleton(CameraService);

export const Device = makeSingleton(DeviceService);

// Convert some Angular and Ionic injectables to singletons.
export const NgZone = makeSingleton(NgZoneService);
export const Http = makeSingleton(HttpClient);
export const ActionSheetController = makeSingleton(ActionSheetControllerService);
export const AngularDelegate = makeSingleton(AngularDelegateService);
export const AlertController = makeSingleton(AlertControllerService);
export const LoadingController = makeSingleton(LoadingControllerService);
export const ModalController = makeSingleton(ModalControllerService);
export const PopoverController = makeSingleton(PopoverControllerService);
export const ToastController = makeSingleton(ToastControllerService);
export const GestureController = makeSingleton(GestureControllerService);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ApplicationInit = makeSingleton<CoreApplicationInitStatus>(ApplicationInitStatus as any);
export const Application = makeSingleton(ApplicationRef);
export const NavController = makeSingleton(NavControllerService);
export const Router = makeSingleton(RouterService);
export const DomSanitizer = makeSingleton(DomSanitizerService);

// Convert external libraries injectables.
export const Translate: Omit<CoreSingletonProxy<TranslateService>, 'instant'> & {
    instant(keys: string[]): string[];
    instant(key: string, interpolateParams?: Record<string, unknown>): string;
} = makeSingleton(TranslateService);

// Async singletons.
export const AngularFrameworkDelegate = asyncInstance(async () => {
    const injector = await singletonsInjector;

    return AngularDelegate.create(injector.get(EnvironmentInjector), injector);
});
