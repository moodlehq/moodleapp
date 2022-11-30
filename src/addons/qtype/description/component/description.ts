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

import { Component, ElementRef } from '@angular/core';
import { CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';

/**
 * Component to render a description question.
 */
@Component({
    selector: 'addon-qtype-description',
    templateUrl: 'addon-qtype-description.html',
})
export class AddonQtypeDescriptionComponent extends CoreQuestionBaseComponent {

    seenInput?: { name: string; value: string };

    constructor(elementRef: ElementRef) {
        super('AddonQtypeDescriptionComponent', elementRef);
    }

    /**
     * @inheritdoc
     */
    init(): void {
        const questionEl = this.initComponent();
        if (!questionEl) {
            return;
        }

        // Get the "seen" hidden input.
        const input = questionEl.querySelector<HTMLInputElement>('input[type="hidden"][name*=seen]');
        if (!input) {
            return;
        }

        this.seenInput = {
            name: input.name,
            value: input.value,
        };
    }

}
