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

/**
 * Retains the legacy SQLite service name for site plugins without accessing databases.
 *
 * @deprecated since 6.0. Not used for database access anymore.
 */
@Injectable({ providedIn: 'root' })
export class SQLite {

    /**
     * Reject legacy database creation.
     *
     * @param _config Legacy database configuration.
     * @returns Rejected promise directing callers to CoreDB.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    create(_config: unknown): Promise<never> {
        return Promise.reject(new Error('SQLite.create is no longer supported.'));
    }

    /**
     * Reject the legacy plugin availability check.
     *
     * @returns Rejected promise because the Cordova backend is no longer used.
     */
    echoTest(): Promise<never> {
        return Promise.reject(new Error('SQLite.echoTest is no longer supported.'));
    }

    /**
     * Reject the legacy plugin database test.
     *
     * @returns Rejected promise because the Cordova backend is no longer used.
     */
    selfTest(): Promise<never> {
        return Promise.reject(new Error('SQLite.selfTest is no longer supported.'));
    }

    /**
     * Reject legacy database deletion.
     *
     * @param _config Legacy database configuration.
     * @returns Rejected promise directing callers to CoreDB.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteDatabase(_config: unknown): Promise<never> {
        return Promise.reject(new Error('SQLite.deleteDatabase is no longer supported.'));
    }

}
