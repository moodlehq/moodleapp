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

import { Injector, OnInit, Component, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreBlockDelegate } from '@core/block/providers/delegate';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Component to render blocks with only a title and link.
 */
@Component({
    selector: 'core-siteplugins-only-title-block',
    templateUrl: 'core-siteplugins-only-title-block.html'
})
export class CoreSitePluginsOnlyTitleBlockComponent  extends CoreBlockBaseComponent implements OnInit {

    constructor(injector: Injector, protected sitePluginsProvider: CoreSitePluginsProvider,
            protected blockDelegate: CoreBlockDelegate, private navCtrl: NavController,
            @Optional() private svComponent: CoreSplitViewComponent) {

        super(injector, 'CoreSitePluginsOnlyTitleBlockComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.fetchContentDefaultError = 'Error getting ' + this.block.contents.title + ' data.';
    }

    /**
     * Go to the block page.
     */
    gotoBlock(): void {
        const handlerName = this.blockDelegate.getHandlerName(this.block.name);
        const handler = this.sitePluginsProvider.getSitePluginHandler(handlerName);

        if (handler) {
            const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;

            navCtrl.push('CoreSitePluginsPluginPage', {
                title: this.title,
                component: handler.plugin.component,
                method: handler.handlerSchema.method,
                initResult: handler.initResult,
                args: {
                    contextlevel: this.contextLevel,
                    instanceid: this.instanceId,
                },
            });
        }
    }
}
