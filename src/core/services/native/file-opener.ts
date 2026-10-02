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

import { InjectionToken } from '@angular/core';
import { FileOpener, type FileOpenerPlugin } from '@capacitor-community/file-opener';

/**
 * Resolve the native Capacitor File Opener implementation.
 *
 * @returns Native Capacitor File Opener plugin.
 */
export function resolveCapacitorFileOpener(): FileOpenerPlugin {
    return FileOpener;
}

/**
 * Injection token for the Capacitor File Opener instance, allowing browser emulation.
 */
export const CAPACITOR_FILE_OPENER = new InjectionToken<FileOpenerPlugin>('CAPACITOR_FILE_OPENER', {
    providedIn: 'root',
    factory: () => resolveCapacitorFileOpener(),
});
