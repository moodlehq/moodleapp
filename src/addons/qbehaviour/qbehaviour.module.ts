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

import { AddonQbehaviourAdaptiveModule } from './adaptive/adaptive.module';
import { AddonQbehaviourAdaptiveNoPenaltyModule } from './adaptivenopenalty/adaptivenopenalty.module';
import { AddonQbehaviourDeferredCBMModule } from './deferredcbm/deferredcbm.module';
import { AddonQbehaviourDeferredFeedbackModule } from './deferredfeedback/deferredfeedback.module';
import { AddonQbehaviourImmediateCBMModule } from './immediatecbm/immediatecbm.module';
import { AddonQbehaviourImmediateFeedbackModule } from './immediatefeedback/immediatefeedback.module';
import { AddonQbehaviourInformationItemModule } from './informationitem/informationitem.module';
import { AddonQbehaviourInteractiveCountbackModule } from './interactivecountback/interactivecountback.module';
import { AddonQbehaviourInteractiveModule } from './interactive/interactive.module';
import { AddonQbehaviourManualGradedModule } from './manualgraded/manualgraded.module';

@NgModule({
    imports: [
        AddonQbehaviourAdaptiveModule,
        AddonQbehaviourAdaptiveNoPenaltyModule,
        AddonQbehaviourDeferredCBMModule,
        AddonQbehaviourDeferredFeedbackModule,
        AddonQbehaviourImmediateCBMModule,
        AddonQbehaviourImmediateFeedbackModule,
        AddonQbehaviourInformationItemModule,
        AddonQbehaviourInteractiveCountbackModule,
        AddonQbehaviourInteractiveModule,
        AddonQbehaviourManualGradedModule,
    ],
})
export class AddonQbehaviourModule {}
