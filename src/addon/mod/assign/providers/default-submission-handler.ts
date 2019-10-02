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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AddonModAssignBaseSubmissionHandler } from '../classes/base-submission-handler';

/**
 * Default handler used when a submission plugin doesn't have a specific implementation.
 */
@Injectable()
export class AddonModAssignDefaultSubmissionHandler extends AddonModAssignBaseSubmissionHandler {
    name = 'AddonModAssignDefaultSubmissionHandler';
    type = 'default';

    constructor(protected translate: TranslateService) {
        super(translate);
    } // Nothing to do.
}
