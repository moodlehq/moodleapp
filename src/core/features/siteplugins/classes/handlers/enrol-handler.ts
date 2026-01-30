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

import { CoreLogger } from '@static/logger';
import { CoreSitePluginsBaseHandler } from './base-handler';
import {
    CoreEnrolAction,
    CoreEnrolCanAccessData,
    CoreEnrolHandler,
    CoreEnrolInfoIcon,
} from '@features/enrol/services/enrol-delegate';
import { CoreSitePluginsContent, CoreSitePluginsEnrolHandlerData } from '@features/siteplugins/services/siteplugins';

/**
 * Handler to support a enrol using a site plugin.
 */
export class CoreSitePluginsEnrolHandler extends CoreSitePluginsBaseHandler implements CoreEnrolHandler {

    protected logger: CoreLogger;

    constructor(
        name: string,
        public type: string,
        public enrolmentAction: CoreEnrolAction,
        protected handlerSchema: CoreSitePluginsEnrolHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.logger = CoreLogger.getInstance('CoreSitePluginsEnrolHandler');
    }

    /**
     * @inheritdoc
     */
    async getInfoIcons(): Promise<CoreEnrolInfoIcon[]> {
        return this.handlerSchema.infoIcons ?? [];
    }

    /**
     * @inheritdoc
     */
    async invalidate(): Promise<void> {
        // To be overridden.
    }

    /**
     * @inheritdoc
     */
    async enrol(): Promise<boolean> {
        // To be overridden.
        return false;
    }

    /**
     * @inheritdoc
     */
    async canAccess(): Promise<CoreEnrolCanAccessData> {
        // To be overridden.
        return { canAccess: false };
    }

    /**
     * @inheritdoc
     */
    async validateAccess(): Promise<boolean> {
        // To be overridden.
        return false;
    }

}
