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
import { makeSingleton } from '@singletons';

/**
 * Service that stores error logs in memory.
 */
@Injectable({ providedIn: 'root' })
export class CoreErrorLogsService {

    protected errorLogs: CoreSettingsErrorLog[] = [];

    /**
     * Retrieve error logs displayed in the DOM.
     *
     * @returns Error logs
     */
    getErrorLogs(): CoreSettingsErrorLog[] {
        return this.errorLogs;
    }

    /**
     * Add an error to error logs list.
     *
     * @param error Error.
     */
    addErrorLog(error: CoreSettingsErrorLog): void {
        this.errorLogs.push(error);
    }

}

export const CoreErrorLogs = makeSingleton(CoreErrorLogsService);

export type CoreSettingsErrorLog = {
    data?: unknown;
    message: string;
    method?: string;
    time: number;
    type: string;
};
