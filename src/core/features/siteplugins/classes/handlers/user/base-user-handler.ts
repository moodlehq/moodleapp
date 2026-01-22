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

import { CorePromisedValue } from '@classes/promised-value';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsDisplayInUserMenu,
    CoreSitePluginsPlugin,
    CoreSitePluginsUserHandlerData,
} from '@features/siteplugins/services/siteplugins';
import { CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserDelegateContext,
    CoreUserProfileButtonHandlerData,
    CoreUserProfileHandler,
    CoreUserProfileListActionHandlerData,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { Md5 } from 'ts-md5';
import { CoreSitePluginsBaseHandler } from '../base-handler';

/**
 * Handler to display a site plugin in the user profile.
 */
export abstract class CoreSitePluginsBaseUserProfileHandler extends CoreSitePluginsBaseHandler implements
    Partial<CoreUserProfileHandler> {

    priority: number;

    protected updatingDefer?: CorePromisedValue<void>;

    constructor(
        name: string,
        protected title: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsUserHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.priority = handlerSchema.priority || 0;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(context: CoreUserDelegateContext, courseId: number): Promise<boolean> {
        if (this.handlerSchema.displayinusermenu === CoreSitePluginsDisplayInUserMenu.ONLY) {
            return context === CoreUserDelegateContext.USER_MENU;
        }

        if (context === CoreUserDelegateContext.USER_MENU && this.handlerSchema.displayinusermenu !== undefined) {
            return this.handlerSchema.displayinusermenu === CoreSitePluginsDisplayInUserMenu.YES;
        }

        // Check if it's enabled for the course.
        return CoreSitePlugins.isHandlerEnabledForCourse(
            courseId,
            this.handlerSchema.restricttoenrolledcourses,
            this.initResult?.restrict,
        );
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(
        user: CoreUserProfile,
    ): Promise<boolean> {
        return CoreSitePlugins.isHandlerEnabledForUser(
            user.id,
            this.handlerSchema.restricttocurrentuser,
            this.initResult?.restrict,
        );
    }

    /**
     * Get the display data for action handlers.
     *
     * @returns Display data.
     */
    protected getActionDisplayData(): CoreUserProfileButtonHandlerData | CoreUserProfileListActionHandlerData {
        return {
            title: this.title,
            icon: this.handlerSchema.displaydata?.icon,
            class: this.handlerSchema.displaydata?.class,
            action: (event, user, context, contextId): void => {
                event.preventDefault();
                event.stopPropagation();

                const args = {
                    courseid: contextId,
                    userid: user.id,
                };
                const hash = Md5.hashAsciiStr(JSON.stringify(args));

                CoreNavigator.navigateToSitePath(
                    `siteplugins/content/${this.plugin.component}/${this.handlerSchema.method}/${hash}`,
                    {
                        params: {
                            title: this.title,
                            args,
                            initResult: this.initResult,
                            ptrEnabled: this.handlerSchema.ptrenabled,
                            contextLevel: 'user',
                            contextInstanceId: user.id,
                        },
                    },
                );
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
        this.updatingDefer = new CorePromisedValue();
    }

}
