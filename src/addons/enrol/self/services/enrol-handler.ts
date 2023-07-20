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
import { CoreEnrolAction, CoreEnrolSelfHandler, CoreEnrolInfoIcon } from '@features/enrol/services/enrol-delegate';
import { Translate, makeSingleton } from '@singletons';
import { AddonEnrolSelf } from './self';
import { CorePasswordModalResponse } from '@components/password-modal/password-modal';
import { CoreCoursesProvider } from '@features/courses/services/courses';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEnrol, CoreEnrolEnrolmentMethod } from '@features/enrol/services/enrol';

/**
 * Enrol handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonEnrolSelfHandlerService implements CoreEnrolSelfHandler {

    name = 'AddonEnrolSelf';
    type = 'self';
    enrolmentAction = <CoreEnrolAction.SELF> CoreEnrolAction.SELF;

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
        const selfEnrolments = await CoreEnrol.getSupportedCourseEnrolmentMethods(courseId, { type: this.type });
        let passwordRequired = false;
        let noPasswordRequired = false;

        for (const selfEnrolment of selfEnrolments) {
            const info = await AddonEnrolSelf.getSelfEnrolmentInfo(selfEnrolment.id);
            // Don't allow self access if it requires a password if not supported.
            if (!info.enrolpassword) {
                noPasswordRequired = true;
            } else {
                passwordRequired = true;
            }
            if (noPasswordRequired && passwordRequired) {
                break;
            }
        }

        const icons: CoreEnrolInfoIcon[] = [];
        if (noPasswordRequired) {
            icons.push({
                label: 'addon.enrol_self.pluginname',
                icon: 'fas-right-to-bracket',
            });
        }

        if (passwordRequired) {
            icons.push({
                label: 'addon.enrol_self.pluginname',
                icon: 'fas-key',
            });
        }

        return icons;
    }

    /**
     * @inheritdoc
     */
    async enrol(method: CoreEnrolEnrolmentMethod): Promise<boolean> {
        const info = await AddonEnrolSelf.getSelfEnrolmentInfo(method.id);
        // Don't allow self access if it requires a password if not supported.
        if (!info.enrolpassword) {
            try {
                await CoreDomUtils.showConfirm(
                    Translate.instant('addon.enrol_self.confirmselfenrol') + '<br>' +
                    Translate.instant('addon.enrol_self.nopassword'),
                    method.name,
                );
            } catch {
                // User cancelled.
                return false;
            }
        }

        try {
            return await this.performEnrol(method);
        } catch {
            return false;
        }
    }

    /**
     * Self enrol in a course.
     *
     * @param method Enrolment method
     * @returns Promise resolved when self enrolled.
     */
    protected async performEnrol(method: CoreEnrolEnrolmentMethod): Promise<boolean> {
        const validatePassword = async (password = ''): Promise<CorePasswordModalResponse> => {
            const modal = await CoreDomUtils.showModalLoading('core.loading', true);

            const response: CorePasswordModalResponse = {
                password,
            };

            try {
                response.validated = await AddonEnrolSelf.selfEnrol(method.courseid, password, method.id);
            } catch (error) {
                if (error && error.errorcode === CoreCoursesProvider.ENROL_INVALID_KEY) {
                    response.validated = false;
                    response.error = error.message;
                } else {
                    CoreDomUtils.showErrorModalDefault(error, 'addon.enrol_self.errorselfenrol', true);

                    throw error;
                }
            } finally {
                modal.dismiss();
            }

            return response;
        };

        let response: CorePasswordModalResponse | undefined;

        try {
            response = await validatePassword();
        } catch {
            return false;
        }

        if (!response.validated) {
            try {
                const response = await CoreDomUtils.promptPassword({
                    validator: validatePassword,
                    title: method.name,
                    placeholder: 'addon.enrol_self.password',
                    submit: 'core.courses.enrolme',
                });

                if (!response.validated) {
                    return false;
                }
            } catch {
                // Cancelled, return
                return false;
            }
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    async invalidate(method: CoreEnrolEnrolmentMethod): Promise<void> {
        return AddonEnrolSelf.invalidateSelfEnrolmentInfo(method.id);
    }

}

export const AddonEnrolSelfHandler = makeSingleton(AddonEnrolSelfHandlerService);
