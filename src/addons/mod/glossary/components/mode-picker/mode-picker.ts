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

import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@singletons';
import { AddonModGlossaryFetchMode } from '../../classes/glossary-entries-source';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to display the mode picker.
 */
@Component({
    selector: 'addon-mod-glossary-mode-picker-popover',
    templateUrl: 'addon-mod-glossary-mode-picker.html',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModGlossaryModePickerPopoverComponent implements OnInit {

    @Input() browseModes: string[] = [];
    @Input() selectedMode = '';

    modes: { key: AddonModGlossaryFetchMode; langkey: string }[] = [];

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.browseModes.forEach((mode) => {
            switch (mode) {
                case 'letter' :
                    this.modes.push({ key: 'letter_all', langkey: 'addon.mod_glossary.byalphabet' });
                    break;
                case 'cat' :
                    this.modes.push({ key: 'cat_all', langkey: 'addon.mod_glossary.bycategory' });
                    break;
                case 'date' :
                    this.modes.push({ key: 'newest_first', langkey: 'addon.mod_glossary.bynewestfirst' });
                    this.modes.push({ key: 'recently_updated', langkey: 'addon.mod_glossary.byrecentlyupdated' });
                    break;
                case 'author' :
                    this.modes.push({ key: 'author_all', langkey: 'addon.mod_glossary.byauthor' });
                    break;
                default:
            }
        });
    }

    /**
     * Function called when a mode is clicked.
     */
    modePicked(): void {
        PopoverController.dismiss(this.selectedMode);
    }

}
