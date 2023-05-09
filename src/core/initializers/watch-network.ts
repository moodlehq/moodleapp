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

import { CoreCronDelegate } from '@services/cron';
import { NgZone } from '@singletons';
import { CoreNetwork } from '@services/network';

/**
 * Initializer function.
 */
export default function(): void {
    // When the app is re-connected, start network handlers that were stopped.
    CoreNetwork.onConnectShouldBeStable().subscribe(() => {
        // Execute the callback in the Angular zone, so change detection doesn't stop working.
        NgZone.run(() => CoreCronDelegate.startNetworkHandlers());
    });
}
