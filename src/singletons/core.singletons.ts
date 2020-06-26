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

import { AlertController, App } from 'ionic-angular';
import { Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

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

export class Translate extends makeSingleton(TranslateService) {}

export class Alerts extends makeSingleton(AlertController) {}

export class Ionic extends makeSingleton(App) {}

export class Http extends makeSingleton(HttpClient) {}
