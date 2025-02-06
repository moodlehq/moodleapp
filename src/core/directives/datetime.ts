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

import { Directive, OnInit } from '@angular/core';
import { CoreLang } from '@services/lang';
import { CoreUser } from '@features/user/services/user';
import { IonDatetime } from '@ionic/angular';

/**
 * Directive to automatically add language and starting week day to ion-datetime.
 */
@Directive({
    selector: 'ion-datetime',
    standalone: true,
})
export class CoreIonDatetimeDirective implements OnInit {

    constructor(protected datetime: IonDatetime) {}

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.setLanguage();
        this.setStartingWeekDay();
    }

    /**
     * Set language to use.
     */
    protected async setLanguage(): Promise<void> {
        if (this.datetime.locale) {
            return;
        }

        const language = await CoreLang.getCurrentLanguage();
        this.datetime.locale = language;
    }

    /**
     * Set starting week day.
     */
    protected async setStartingWeekDay(): Promise<void> {
        if (this.datetime.firstDayOfWeek || this.datetime.firstDayOfWeek === 0) {
            return;
        }

        const startingDay = await CoreUser.getStartingWeekDay();
        this.datetime.firstDayOfWeek = startingDay;
    }

}
