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

import { CorePushNotificationsProvider } from '@features/pushnotifications/services/pushnotifications';
import { makeSingleton } from '@singletons';

/**
 * Sites provider stub.
 */
export class CorePushNotificationsProviderStub extends CorePushNotificationsProvider {

    /**
     * @inheritdoc
     */
    async getSiteCounter(): Promise<number> {
        return Math.round(Math.random() * 100);
    }

}

export const CorePushNotificationsStub = makeSingleton<CorePushNotificationsProviderStub>(CorePushNotificationsProvider);
