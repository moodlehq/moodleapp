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
import { AddonQtypeCalculatedModule } from './calculated/calculated.module';
import { AddonQtypeCalculatedMultiModule } from './calculatedmulti/calculatedmulti.module';
import { AddonQtypeCalculatedSimpleModule } from './calculatedsimple/calculatedsimple.module';
import { AddonQtypeDdImageOrTextModule } from './ddimageortext/ddimageortext.module';
import { AddonQtypeDdMarkerModule } from './ddmarker/ddmarker.module';
import { AddonQtypeDdwtosModule } from './ddwtos/ddwtos.module';
import { AddonQtypeDescriptionModule } from './description/description.module';
import { AddonQtypeEssayModule } from './essay/essay.module';
import { AddonQtypeGapSelectModule } from './gapselect/gapselect.module';
import { AddonQtypeMatchModule } from './match/match.module';
import { AddonQtypeMultiAnswerModule } from './multianswer/multianswer.module';
import { AddonQtypeMultichoiceModule } from './multichoice/multichoice.module';
import { AddonQtypeNumericalModule } from './numerical/numerical.module';
import { AddonQtypeRandomSaMatchModule } from './randomsamatch/randomsamatch.module';
import { AddonQtypeShortAnswerModule } from './shortanswer/shortanswer.module';
import { AddonQtypeTrueFalseModule } from './truefalse/truefalse.module';

@NgModule({
    declarations: [],
    imports: [
        AddonQtypeCalculatedModule,
        AddonQtypeCalculatedMultiModule,
        AddonQtypeCalculatedSimpleModule,
        AddonQtypeDdImageOrTextModule,
        AddonQtypeDdMarkerModule,
        AddonQtypeDdwtosModule,
        AddonQtypeDescriptionModule,
        AddonQtypeEssayModule,
        AddonQtypeGapSelectModule,
        AddonQtypeMatchModule,
        AddonQtypeMultiAnswerModule,
        AddonQtypeMultichoiceModule,
        AddonQtypeNumericalModule,
        AddonQtypeRandomSaMatchModule,
        AddonQtypeShortAnswerModule,
        AddonQtypeTrueFalseModule
    ],
    providers: [
    ],
    exports: []
})
export class AddonQtypeModule { }
