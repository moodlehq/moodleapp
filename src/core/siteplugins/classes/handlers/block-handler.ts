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

import { Injector } from '@angular/core';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreBlockHandler, CoreBlockHandlerData } from '@core/block/providers/delegate';
import { CoreBlockPreRenderedComponent } from '@core/block/components/pre-rendered-block/pre-rendered-block';
import { CoreSitePluginsBlockComponent } from '@core/siteplugins/components/block/block';
import { CoreSitePluginsOnlyTitleBlockComponent } from '@core/siteplugins/components/only-title-block/only-title-block';

/**
 * Handler to support a block using a site plugin.
 */
export class CoreSitePluginsBlockHandler extends CoreSitePluginsBaseHandler implements CoreBlockHandler {

    constructor(name: string, public title: string, public blockName: string, protected handlerSchema: any,
            protected initResult: any) {
        super(name);
    }

    /**
     * Gets display data for this block. The class and title can be provided either by data from
     * the handler schema (mobile.php) or using default values.
     *
     * @param injector Injector
     * @param block Block data
     * @param contextLevel Context level (not used)
     * @param instanceId Instance id (not used)
     * @return Data or promise resolved with the data
     */
    getDisplayData(injector: Injector, block: any, contextLevel: string, instanceId: number):
            CoreBlockHandlerData | Promise<CoreBlockHandlerData> {
        let className,
            component;

        if (this.handlerSchema.displaydata && this.handlerSchema.displaydata.class) {
            className = this.handlerSchema.displaydata.class;
        } else {
            className = 'block_' + block.name;
        }

        if (this.handlerSchema.displaydata && this.handlerSchema.displaydata.type == 'title') {
            component = CoreSitePluginsOnlyTitleBlockComponent;
        } else if (this.handlerSchema.displaydata && this.handlerSchema.displaydata.type == 'prerendered') {
            component = CoreBlockPreRenderedComponent;
        } else {
            component = CoreSitePluginsBlockComponent;
        }

        return {
            title: this.title,
            class: className,
            component: component
        };
    }
}
