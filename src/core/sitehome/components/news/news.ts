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

import { Component, OnInit } from '@angular/core';
import { CoreSitesProvider } from '../../../../providers/sites';

/**
 * Component that displays site home news.
 */
@Component({
    selector: 'core-sitehome-news',
    templateUrl: 'news.html',
})
export class CoreSiteHomeNewsComponent implements OnInit {
    module: any;
    show: boolean;
    siteHomeId: number;

    constructor(private sitesProvider: CoreSitesProvider) {
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        // Get number of news items to show.
        const newsItems = this.sitesProvider.getCurrentSite().getStoredConfig('newsitems') || 0;
        if (!newsItems) {
            return;
        }

        // @todo: Implement it once forum is supported.
        // $mmaModForum = $mmAddonManager.get('$mmaModForum');
        // if ($mmaModForum) {
        //     return $mmaModForum.getCourseForums(courseId).then(function(forums) {
        //         for (var x in forums) {
        //             if (forums[x].type == 'news') {
        //                 return forums[x];
        //             }
        //         }
        //     }).then(function(forum) {
        //         if (forum) {
        //             return $mmCourse.getModuleBasicInfo(forum.cmid).then(function(module) {
        //                 scope.show = true;
        //                 scope.module = module;
        //                 scope.module._controller =
        //                     $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseId,
        //                         module.section);
        //             });
        //         }
        //     });
        // }
    }
}
