// (C) Copyright 2015 Martin Dougiamas
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

import { Component, OnInit, Injector } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreSiteHomeProvider } from '@core/sitehome/providers/sitehome';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';

/**
 * Component to render a site main menu block.
 */
@Component({
    selector: 'addon-block-sitemainmenu',
    templateUrl: 'addon-block-sitemainmenu.html'
})
export class AddonBlockSiteMainMenuComponent extends CoreBlockBaseComponent implements OnInit {
    block: any;
    siteHomeId: number;

    protected fetchContentDefaultError = 'Error getting main menu data.';

    constructor(injector: Injector, protected sitesProvider: CoreSitesProvider, protected courseProvider: CoreCourseProvider,
            protected courseHelper: CoreCourseHelperProvider, protected siteHomeProvider: CoreSiteHomeProvider,
            protected prefetchDelegate: CoreCourseModulePrefetchDelegate) {

        super(injector, 'AddonBlockSiteMainMenuComponent');

        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.courseProvider.invalidateSections(this.siteHomeId));
        promises.push(this.siteHomeProvider.invalidateNewsForum(this.siteHomeId));

        if (this.block && this.block.modules) {
            // Invalidate modules prefetch data.
            promises.push(this.prefetchDelegate.invalidateModules(this.block.modules, this.siteHomeId));
        }

        return Promise.all(promises);
    }

    /**
     * Fetch the data to render the block.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        return this.courseProvider.getSections(this.siteHomeId, false, true).then((sections) => {
            this.block = sections.find((section) => section.section == 0);

            if (this.block) {
                this.block.hasContent = this.courseHelper.sectionHasContent(this.block);
                this.courseHelper.addHandlerDataForModules([this.block], this.siteHomeId);

                // Check if Site Home displays announcements. If so, remove it from the main menu block.
                const currentSite = this.sitesProvider.getCurrentSite(),
                    config = currentSite ? currentSite.getStoredConfig() || {} : {};
                let hasNewsItem = false;

                if (config.frontpageloggedin) {
                    const items = config.frontpageloggedin.split(',');

                    hasNewsItem = items.find((item) => { return item == '0'; });
                }

                if (hasNewsItem && this.block.modules) {
                    // Remove forum activity (news one only) from the main menu block to prevent duplicates.
                    return this.siteHomeProvider.getNewsForum(this.siteHomeId).then((forum) => {
                        // Search the module that belongs to site news.
                        for (let i = 0; i < this.block.modules.length; i++) {
                            const module = this.block.modules[i];

                            if (module.modname == 'forum' && module.instance == forum.id) {
                                this.block.modules.splice(i, 1);
                                break;
                            }
                        }
                    }).catch(() => {
                        // Ignore errors.
                    });
                }
            }
        });
    }
}
