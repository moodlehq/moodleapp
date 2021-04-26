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

import { AddonFilterActivityNamesModule } from './activitynames/activitynames.module';
import { AddonFilterAlgebraModule } from './algebra/algebra.module';
import { AddonFilterCensorModule } from './censor/censor.module';
import { AddonFilterDataModule } from './data/data.module';
import { AddonFilterDisplayH5PModule } from './displayh5p/displayh5p.module';
import { AddonFilterEmailProtectModule } from './emailprotect/emailprotect.module';
import { AddonFilterEmoticonModule } from './emoticon/emoticon.module';
import { AddonFilterGlossaryModule } from './glossary/glossary.module';
import { AddonFilterMathJaxLoaderModule } from './mathjaxloader/mathjaxloader.module';
import { AddonFilterMediaPluginModule } from './mediaplugin/mediaplugin.module';
import { AddonFilterMultilangModule } from './multilang/multilang.module';
import { AddonFilterTexModule } from './tex/tex.module';
import { AddonFilterTidyModule } from './tidy/tidy.module';
import { AddonFilterUrlToLinkModule } from './urltolink/urltolink.module';

@NgModule({
    imports: [
        AddonFilterActivityNamesModule,
        AddonFilterAlgebraModule,
        AddonFilterCensorModule,
        AddonFilterDataModule,
        AddonFilterDisplayH5PModule,
        AddonFilterEmailProtectModule,
        AddonFilterEmoticonModule,
        AddonFilterGlossaryModule,
        AddonFilterMathJaxLoaderModule,
        AddonFilterMediaPluginModule,
        AddonFilterMultilangModule,
        AddonFilterTexModule,
        AddonFilterTidyModule,
        AddonFilterUrlToLinkModule,
    ],
})
export class AddonFilterModule { }
