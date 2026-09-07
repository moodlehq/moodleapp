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

import {
    Camera as CapacitorCamera,
    type CameraPlugin,
} from '@capacitor/camera';
import { InjectionToken } from '@angular/core';

/**
 * Resolve the native Capacitor Camera implementation.
 *
 * @returns Native Capacitor Camera plugin.
 */
export function resolveCapacitorCamera(): CameraPlugin {
    return CapacitorCamera;
}

/**
 * Injection token for the Capacitor Camera instance.
 * This basically converts the Capacitor Camera into an Angular injection token so we can provide a Mock if needed.
 */
export const CAPACITOR_CAMERA = new InjectionToken<typeof CapacitorCamera>('CAPACITOR_CAMERA', {
    providedIn: 'root',
    factory: () => resolveCapacitorCamera(),
});
