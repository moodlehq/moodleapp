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
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreSiteHomeProvider } from '../../providers/sitehome';

/**
 * Component that displays site home news.
 */
@Component({
    selector: 'core-sitehome-news',
    templateUrl: 'core-sitehome-news.html',
})
export class CoreSiteHomeNewsComponent implements OnInit {
    module: any;
    show: boolean;
    siteHomeId: number;

    constructor(private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private moduleDelegate: CoreCourseModuleDelegate, private siteHomeProvider: CoreSiteHomeProvider) {
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Get number of news items to show.
        const currentSite = this.sitesProvider.getCurrentSite(),
            newsItems = currentSite.getStoredConfig('newsitems') || 0;
        if (!newsItems) {
            return;
        }

        const siteHomeId = currentSite.getSiteHomeId();

        // Get the news forum.
        this.siteHomeProvider.getNewsForum(siteHomeId).then((forum) => {
            return this.courseProvider.getModuleBasicInfo(forum.cmid).then((module) => {
                this.show = true;
                this.module = module;
                module.handlerData = this.moduleDelegate.getModuleDataFor(module.modname, module, siteHomeId, module.section, true);
            });
        }).catch(() => {
            // Ignore errors.
        });
    }
}
