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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { CoreFilter } from '@features/filter/services/filter';
import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreBaseModule } from '@/core/base.module';

/**
 * Component to display a site selector. It will display a select with the list of sites. If the selected site changes,
 * an output will be emitted with the site ID.
 *
 * Example usage:
 * <core-site-picker (siteSelected)="changeSite($event)"></core-site-picker>
 */
@Component({
    selector: 'core-site-picker',
    templateUrl: 'core-site-picker.html',
    standalone: true,
    imports: [CoreBaseModule],
})
export class CoreSitePickerComponent implements OnInit {

    @Input() initialSite?: string; // Initial site. If not provided, current site.
    @Output() siteSelected = new EventEmitter<string>(); // Emit an event when a site is selected. Sends the siteId as parameter.

    selectedSite?: string;
    sites?: SiteInfo[];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.selectedSite = this.initialSite || CoreSites.getCurrentSiteId();

        // Load the sites.
        const sites = await CoreSites.getSites();

        if (!this.selectedSite && sites.length) {
            // There is no current site, select the first one.
            this.selectedSite = sites[0].id;
            this.siteSelected.emit(this.selectedSite);
        }

        await Promise.all(sites.map(async (site: SiteInfo) => {
            // Format the site name.
            const options = { clean: true, singleLine: true, filter: false };
            const siteName = await CorePromiseUtils.ignoreErrors(
                CoreFilter.formatText(site.siteName || '', options, [], site.id),
                site.siteName || '',
            );

            site.fullNameAndSiteName = Translate.instant(
                'core.fullnameandsitename',
                { fullname: site.fullname, sitename: siteName },
            );
        }));

        this.sites = sites;
    }

}

type SiteInfo = CoreSiteBasicInfo & {
    fullNameAndSiteName?: string;
};
