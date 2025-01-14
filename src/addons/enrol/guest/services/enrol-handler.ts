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
import {
    CoreEnrolAction,
    CoreEnrolCanAccessData,
    CoreEnrolGuestHandler,
    CoreEnrolInfoIcon,
} from '@features/enrol/services/enrol-delegate';
import { makeSingleton } from '@singletons';
import { AddonEnrolGuest } from './guest';
import { CorePasswordModalResponse } from '@components/password-modal/password-modal';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreEnrol, CoreEnrolEnrolmentMethod } from '@features/enrol/services/enrol';
import { CorePrompts } from '@services/overlays/prompts';

/**
 * Enrol handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonEnrolGuestHandlerService implements CoreEnrolGuestHandler {

    name = 'AddonEnrolGuest';
    type = 'guest';
    enrolmentAction = <CoreEnrolAction.GUEST> CoreEnrolAction.GUEST;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async getInfoIcons(courseId: number): Promise<CoreEnrolInfoIcon[]> {
        const guestEnrolments = await CoreEnrol.getSupportedCourseEnrolmentMethods(courseId, { type: this.type });

        for (const guestEnrolment of guestEnrolments) {
            const info = await AddonEnrolGuest.getGuestEnrolmentInfo(guestEnrolment.id);
            // Don't allow guest access if it requires a password if not supported.
            if (!info.passwordrequired) {
                return [{
                    label: 'addon.enrol_guest.guestaccess_withoutpassword',
                    icon: 'fas-unlock',
                }];
            } else {
                return [{
                    label: 'addon.enrol_guest.guestaccess_withpassword',
                    icon: 'fas-key',
                }];
            }
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    async canAccess(method: CoreEnrolEnrolmentMethod): Promise<CoreEnrolCanAccessData> {
        const info = await AddonEnrolGuest.getGuestEnrolmentInfo(method.id);

        return {
            canAccess: info.status && (!info.passwordrequired || AddonEnrolGuest.isValidateGuestAccessPasswordAvailable()),
            requiresUserInput: info.passwordrequired,
        };
    }

    /**
     * @inheritdoc
     */
    async validateAccess(method: CoreEnrolEnrolmentMethod): Promise<boolean> {
        const info = await AddonEnrolGuest.getGuestEnrolmentInfo(method.id);

        if (!info.status) {
            return false;
        }

        if (!info.passwordrequired) {
            return true;
        }

        if (!AddonEnrolGuest.isValidateGuestAccessPasswordAvailable()) {
            return false;
        }

        const validatePassword = async (password = ''): Promise<CorePasswordModalResponse> => {
            const modal = await CoreLoadings.show('core.loading', true);

            try {
                const response = await AddonEnrolGuest.validateGuestAccessPassword(method.id, password);

                let error = response.hint;
                if (!response.validated && !error) {
                    error = 'addon.enrol_guest.passwordinvalid';
                }

                return {
                    password, validated: response.validated, error,
                };
            } finally {
                modal.dismiss();
            }
        };

        try {
            const response = await CorePrompts.promptPassword<CorePasswordModalResponse>({
                title: method.name,
                validator: validatePassword,
            });

            if (!response.validated) {
                return false;
            }
        } catch (error) {
            if (error instanceof CoreWSError) {
                throw error;
            }

            // Cancelled, return
            return false;
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    async invalidate(method: CoreEnrolEnrolmentMethod): Promise<void> {
        return AddonEnrolGuest.invalidateGuestEnrolmentInfo(method.id);
    }

}

export const AddonEnrolGuestHandler = makeSingleton(AddonEnrolGuestHandlerService);
