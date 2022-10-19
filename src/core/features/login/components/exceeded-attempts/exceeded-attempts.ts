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

import { Component, Input, OnInit } from '@angular/core';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserSupport } from '@features/user/services/support';

@Component({
    selector: 'core-login-exceeded-attempts',
    templateUrl: 'exceeded-attempts.html',
    styleUrls: ['./exceeded-attempts.scss'],
})
export class CoreLoginExceededAttemptsComponent implements OnInit {

    @Input() supportConfig!: CoreUserSupportConfig;
    @Input() supportSubject?: string;

    canContactSupport = false;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.canContactSupport = this.supportConfig.canContactSupport();
    }

    /**
     * Contact site support.
     */
    async contactSupport(): Promise<void> {
        await CoreUserSupport.contact({
            supportConfig: this.supportConfig,
            subject: this.supportSubject,
        });
    }

}
