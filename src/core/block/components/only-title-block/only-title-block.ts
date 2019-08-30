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

import { Injector, OnInit, Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreBlockBaseComponent } from '../../classes/base-block-component';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Component to render blocks with only a title and link.
 */
@Component({
    selector: 'core-block-only-title',
    templateUrl: 'core-block-only-title.html'
})
export class CoreBlockOnlyTitleComponent  extends CoreBlockBaseComponent implements OnInit {

    constructor(injector: Injector, protected navCtrl: NavController, protected linkHelper: CoreContentLinksHelperProvider) {
        super(injector, 'CoreBlockOnlyTitleComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.fetchContentDefaultError = 'Error getting ' + this.block.contents.title + ' data.';
    }

    /**
     * Go to the block page.
     */
    gotoBlock(): void {
        this.linkHelper.goInSite(this.navCtrl, this.link, this.linkParams, undefined, true);
    }
}
