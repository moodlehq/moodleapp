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
import { CorePlatform } from '@services/platform';
import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';

/**
 * Native plugin manager.
 */
@Injectable({ providedIn: 'root' })
export class CoreNativeService {

    private plugins: Partial<Record<keyof MoodleAppPlugins, AsyncInstance<unknown>>> = {};

    /**
     * Get a native plugin instance.
     *
     * @param plugin Plugin name.
     * @returns Plugin instance.
     */
    plugin<Plugin extends keyof MoodleAppPlugins>(plugin: Plugin): AsyncInstance<MoodleAppPlugins[Plugin]> | null {
        if (!CorePlatform.isAndroid()) {
            return null;
        }

        if (!(plugin in this.plugins)) {
            this.plugins[plugin] = asyncInstance(async () => {
                await CorePlatform.ready();

                return window.cordova?.MoodleApp?.[plugin];
            });
        }

        return this.plugins[plugin] as AsyncInstance<MoodleAppPlugins[Plugin]>;
    }

}

export const CoreNative = makeSingleton(CoreNativeService);
