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

export type InvalidateCacheListener = () => unknown;

/**
 * Application caches manager.
 */
@Injectable({ providedIn: 'root' })
export class CoreCacheManagerService {

    protected invalidateListeners: InvalidateCacheListener[] = [];

    /**
     * Register a listener to call when cache is invalidated.
     *
     * @param listener Listener.
     */
    registerInvalidateListener(listener: InvalidateCacheListener): void {
        this.invalidateListeners.push(listener);
    }

    /**
     * Invalidate cache.
     */
    async invalidate(): Promise<void> {
        await Promise.all(this.invalidateListeners.map(listener => listener()));
    }

}

export const CoreCacheManager = makeSingleton(CoreCacheManagerService);
