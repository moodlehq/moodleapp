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

import { Component } from '@angular/core';
import { CoreNavigator } from '@services/navigator';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a loading and then opens the main menu again.
 */
@Component({
    selector: 'page-core-mainmenu-reload',
    templateUrl: 'reload.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreMainMenuReloadPage {

    /**
     * Runs when the page has fully entered and is now the active page.
     * This event will fire, whether it was the first load or a cached page.
     *
     * This is not done on the ngOnInit because it can happen the page is revisited before destroyed.
     */
    ionViewDidEnter(): void {
        CoreNavigator.navigate('/main', {
            reset: true,
        });
    }

}
