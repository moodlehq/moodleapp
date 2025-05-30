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
 * Get block services.
 *
 * @returns Block services.
 */
export async function getBlockServices(): Promise<Type<unknown>[]> {
    const { CoreBlockDelegateService } = await import('@features/block/services/block-delegate');
    const { CoreBlockHelperProvider } = await import('@features/block/services/block-helper');

    return [
        CoreBlockDelegateService,
        CoreBlockHelperProvider,
    ];
}

/**
 * Get directives and components for site plugins.
 *
 * @returns Returns directives and components.
 */
export async function getBlockExportedDirectives(): Promise<Type<unknown>[]> {
    const { CoreBlockComponent } = await import('@features/block/components/block/block');
    const { CoreBlockSideBlocksButtonComponent } = await import('@features/block/components/side-blocks-button/side-blocks-button');

    return [
        CoreBlockComponent,
        CoreBlockSideBlocksButtonComponent,
    ];
}

@NgModule({})
export class CoreBlockModule {}
