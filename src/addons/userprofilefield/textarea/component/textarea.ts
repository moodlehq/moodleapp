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

import { Component } from '@angular/core';

import { CoreUserProfileFieldBaseComponent } from '@features/user/classes/base-profilefield-component';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Directive to render a textarea user profile field.
 */
@Component({
    selector: 'addon-user-profile-field-textarea',
    templateUrl: 'addon-user-profile-field-textarea.html',
    imports: [
        CoreSharedModule,
        CoreEditorRichTextEditorComponent,
    ],
})
export class AddonUserProfileFieldTextareaComponent extends CoreUserProfileFieldBaseComponent {}
