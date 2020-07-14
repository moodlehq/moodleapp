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

import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a site plugin in the main menu.
 */
export class CoreSitePluginsMainMenuHandler extends CoreSitePluginsBaseHandler implements CoreMainMenuHandler {
    priority: number;

    constructor(name: string, protected title: string, protected plugin: any, protected handlerSchema: any,
            protected initResult: any) {
        super(name);

        this.priority = handlerSchema.priority;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            title: this.title,
            icon: this.handlerSchema.displaydata.icon,
            class: this.handlerSchema.displaydata.class,
            page: 'CoreSitePluginsPluginPage',
            pageParams: {
                title: this.title,
                component: this.plugin.component,
                method: this.handlerSchema.method,
                initResult: this.initResult,
                ptrEnabled: this.handlerSchema.ptrenabled,
            },
            onlyInMore: true
        };
    }
}
