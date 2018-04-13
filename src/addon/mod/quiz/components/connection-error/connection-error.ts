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

import { Component } from '@angular/core';

/**
 * Component that displays a quiz entry page.
 */
@Component({
    selector: 'addon-mod-quiz-connection-error',
    template: '<ion-item text-wrap>{{ "addon.mod_quiz.connectionerror" | translate }}</ion-item>',
})
export class AddonModQuizConnectionErrorComponent {

    constructor() {
        // Nothing to do.
    }
}
