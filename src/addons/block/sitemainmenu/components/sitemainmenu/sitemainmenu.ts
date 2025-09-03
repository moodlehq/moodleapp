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

import { Component, OnInit, signal } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreCourse, sectionContentIsModule } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleComponent } from '@features/course/components/module/module';

/**
 * Component to render a site main menu block.
 */
@Component({
    selector: 'addon-block-sitemainmenu',
    templateUrl: 'addon-block-sitemainmenu.html',
    imports: [
        CoreSharedModule,
        CoreCourseModuleComponent,
    ],
})
export class AddonBlockSiteMainMenuComponent extends CoreBlockBaseComponent implements OnInit {

    readonly mainMenuBlock = signal<CoreCourseSection | undefined>(undefined);
    readonly siteHomeId = signal(CoreSites.getCurrentSiteHomeId());
    readonly isModule = sectionContentIsModule;

    protected fetchContentDefaultError = 'Error getting main menu data.';

    /**
     * @inheritdoc
     */
    async invalidateContent(): Promise<void> {
        const siteHomeId = this.siteHomeId();
        const mainMenuBlock = this.mainMenuBlock();

        const promises: Promise<void>[] = [];

        promises.push(CoreCourse.invalidateSections(siteHomeId));
        promises.push(CoreSiteHome.invalidateNewsForum(siteHomeId));

        if (mainMenuBlock?.contents.length) {
            // Invalidate modules prefetch data.
            promises.push(CoreCourseModulePrefetchDelegate.invalidateModules(
                CoreCourse.getSectionsModules([mainMenuBlock]),
                siteHomeId,
            ));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        const siteHomeId = this.siteHomeId();
        const sections = await CoreCourse.getSections(siteHomeId, false, true);

        const mainMenuBlock = sections.find((section) => section.section === 0);
        if (!mainMenuBlock) {
            return;
        }

        const result = await CoreCourseHelper.addHandlerDataForModules(
            [mainMenuBlock],
            siteHomeId,
            undefined,
            undefined,
            true,
        );

        this.mainMenuBlock.set(result.sections[0]);
    }

}
