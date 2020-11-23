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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonRefresher } from '@ionic/angular';

import { CoreSite, CoreSiteConfig } from '@classes/site';
import { CoreCourse, CoreCourseSection } from '@features/course/services/course';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
// import { CoreCourseHelperProvider } from '@features/course/services/helper';

/**
 * Page that displays site home index.
 */
@Component({
    selector: 'page-core-sitehome-index',
    templateUrl: 'index.html',
})
export class CoreSiteHomeIndexPage implements OnInit {

    // @todo @Input() downloadEnabled: boolean;
    // @todo  @ViewChild(CoreBlockCourseBlocksComponent) courseBlocksComponent: CoreBlockCourseBlocksComponent;

    dataLoaded = false;
    section?: CoreCourseSection & {
        hasContent?: boolean;
    };

    hasContent = false;
    items: string[] = [];
    siteHomeId?: number;
    currentSite?: CoreSite;

    constructor(
        protected route: ActivatedRoute,
        // @todo private prefetchDelegate: CoreCourseModulePrefetchDelegate,
    ) {

    }

    /**
     * Page being initialized.
     */
    ngOnInit(): void {
        const navParams = this.route.snapshot.queryParams;

        this.currentSite = CoreSites.instance.getCurrentSite()!;
        this.siteHomeId = this.currentSite.getSiteHomeId();

        const module = navParams['module'];
        if (module) {
            // @todo const modParams = navParams.get('modParams');
            // courseHelper.openModule(module, this.siteHomeId, undefined, modParams);
        }

        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return Promise resolved when done.
     */
    protected async loadContent(): Promise<void> {
        this.hasContent = false;

        const config = this.currentSite!.getStoredConfig() || { numsections: 1, frontpageloggedin: undefined };

        this.items = await CoreSiteHome.instance.getFrontPageItems(config.frontpageloggedin);
        this.hasContent = this.items.length > 0;

        try {
            const sections = await CoreCourse.instance.getSections(this.siteHomeId!, false, true);

            // Check "Include a topic section" setting from numsections.
            this.section = config.numsections ? sections.find((section) => section.section == 1) : undefined;
            if (this.section) {
                this.section.hasContent = false;
                /* @todo this.section.hasContent = this.courseHelper.sectionHasContent(this.section);
                this.hasContent = this.courseHelper.addHandlerDataForModules(
                    [this.section],
                    this.siteHomeId,
                    undefined,
                    undefined,
                    true,
                ) || this.hasContent;*/
            }

            // Add log in Moodle.
            CoreCourse.instance.logView(
                this.siteHomeId!,
                undefined,
                undefined,
                this.currentSite!.getInfo()?.sitename,
            ).catch(() => {
                // Ignore errors.
            });
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher?: CustomEvent<IonRefresher>): void {
        const promises: Promise<unknown>[] = [];

        promises.push(CoreCourse.instance.invalidateSections(this.siteHomeId!));
        promises.push(this.currentSite!.invalidateConfig().then(async () => {
            // Config invalidated, fetch it again.
            const config: CoreSiteConfig = await this.currentSite!.getConfig();
            this.currentSite!.setConfig(config);

            return;
        }));

        if (this.section && this.section.modules) {
            // Invalidate modules prefetch data.
            //  @todo promises.push(this.prefetchDelegate.invalidateModules(this.section.modules, this.siteHomeId));
        }

        // @todo promises.push(this.courseBlocksComponent.invalidateBlocks());

        Promise.all(promises).finally(async () => {
            const p2: Promise<unknown>[] = [];

            p2.push(this.loadContent());
            // @todo  p2.push(this.courseBlocksComponent.loadContent());

            await Promise.all(p2).finally(() => {
                refresher?.detail.complete();
            });
        });
    }

}
