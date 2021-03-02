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
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsPlugin,
    CoreSitePluginsUserHandlerData,
} from '@features/siteplugins/services/siteplugins';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreUserDelegateService, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreSites } from '@services/sites';
import { CoreUtils, PromiseDefer } from '@services/utils/utils';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a site plugin in the user profile.
 */
export class CoreSitePluginsUserProfileHandler extends CoreSitePluginsBaseHandler implements CoreUserProfileHandler {

    priority: number;
    type: string;

    protected updatingDefer?: PromiseDefer<void>;

    constructor(
        name: string,
        protected title: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsUserHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.priority = handlerSchema.priority || 0;

        // Only support TYPE_COMMUNICATION and TYPE_NEW_PAGE.
        this.type = handlerSchema.type != CoreUserDelegateService.TYPE_COMMUNICATION ?
            CoreUserDelegateService.TYPE_NEW_PAGE : CoreUserDelegateService.TYPE_COMMUNICATION;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(
        user: CoreUserProfile,
        courseId?: number,
    ): Promise<boolean> {
        // First check if it's enabled for the user.
        const enabledForUser = CoreSitePlugins.isHandlerEnabledForUser(
            user.id,
            this.handlerSchema.restricttocurrentuser,
            this.initResult?.restrict,
        );

        if (!enabledForUser) {
            return false;
        }

        courseId = courseId || CoreSites.getCurrentSiteHomeId();

        // Enabled for user, check if it's enabled for the course.
        return CoreSitePlugins.isHandlerEnabledForCourse(
            courseId,
            this.handlerSchema.restricttoenrolledcourses,
            this.initResult?.restrict,
        );
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            title: this.title,
            icon: this.handlerSchema.displaydata?.icon,
            class: this.handlerSchema.displaydata?.class,
            action: (event: Event, user: CoreUserProfile, courseId?: number): void => {
                event.preventDefault();
                event.stopPropagation();

                // @todo navCtrl.push('CoreSitePluginsPluginPage', {
                //     title: this.title,
                //     component: this.plugin.component,
                //     method: this.handlerSchema.method,
                //     args: {
                //         courseid: courseId,
                //         userid: user.id
                //     },
                //     initResult: this.initResult,
                //     ptrEnabled: this.handlerSchema.ptrenabled,
                // });
            },
        };
    }

    /**
     * Set init result.
     *
     * @param result Result to set.
     */
    setInitResult(result: CoreSitePluginsContent | null): void {
        this.initResult = result;

        this.updatingDefer?.resolve();
        delete this.updatingDefer;
    }

    /**
     * Mark init being updated.
     */
    updatingInit(): void {
        this.updatingDefer = CoreUtils.promiseDefer();
    }

}
