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
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { conditionalRoutes } from '@/app/app-routing.module';
import { discussionRoute } from '@addons/messages/messages-lazy.module';
import { CoreScreen } from '@services/screen';

import { CoreSharedModule } from '@/core/shared.module';

import { AddonMessagesContactsPage } from './contacts.page';

const routes: Routes = [
    {
        matcher: segments => {
            const matches = CoreScreen.instance.isMobile ? segments.length === 0 : true;

            return matches ? { consumed: [] } : null;
        },
        component: AddonMessagesContactsPage,
        children: conditionalRoutes([
            {
                path: '',
                pathMatch: 'full',
            },
            discussionRoute,
        ], () => CoreScreen.instance.isTablet),
    },
    ...conditionalRoutes([discussionRoute], () => CoreScreen.instance.isMobile),
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        CoreSharedModule,
    ],
    declarations: [
        AddonMessagesContactsPage,
    ],
    exports: [RouterModule],
})
export class AddonMessagesContactsPageModule {}
