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

import { Provider } from '@angular/core';
import { CORE_SITE_SCHEMAS } from '@services/sites';

import { SITE_SCHEMA as FILEPOOL_SITE_SCHEMA } from './filepool';
import { SITE_SCHEMA as SITES_SITE_SCHEMA } from './sites';
import { SITE_SCHEMA as SYNC_SITE_SCHEMA } from './sync';
import { SITE_SCHEMA as STORAGE_SITE_SCHEMA } from './storage';

/**
 * Give database providers.
 *
 * @returns database providers
 */
export function getDatabaseProviders(): Provider[] {
    return [{
        provide: CORE_SITE_SCHEMAS,
        useValue: [
            FILEPOOL_SITE_SCHEMA,
            SITES_SITE_SCHEMA,
            SYNC_SITE_SCHEMA,
            STORAGE_SITE_SCHEMA,
        ],
        multi: true,
    }];
}
