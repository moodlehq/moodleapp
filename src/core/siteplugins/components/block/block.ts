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

import { Component, OnChanges, Input, ViewChild, Injector } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';
import { CoreBlockDelegate } from '@core/block/providers/delegate';

/**
 * Component that displays the index of a course format site plugin.
 */
@Component({
    selector: 'core-site-plugins-block',
    templateUrl: 'core-siteplugins-block.html',
})
export class CoreSitePluginsBlockComponent extends CoreBlockBaseComponent implements OnChanges {
    @Input() block: any;
    @Input() contextLevel: string;
    @Input() instanceId: number;

    @ViewChild(CoreSitePluginsPluginContentComponent) content: CoreSitePluginsPluginContentComponent;

    component: string;
    method: string;
    args: any;
    initResult: any;

    constructor(protected injector: Injector, protected sitePluginsProvider: CoreSitePluginsProvider,
                protected blockDelegate: CoreBlockDelegate) {
        super(injector, 'CoreSitePluginsBlockComponent');
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(): void {
        if (!this.component) {
            // Initialize the data.
            const handlerName = this.blockDelegate.getHandlerName(this.block.name);
            const handler = this.sitePluginsProvider.getSitePluginHandler(handlerName);
            if (handler) {
                this.component = handler.plugin.component;
                this.method = handler.handlerSchema.method;
                this.args = {
                    contextlevel: this.contextLevel,
                    instanceid: this.instanceId,
                };
                this.initResult = handler.initResult;
            }
        }
    }

    /**
     * Pass on content invalidation by refreshing content in the plugin content component.
     */
    protected invalidateContent(): Promise<any> {
        return Promise.resolve(this.content.refreshContent());
    }
}
