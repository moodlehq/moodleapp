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

import { AddonMessageOutputHandler, AddonMessageOutputHandlerData } from '@addons/messageoutput/services/messageoutput-delegate';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsMessageOutputHandlerData,
    CoreSitePluginsPlugin,
} from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a message output settings option.
 */
export class CoreSitePluginsMessageOutputHandler extends CoreSitePluginsBaseHandler implements AddonMessageOutputHandler {

    constructor(
        name: string,
        public processorName: string,
        protected title: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsMessageOutputHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): AddonMessageOutputHandlerData {
        const handlerName = CoreSitePlugins.getHandlerNameFromUniqueName(this.name, this.plugin.addon);

        return {
            priority: this.handlerSchema.priority || 0,
            label: this.title,
            icon: this.handlerSchema.displaydata?.icon || 'fas-question',
            page: `siteplugins/content/${this.plugin.component}/${this.handlerSchema.method}/0`,
            pageParams: {
                title: this.title,
                initResult: this.initResult,
                ptrEnabled: this.handlerSchema.ptrenabled,
                handlerName,
            },
        };
    }

}
