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

import { Component, Input } from '@angular/core';
import { PopoverController } from '@singletons';
import { AddonModWikiSubwiki, AddonModWikiSubwikiListGrouping } from '../../services/wiki';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to display the a list of subwikis in a wiki.
 */
@Component({
    selector: 'addon-mod-wiki-subwiki-picker',
    templateUrl: 'addon-mod-wiki-subwiki-picker.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModWikiSubwikiPickerComponent {

    @Input() courseId?: number;
    @Input() subwikis: AddonModWikiSubwikiListGrouping[] = [];
    @Input({ required: true }) currentSubwiki!: AddonModWikiSubwiki;

    /**
     * Checks if the given subwiki is the one currently selected.
     *
     * @param subwiki Subwiki to check.
     * @returns Whether it's the selected subwiki.
     */
    isSubwikiSelected(subwiki: AddonModWikiSubwiki): boolean {

        if (subwiki.id > 0 && this.currentSubwiki.id > 0) {
            return subwiki.id === this.currentSubwiki.id;
        }

        return subwiki.userid === this.currentSubwiki.userid && subwiki.groupid === this.currentSubwiki.groupid;
    }

    /**
     * Function called when a subwiki is clicked.
     *
     * @param subwiki The subwiki to open.
     */
    openSubwiki(subwiki: AddonModWikiSubwiki): void {
        // Check if it isn't current subwiki.
        if (subwiki !== this.currentSubwiki) {
            PopoverController.dismiss(subwiki);
        }
    }

}
