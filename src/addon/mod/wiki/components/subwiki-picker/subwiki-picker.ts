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

import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';

/**
 * Component to display the a list of subwikis in a wiki.
 */
@Component({
    selector: 'addon-mod-wiki-subwiki-picker',
    templateUrl: 'addon-mod-wiki-subwiki-picker.html'
})
export class AddonModWikiSubwikiPickerComponent {
    subwikis: any[];
    currentSubwiki: any;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.subwikis = navParams.get('subwikis');
        this.currentSubwiki = navParams.get('currentSubwiki');
    }

    /**
     * Checks if the given subwiki is the one currently selected.
     *
     * @param {any} subwiki Subwiki to check.
     * @return {boolean} Whether it's the selected subwiki.
     */
    protected isSubwikiSelected(subwiki: any): boolean {
        const subwikiId = parseInt(subwiki.id, 10) || 0;

        if (subwikiId > 0 && this.currentSubwiki.id > 0) {
            return subwikiId == this.currentSubwiki.id;
        }

        const userId = parseInt(subwiki.userid, 10) || 0,
            groupId = parseInt(subwiki.groupid, 10) || 0;

        return userId == this.currentSubwiki.userid && groupId == this.currentSubwiki.groupid;
    }

    /**
     * Function called when a subwiki is clicked.
     *
     * @param {any} subwiki The subwiki to open.
     */
    openSubwiki(subwiki: any): void {
        // Check if the subwiki is disabled.
        if (subwiki.id > 0 || subwiki.canedit) {
            // Check if it isn't current subwiki.
            if (subwiki != this.currentSubwiki) {
                this.viewCtrl.dismiss(subwiki);
            }
        }
    }
}
