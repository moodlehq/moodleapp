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

import { CoreSharedModule } from '@/core/shared.module';
import { NgModule } from '@angular/core';
import { CoreRemindersDateComponent } from './date/date';
import { CoreRemindersSetButtonComponent } from './set-button/set-button';
import { CoreRemindersSetReminderCustomComponent } from './set-reminder-custom/set-reminder-custom';
import { CoreRemindersSetReminderMenuComponent } from './set-reminder-menu/set-reminder-menu';

@NgModule({
    declarations: [
        CoreRemindersDateComponent,
        CoreRemindersSetButtonComponent,
        CoreRemindersSetReminderCustomComponent,
        CoreRemindersSetReminderMenuComponent,
    ],
    imports: [
        CoreSharedModule,
    ],
    exports: [
        CoreRemindersDateComponent,
        CoreRemindersSetButtonComponent,
        CoreRemindersSetReminderCustomComponent,
        CoreRemindersSetReminderMenuComponent,
    ],
})
export class CoreRemindersComponentsModule {}
