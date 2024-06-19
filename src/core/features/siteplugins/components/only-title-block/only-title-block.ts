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

import { OnInit, Component } from '@angular/core';
import { Md5 } from 'ts-md5';

import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreSitePlugins, CoreSitePluginsUserHandlerData } from '@features/siteplugins/services/siteplugins';
import { CoreNavigator } from '@services/navigator';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render blocks with only a title and link.
 */
@Component({
    selector: 'core-siteplugins-only-title-block',
    templateUrl: 'core-siteplugins-only-title-block.html',
    styles: [':host { display: contents; }'],
    standalone: true,
    imports: [CoreSharedModule],
})
export class CoreSitePluginsOnlyTitleBlockComponent extends CoreBlockBaseComponent implements OnInit {

    constructor() {
        super('CoreSitePluginsOnlyTitleBlockComponent');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.fetchContentDefaultError = `Error getting ${this.block.contents?.title || 'block'} data.`;
    }

    /**
     * Go to the block page.
     */
    gotoBlock(): void {
        const handlerName = CoreBlockDelegate.getHandlerName(this.block.name);
        const handler = CoreSitePlugins.getSitePluginHandler(handlerName);

        if (!handler) {
            return;
        }

        const args = {
            contextlevel: this.contextLevel,
            instanceid: this.instanceId,
        };
        const hash = Md5.hashAsciiStr(JSON.stringify(args));

        CoreNavigator.navigateToSitePath(
            `siteplugins/content/${handler.plugin.component}/${handler.handlerSchema.method}/${hash}`,
            {
                params: {
                    title: this.title,
                    args,
                    initResult: handler.initResult,
                    ptrEnabled: (<CoreSitePluginsUserHandlerData> handler.handlerSchema).ptrenabled,
                    contextLevel: 'block',
                    contextInstanceId: this.instanceId,
                    handlerName,
                },
            },
        );
    }

}
