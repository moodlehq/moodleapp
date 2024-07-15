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
 * Get content links services.
 *
 * @returns Content links services.
 */
export async function getContentLinksServices(): Promise<Type<unknown>[]> {
    const { CoreContentLinksDelegateService } = await import('@features/contentlinks/services/contentlinks-delegate');
    const { CoreContentLinksHelperProvider } = await import('@features/contentlinks/services/contentlinks-helper');

    return [
        CoreContentLinksDelegateService,
        CoreContentLinksHelperProvider,
    ];
}

/**
 * Get content links exported objects.
 *
 * @returns Content links exported objects.
 */
export async function getContentLinksExportedObjects(): Promise<Record<string, unknown>> {
    const { CoreContentLinksHandlerBase } = await import ('@features/contentlinks/classes/base-handler');
    const { CoreContentLinksModuleGradeHandler } = await import ('@features/contentlinks/classes/module-grade-handler');
    const { CoreContentLinksModuleIndexHandler } = await import ('@features/contentlinks/classes/module-index-handler');

    /* eslint-disable @typescript-eslint/naming-convention */
    return {
        CoreContentLinksHandlerBase,
        CoreContentLinksModuleGradeHandler,
        CoreContentLinksModuleIndexHandler,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}

@NgModule({
})
export class CoreContentLinksModule {}
