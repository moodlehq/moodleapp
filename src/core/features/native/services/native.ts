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
import { AsyncInstance, AsyncObject, asyncInstance } from '@/core/utils/async-instance';

/**
 * Native plugin manager.
 */
@Injectable({ providedIn: 'root' })
export class CoreNativeService {

    private plugins: Partial<Record<keyof MoodleAppPlugins, AsyncInstance<AsyncObject>>> = {};
    private mocks: Partial<Record<keyof MoodleAppPlugins, MoodleAppPlugins[keyof MoodleAppPlugins]>> = {};

    /**
     * Get a native plugin instance.
     *
     * @param plugin Plugin name.
     * @returns Plugin instance, null if plugin is not supported for current platform.
     */
    plugin<Plugin extends keyof MoodleAppPlugins>(plugin: Plugin): AsyncInstance<MoodleAppPlugins[Plugin]> | null {
        if (plugin === 'installReferrer' && !CorePlatform.isAndroid()) {
            return null;
        }

        if (!(plugin in this.plugins)) {
            this.plugins[plugin] = asyncInstance(async () => {
                await CorePlatform.ready();

                const instance = CorePlatform.isMobile() ? window.cordova?.MoodleApp?.[plugin] : this.mocks[plugin];
                if (!instance) {
                    throw new Error(`Plugin ${plugin} not found.`);
                }

                return instance;
            });
        }

        return this.plugins[plugin] as AsyncInstance<MoodleAppPlugins[Plugin]>;
    }

    /**
     * Register a mock to use in browser instead of the native plugin implementation.
     *
     * @param plugin Plugin name.
     * @param instance Instance to use.
     */
    registerBrowserMock<Plugin extends keyof MoodleAppPlugins>(plugin: Plugin, instance: MoodleAppPlugins[Plugin]): void {
        this.mocks[plugin] = instance;
    }

}

export const CoreNative = makeSingleton(CoreNativeService);
