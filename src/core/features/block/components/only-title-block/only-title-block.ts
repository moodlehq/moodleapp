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

import { OnInit, Component } from '@angular/core';
import { CoreBlockBaseComponent } from '../../classes/base-block-component';
import { CoreNavigator } from '@services/navigator';

/**
 * Component to render blocks with only a title and link.
 */
@Component({
    selector: 'core-block-only-title',
    templateUrl: 'core-block-only-title.html',
    styleUrl: 'only-title-block.scss',
})
export class CoreBlockOnlyTitleComponent extends CoreBlockBaseComponent implements OnInit {

    constructor() {
        super('CoreBlockOnlyTitleComponent');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await super.ngOnInit();

        this.fetchContentDefaultError = `Error getting ${this.block.contents?.title} data.`;
    }

    /**
     * Go to the block page.
     */
    gotoBlock(): void {
        if (!this.link) {
            return;
        }

        const navOptions = this.navOptions || {};
        if (this.linkParams) {
            navOptions.params = this.linkParams;
        }

        CoreNavigator.navigateToSitePath(this.link, navOptions);
    }

}
