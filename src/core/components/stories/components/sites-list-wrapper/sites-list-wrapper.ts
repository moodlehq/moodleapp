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

import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CoreAccountsList, CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSiteBasicInfo } from '@services/sites';

@Component({
    selector: 'core-sites-list-wrapper',
    templateUrl: 'sites-list-wrapper.html',
})
export class CoreSitesListWrapperComponent implements OnInit, OnChanges {

    @Input() sitesClickable = false;
    @Input() currentSiteClickableSelect = 'undefined';
    @Input() extraText: 'text' | 'badge' | 'none' = 'none';
    @Input() extraDetails: 'delete-button' | 'badge' | 'none' = 'none';

    accountsList?: CoreAccountsList;
    currentSiteClickable?: boolean;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.accountsList = await CoreLoginHelper.getAccountsList();
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes.currentSiteClickableSelect) {
            this.currentSiteClickable = this.currentSiteClickableSelect === 'undefined' ?
                undefined :
                this.currentSiteClickableSelect === 'true';
        }
    }

    /**
     * Site clicked.
     *
     * @param site Site.
     */
    siteClicked(site: CoreSiteBasicInfo): void {
        alert(`clicked on ${site.id} - ${site.fullname}`);
    }

}
