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
import { AddonModAssignSubmissionOnlineTextHandler } from './services/handler';
import { AddonModAssignSubmissionOnlineTextComponent } from './component/onlinetext';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModAssignSubmissionDelegate } from '../../services/submission-delegate';

@NgModule({
    imports: [
        CoreSharedModule,
        CoreEditorComponentsModule,
        AddonModAssignSubmissionOnlineTextComponent,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                AddonModAssignSubmissionDelegate.registerHandler(AddonModAssignSubmissionOnlineTextHandler.instance);
            },
        },
    ],
    exports: [
        AddonModAssignSubmissionOnlineTextComponent,
    ],
})
export class AddonModAssignSubmissionOnlineTextModule {}
