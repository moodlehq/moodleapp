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
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
import { TranslateModule } from '@ngx-translate/core';
import { AddonModDataFieldUrlHandler } from './providers/handler';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { AddonModDataFieldUrlComponent } from './component/url';
import { CoreComponentsModule } from '@components/components.module';
import { CoreDirectivesModule } from '@directives/directives.module';

@NgModule({
    declarations: [
        AddonModDataFieldUrlComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        CoreComponentsModule,
        CoreDirectivesModule
    ],
    providers: [
        AddonModDataFieldUrlHandler
    ],
    exports: [
        AddonModDataFieldUrlComponent
    ],
    entryComponents: [
        AddonModDataFieldUrlComponent
    ]
})
export class AddonModDataFieldUrlModule {
    constructor(fieldDelegate: AddonModDataFieldsDelegate, handler: AddonModDataFieldUrlHandler) {
        fieldDelegate.registerHandler(handler);
    }
}
