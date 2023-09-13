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
import { CoreEnrolAction, CoreEnrolDelegate, CoreEnrolInfoIcon } from './enrol-delegate';
import { CoreUtils } from '@services/utils/utils';
import { CoreEnrol, CoreEnrolEnrolmentMethod } from './enrol';

/**
 * Service that provides helper functions for enrolment plugins.
 */
@Injectable({ providedIn: 'root' })
export class CoreEnrolHelperService {

    /**
     * Get enrolment icons to show enrol status.
     *
     * @param methodTypes List of enrolment types to show.
     * @param courseId Course Id.
     * @returns Enrolment icons to show.
     */
    async getEnrolmentIcons(methodTypes: string[], courseId: number): Promise<CoreEnrolInfoIcon[]> {
        methodTypes = CoreUtils.uniqueArray(methodTypes);

        let enrolmentIcons: CoreEnrolInfoIcon[] = [];
        let addBrowserOption = false;

        const promises = methodTypes.map(async (type) => {
            const enrolIcons = await CoreEnrolDelegate.getInfoIcons(type, courseId);

            if (enrolIcons.length) {
                enrolmentIcons = enrolmentIcons.concat(enrolIcons);

                return;
            }

            const action = CoreEnrolDelegate.getEnrolmentAction(type);
            addBrowserOption = addBrowserOption || action === CoreEnrolAction.BROWSER;
        });

        await Promise.all(promises);

        if (addBrowserOption) {
            enrolmentIcons.push({
                className: 'enrol_browser',
                label: 'core.courses.otherenrolments',
                icon: 'fas-up-right-from-square',
            });
        }

        if (enrolmentIcons.length == 0) {
            enrolmentIcons.push({
                className: 'enrol_locked',
                label: 'core.courses.notenrollable',
                icon: 'fas-lock',
            });
        }

        return enrolmentIcons;
    }

    /**
     * Get enrolment methods divided by type.
     *
     * @param courseId Course Id.
     * @param allMethodTypes List of enrolment methods returned by getCourseByField.
     * @returns Enrolment info divided by types.
     */
    async getEnrolmentsByType(courseId: number, allMethodTypes?: string[]): Promise<CoreEnrolmentsByType> {
        // Don't use getSupportedCourseEnrolmentMethods to treat unsupported methods and methods with disabled status.
        const enrolmentMethods = await CoreEnrol.getCourseEnrolmentMethods(courseId);

        const self: CoreEnrolEnrolmentMethod[] = [];
        const guest: CoreEnrolEnrolmentMethod[] = [];
        let hasBrowser = false;
        let hasNotSupported = false;

        enrolmentMethods.forEach((method) => {
            if (!CoreUtils.isTrueOrOne(method.status)) {
                return;
            }

            const action = CoreEnrolDelegate.getEnrolmentAction(method.type);

            switch (action) {
                case CoreEnrolAction.SELF:
                    self.push(method);
                    break;
                case CoreEnrolAction.GUEST:
                    guest.push(method);
                    break;
                case CoreEnrolAction.BROWSER:
                    hasBrowser = true;
                    break;
                case CoreEnrolAction.NOT_SUPPORTED:
                    hasNotSupported = true;
                    break;
            }
        });

        // Now treat the methods returned by getCourseByField but not by getCourseEnrolmentMethods.
        allMethodTypes?.forEach(type => {
            if (enrolmentMethods.some(method => method.type === type)) {
                return; // Already treated.
            }

            const action = CoreEnrolDelegate.getEnrolmentAction(type);
            hasBrowser = hasBrowser || action === CoreEnrolAction.BROWSER;
            hasNotSupported = hasNotSupported || action === CoreEnrolAction.NOT_SUPPORTED;
        });

        return {
            self,
            guest,
            hasBrowser,
            hasNotSupported,
        };
    }

}

export const CoreEnrolHelper = makeSingleton(CoreEnrolHelperService);

export type CoreEnrolmentsByType = {
    self: CoreEnrolEnrolmentMethod[];
    guest: CoreEnrolEnrolmentMethod[];
    hasBrowser: boolean;
    hasNotSupported: boolean;
};
