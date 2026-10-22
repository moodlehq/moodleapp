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
import { CapacitorZip, type CapacitorZipPlugin } from '@capgo/capacitor-zip';

/**
 * Resolve the native Capacitor Zip implementation.
 *
 * @returns Native Capacitor Zip plugin.
 */
export function resolveCapacitorZip(): CapacitorZipPlugin {
    return CapacitorZip;
}

/**
 * Injection token for the Capacitor Zip instance, allowing browser emulation.
 */
export const CAPACITOR_ZIP = new InjectionToken<CapacitorZipPlugin>('CAPACITOR_ZIP', {
    providedIn: 'root',
    factory: () => resolveCapacitorZip(),
});
