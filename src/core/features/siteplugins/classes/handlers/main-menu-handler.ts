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
    CoreMainMenuComponentHandlerData,
    CoreMainMenuHandler,
    CoreMainMenuPageNavHandlerData,
} from '@features/mainmenu/services/mainmenu-delegate';
import {
    CoreSitePluginsContent,
    CoreSitePluginsMainMenuHandlerData,
    CoreSitePluginsPlugin,
} from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreSitePluginsMoreItemComponent } from '@features/siteplugins/components/more-item/more-item';

/**
 * Handler to display a site plugin in the main menu.
 */
export class CoreSitePluginsMainMenuHandler extends CoreSitePluginsBaseHandler implements CoreMainMenuHandler {

    priority: number;

    constructor(
        name: string,
        protected title: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsMainMenuHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.priority = handlerSchema.priority || 0;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuPageNavHandlerData | CoreMainMenuComponentHandlerData {
        if (this.handlerSchema.displayinline) {
            return {
                component: CoreSitePluginsMoreItemComponent,
                componentData: {
                    component: this.plugin.component,
                    method: this.handlerSchema.method,
                    initResult: this.initResult,
                },
            };
        }

        return {
            title: this.title,
            icon: this.handlerSchema.displaydata?.icon || 'fas-question',
            class: this.handlerSchema.displaydata?.class,
            page: `siteplugins/content/${this.plugin.component}/${this.handlerSchema.method}/0`,
            pageParams: {
                title: this.title,
                initResult: this.initResult,
                ptrEnabled: this.handlerSchema.ptrenabled,
            },
            onlyInMore: true,
        };
    }

}
