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

import { AddonBlockModule } from './block/block.module';
import { AddonPrivateFilesModule } from './privatefiles/privatefiles.module';
import { AddonFilterModule } from './filter/filter.module';
import { AddonUserProfileFieldModule } from './userprofilefield/userprofilefield.module';
import { AddonBadgesModule } from './badges/badges.module';
import { AddonCalendarModule } from './calendar/calendar.module';
import { AddonNotificationsModule } from './notifications/notifications.module';
import { AddonMessageOutputModule } from './messageoutput/messageoutput.module';
import { AddonMessagesModule } from './messages/messages.module';
import { AddonModModule } from './mod/mod.module';
import { AddonQbehaviourModule } from './qbehaviour/qbehaviour.module';
import { AddonQtypeModule } from './qtype/qtype.module';

@NgModule({
    imports: [
        AddonBlockModule,
        AddonBadgesModule,
        AddonCalendarModule,
        AddonMessagesModule,
        AddonPrivateFilesModule,
        AddonFilterModule,
        AddonUserProfileFieldModule,
        AddonNotificationsModule,
        AddonMessageOutputModule,
        AddonModModule,
        AddonQbehaviourModule,
        AddonQtypeModule,
    ],
})
export class AddonsModule {}
