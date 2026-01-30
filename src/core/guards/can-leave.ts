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

import { CanDeactivateFn } from '@angular/router';
import { CorePromiseUtils } from '@static/promise-utils';

/**
 * Check if a component implements the canLeave interface.
 *
 * @param component Component instance to check.
 * @returns Whether it implements CanLeave interface.
 */
const isCanLeave = (component: unknown | null): component is CanLeave =>
    component !== null && 'canLeave' in <CanLeave> component;

/**
 * Guard to check if the user can leave a page.
 *
 * @returns True if user has sites, redirect route otherwise.
 */
export const canLeaveGuard: CanDeactivateFn<unknown> = async (component: unknown) => {
    if (!isCanLeave(component)) {
        return true;
    }

    return CorePromiseUtils.ignoreErrors(component.canLeave(), false);
};

export interface CanLeave {
    /**
     * Check whether the user can leave the current route.
     *
     * @returns Promise resolved with true if can leave, resolved with false or rejected if cannot leave.
     */
    canLeave: () => Promise<boolean>;
}
