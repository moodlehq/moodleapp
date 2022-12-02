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
import { CanDeactivate } from '@angular/router';
import { CoreUtils } from '@services/utils/utils';

@Injectable({ providedIn: 'root' })
export class CanLeaveGuard implements CanDeactivate<unknown> {

    async canDeactivate(component: unknown | null): Promise<boolean> {
        if (!this.isCanLeave(component)) {
            return true;
        }

        return CoreUtils.ignoreErrors(component.canLeave(), false);
    }

    isCanLeave(component: unknown | null): component is CanLeave {
        return component !== null && 'canLeave' in <CanLeave> component;
    }

}

export interface CanLeave {
    /**
     * Check whether the user can leave the current route.
     *
     * @returns Promise resolved with true if can leave, resolved with false or rejected if cannot leave.
     */
    canLeave: () => Promise<boolean>;
}
