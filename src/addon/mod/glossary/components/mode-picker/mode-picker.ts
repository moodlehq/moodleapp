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
 * Component to display the mode picker.
 */
@Component({
    selector: 'addon-mod-glossary-mode-picker-popover',
    templateUrl: 'addon-mod-glossary-mode-picker.html'
})
export class AddonModGlossaryModePickerPopoverComponent {
    modes = [];
    selectedMode: string;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.selectedMode = navParams.get('selectedMode');
        const glossary = navParams.get('glossary');

        // Preparing browse modes.
        this.modes = [
            {key: 'search', langkey: 'addon.mod_glossary.bysearch'}
        ];
        glossary.browsemodes.forEach((mode) => {
            switch (mode) {
                case 'letter' :
                    this.modes.push({key: 'letter_all', langkey: 'addon.mod_glossary.byalphabet'});
                    break;
                case 'cat' :
                    this.modes.push({key: 'cat_all', langkey: 'addon.mod_glossary.bycategory'});
                    break;
                case 'date' :
                    this.modes.push({key: 'newest_first', langkey: 'addon.mod_glossary.bynewestfirst'});
                    this.modes.push({key: 'recently_updated', langkey: 'addon.mod_glossary.byrecentlyupdated'});
                    break;
                case 'author' :
                    this.modes.push({key: 'author_all', langkey: 'addon.mod_glossary.byauthor'});
                    break;
                default:
            }
        });
    }

    /**
     * Function called when a mode is clicked.
     *
     * @param {Event} event Click event.
     * @param {string} key Clicked mode key.
     * @return {boolean} Return true if success, false if error.
     */
    modePicked(event: Event, key: string): boolean {
        this.viewCtrl.dismiss(key);

        return true;
    }
}
