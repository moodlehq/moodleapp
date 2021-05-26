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

import { Component, OnChanges, ViewChild } from '@angular/core';

import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreSitePlugins, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';

/**
 * Component that displays the index of a course format site plugin.
 */
@Component({
    selector: 'core-site-plugins-block',
    templateUrl: 'core-siteplugins-block.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsBlockComponent extends CoreBlockBaseComponent implements OnChanges {

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;

    constructor() {
        super('CoreSitePluginsBlockComponent');
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(): void {
        if (this.component) {
            return;
        }

        // Initialize the data.
        const handlerName = CoreBlockDelegate.getHandlerName(this.block.name);
        const handler = CoreSitePlugins.getSitePluginHandler(handlerName);
        if (!handler) {
            return;
        }

        this.component = handler.plugin.component;
        this.method = handler.handlerSchema.method;
        this.args = {
            contextlevel: this.contextLevel,
            instanceid: this.instanceId,
            blockid: this.block.instanceid,
        };
        this.initResult = handler.initResult;
    }

    /**
     * Invalidate block data.
     *
     * @return Promise resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        if (!this.component || !this.method) {
            return;
        }

        return CoreSitePlugins.invalidateContent(this.component, this.method, this.args);
    }

}
