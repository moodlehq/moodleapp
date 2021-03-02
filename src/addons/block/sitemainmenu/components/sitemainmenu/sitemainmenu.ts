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

import { Component, OnInit, Input } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreSiteHome, FrontPageItemNames } from '@features/sitehome/services/sitehome';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';

/**
 * Component to render a site main menu block.
 */
@Component({
    selector: 'addon-block-sitemainmenu',
    templateUrl: 'addon-block-sitemainmenu.html',
})
export class AddonBlockSiteMainMenuComponent extends CoreBlockBaseComponent implements OnInit {

    @Input() downloadEnabled = false;

    component = 'AddonBlockSiteMainMenu';
    mainMenuBlock?: CoreCourseSection;
    siteHomeId = 1;

    protected fetchContentDefaultError = 'Error getting main menu data.';

    constructor() {
        super('AddonBlockSiteMainMenuComponent');
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();

        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourse.invalidateSections(this.siteHomeId));
        promises.push(CoreSiteHome.invalidateNewsForum(this.siteHomeId));

        if (this.mainMenuBlock && this.mainMenuBlock.modules) {
            // Invalidate modules prefetch data.
            promises.push(CoreCourseModulePrefetchDelegate.invalidateModules(this.mainMenuBlock.modules, this.siteHomeId));
        }

        await Promise.all(promises);
    }

    /**
     * Fetch the data to render the block.
     *
     * @return Promise resolved when done.
     */
    protected async fetchContent(): Promise<void> {
        const sections = await CoreCourse.getSections(this.siteHomeId, false, true);

        const mainMenuBlock = sections.find((section) => section.section == 0);
        if (!mainMenuBlock) {
            return;
        }

        const currentSite = CoreSites.getCurrentSite();
        const config = currentSite ? currentSite.getStoredConfig() || {} : {};
        if (!config.frontpageloggedin) {
            return;
        }
        // Check if Site Home displays announcements. If so, remove it from the main menu block.
        const items = config.frontpageloggedin.split(',');
        const hasNewsItem = items.find((item) => parseInt(item, 10) == FrontPageItemNames['NEWS_ITEMS']);

        const result = CoreCourseHelper.addHandlerDataForModules(
            [mainMenuBlock],
            this.siteHomeId,
            undefined,
            undefined,
            true,
        );

        this.mainMenuBlock = result.sections[0];

        if (!hasNewsItem || !this.mainMenuBlock.hasContent) {
            return;
        }

        // Remove forum activity (news one only) from the main menu block to prevent duplicates.
        try {
            const forum = await CoreSiteHome.getNewsForum(this.siteHomeId);
            // Search the module that belongs to site news.
            const forumIndex =
                this.mainMenuBlock.modules.findIndex((mod) => mod.modname == 'forum' && mod.instance == forum.id);

            if (forumIndex >= 0) {
                this.mainMenuBlock.modules.splice(forumIndex, 1);
            }
        } catch {
            // Ignore errors.
        }
    }

}
