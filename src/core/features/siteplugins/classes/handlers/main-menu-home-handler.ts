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

import { CoreMainMenuHomeHandler, CoreMainMenuHomeHandlerData } from '@features/mainmenu/services/home-delegate';
import {
    CoreSitePluginsContent,
    CoreSitePluginsMainMenuHomeHandlerData,
    CoreSitePluginsPlugin,
} from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a site plugin in the main menu.
 */
export class CoreSitePluginsMainMenuHomeHandler extends CoreSitePluginsBaseHandler implements CoreMainMenuHomeHandler {

    priority: number;

    constructor(
        name: string,
        protected title: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsMainMenuHomeHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.priority = handlerSchema.priority || 0;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHomeHandlerData {
        return {
            title: this.title,
            class: this.handlerSchema.displaydata?.class,
            page: `siteplugins/homecontent/${this.plugin.component}/${this.handlerSchema.method}`,
            pageParams: {
                title: this.title,
                initResult: this.initResult,
                ptrEnabled: this.handlerSchema.ptrenabled,
            },
        };
    }

}
