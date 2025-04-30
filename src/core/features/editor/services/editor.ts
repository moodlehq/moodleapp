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

import { Injectable, Type } from '@angular/core';
import { makeSingleton } from '@singletons';
import { CoreEditorBaseComponent } from '@features/editor/classes/base-editor-component';

/**
 * Service with features regarding the rich text editor.
 */
@Injectable({ providedIn: 'root' })
export class CoreEditorServiceProvider {

    /**
     * Returns the component of the editor implementation.
     *
     * @returns Promise that resolves with the component class.
     */
    async getEditorComponentClass(): Promise<Type<CoreEditorBaseComponent>> {
        const module = await import('@/core/features/editor/components/classic-editor/classic-editor');

        return module.CoreEditorClassicEditorComponent;
    }

    /**
     * Returns the component to include in the general page of the app settings.
     *
     * @returns Promise that resolves with the component class or undefined.
     */
    async getSettingsComponentClass(): Promise<Type<unknown> | undefined> {
        return undefined;
    }

}

export const CoreEditorService = makeSingleton(CoreEditorServiceProvider);
