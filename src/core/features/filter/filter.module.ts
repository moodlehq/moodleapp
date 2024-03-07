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

/**
 * Get filter services.
 *
 * @returns Returns filter services.
 */
export async function getFilterServices(): Promise<Type<unknown>[]> {
    const { CoreFilterProvider } = await import('@features/filter/services/filter');
    const { CoreFilterDelegateService } = await import('@features/filter/services/filter-delegate');
    const { CoreFilterHelperProvider } = await import('@features/filter/services/filter-helper');

    return [
        CoreFilterProvider,
        CoreFilterDelegateService,
        CoreFilterHelperProvider,
    ];
}

@NgModule({})
export class CoreFilterModule {}
