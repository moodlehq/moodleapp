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
import { Push as IonicPush } from '@awesome-cordova-plugins/push/ngx';

/**
 * Push plugin wrapper.
 */
@Injectable({ providedIn: 'root' })
export class Push extends IonicPush {

    /**
     * The getPublicKey method is used to retrieve x.509 public key from the device keychain.
     * Returns null if the device doesn't support the encryption methods.
     *
     * @returns Public key or null.
     */
    getPublicKey(): Promise<string | null> {
        return new Promise((resolve, reject) => PushNotification.getPublicKey(resolve, reject));
    }

}
