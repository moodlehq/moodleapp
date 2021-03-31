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
import { AddonModDataFieldCheckboxModule } from './checkbox/checkbox.module';
import { AddonModDataFieldDateModule } from './date/date.module';
import { AddonModDataFieldFileModule } from './file/file.module';
import { AddonModDataFieldLatlongModule } from './latlong/latlong.module';
import { AddonModDataFieldMenuModule } from './menu/menu.module';
import { AddonModDataFieldMultimenuModule } from './multimenu/multimenu.module';
import { AddonModDataFieldNumberModule } from './number/number.module';
import { AddonModDataFieldPictureModule } from './picture/picture.module';
import { AddonModDataFieldRadiobuttonModule } from './radiobutton/radiobutton.module';
import { AddonModDataFieldTextModule } from './text/text.module';
import { AddonModDataFieldTextareaModule } from './textarea/textarea.module';
import { AddonModDataFieldUrlModule } from './url/url.module';

@NgModule({
    imports: [
        AddonModDataFieldCheckboxModule,
        AddonModDataFieldDateModule,
        AddonModDataFieldFileModule,
        AddonModDataFieldLatlongModule,
        AddonModDataFieldMenuModule,
        AddonModDataFieldMultimenuModule,
        AddonModDataFieldNumberModule,
        AddonModDataFieldPictureModule,
        AddonModDataFieldRadiobuttonModule,
        AddonModDataFieldTextModule,
        AddonModDataFieldTextareaModule,
        AddonModDataFieldUrlModule,
    ],
})
export class AddonModDataFieldModule { }
