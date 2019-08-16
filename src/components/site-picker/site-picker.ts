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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Component to display a site selector. It will display a select with the list of sites. If the selected site changes,
 * an output will be emitted with the site ID.
 *
 * Example usage:
 * <core-site-picker (siteSelected)="changeSite($event)"></core-site-picker>
 */
@Component({
    selector: 'core-site-picker',
    templateUrl: 'core-site-picker.html'
})
export class CoreSitePickerComponent implements OnInit {
    @Input() initialSite?: string; // Initial site. If not provided, current site.
    @Output() siteSelected: EventEmitter<string>; // Emit an event when a site is selected. Sends the siteId as parameter.

    selectedSite: string;
    sites: any[];

    constructor(private translate: TranslateService, private sitesProvider: CoreSitesProvider,
        private textUtils: CoreTextUtilsProvider) {
        this.siteSelected = new EventEmitter();
    }

    ngOnInit(): void {
        this.selectedSite = this.initialSite || this.sitesProvider.getCurrentSiteId();

        // Load the sites.
        this.sitesProvider.getSites().then((sites) => {
            const promises = [];

            sites.forEach((site: any) => {
                // Format the site name.
                promises.push(this.textUtils.formatText(site.siteName, true, true).catch(() => {
                    return site.siteName;
                }).then((formatted) => {
                    site.fullNameAndSiteName = this.translate.instant('core.fullnameandsitename',
                        { fullname: site.fullName, sitename: formatted });
                }));
            });

            if (!this.selectedSite && sites.length) {
                // There is no current site, select the first one.
                this.selectedSite = sites[0].id;
                this.siteSelected.emit(this.selectedSite);
            }

            return Promise.all(promises).then(() => {
                this.sites = sites;
            });
        });
    }

}
