// (C) Copyright 2015 Martin Dougiamas
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
import { IonicPageModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CoreDirectivesModule } from '@directives/directives.module';
import { CoreComponentsModule } from '@components/components.module';
import { AddonModFeedbackComponentsModule } from '../../components/components.module';
import { AddonModFeedbackNonRespondentsPage } from './nonrespondents';

@NgModule({
    declarations: [
        AddonModFeedbackNonRespondentsPage,
    ],
    imports: [
        CoreDirectivesModule,
        CoreComponentsModule,
        AddonModFeedbackComponentsModule,
        IonicPageModule.forChild(AddonModFeedbackNonRespondentsPage),
        TranslateModule.forChild()
    ],
})
export class AddonModFeedbackNonRespondentsPageModule {}
