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
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { CoreComponentsModule } from '@/app/components/components.module';
import { CoreDirectivesModule } from '@/app/directives/directives.module';

import { CoreLoginRoutingModule } from './login-routing.module';
import { CoreLoginCredentialsPage } from './pages/credentials/credentials.page';
import { CoreLoginInitPage } from './pages/init/init.page';
import { CoreLoginSitePage } from './pages/site/site.page';
import { CoreLoginSitesPage } from './pages/sites/sites.page';
import { CoreLoginHelperProvider } from './services/helper';

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        CoreLoginRoutingModule,
        CoreComponentsModule,
        TranslateModule.forChild(),
        FormsModule,
        ReactiveFormsModule,
        CoreComponentsModule,
        CoreDirectivesModule,
    ],
    declarations: [
        CoreLoginCredentialsPage,
        CoreLoginInitPage,
        CoreLoginSitePage,
        CoreLoginSitesPage,
    ],
    providers: [
        CoreLoginHelperProvider,
    ],
})
export class CoreLoginModule {}
