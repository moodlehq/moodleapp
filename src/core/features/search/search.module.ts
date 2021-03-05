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

import { NgModule, Type } from '@angular/core';

import { CORE_SITE_SCHEMAS } from '@services/sites';

import { CoreSearchComponentsModule } from './components/components.module';
import { SITE_SCHEMA } from './services/search-history-db';
import { CoreSearchHistoryProvider } from './services/search-history.service';

export const CORE_SEARCH_SERVICES: Type<unknown>[] = [
    CoreSearchHistoryProvider,
];

@NgModule({
    imports: [
        CoreSearchComponentsModule,
    ],
    providers: [
        { provide: CORE_SITE_SCHEMAS, useValue: [SITE_SCHEMA], multi: true },
    ],
})
export class CoreSearchModule {}
