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

import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';

import { ModuleRoutesConfig } from '@/app/app-routing.module';

export const ADDON_MESSAGES_CONTACTS_ROUTES = new InjectionToken('ADDON_MESSAGES_CONTACTS_ROUTES');

@NgModule()
export class AddonMessagesContactsRoutingModule {

    static forChild(routes: ModuleRoutesConfig): ModuleWithProviders<AddonMessagesContactsRoutingModule> {
        return {
            ngModule: AddonMessagesContactsRoutingModule,
            providers: [
                { provide: ADDON_MESSAGES_CONTACTS_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
