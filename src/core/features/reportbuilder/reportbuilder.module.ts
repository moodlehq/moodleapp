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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CoreReportBuilderLinkHandler } from './services/handlers/reportbuilder-link';
import { CoreReportBuilderHandler, CoreReportBuilderHandlerService } from './services/handlers/reportbuilder';

const routes: Routes = [
    {
        path: CoreReportBuilderHandlerService.PAGE_NAME,
        loadChildren: () => import('./reportbuilder-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreUserDelegate.registerHandler(CoreReportBuilderHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreReportBuilderLinkHandler.instance);
            },
        },
    ],
})
export class CoreReportBuilderModule {}
