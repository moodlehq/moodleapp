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

import { NgModule } from '@angular/core';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreTagProvider } from './providers/tag';
import { CoreTagHelperProvider } from './providers/helper';
import { CoreTagAreaDelegate } from './providers/area-delegate';
import { CoreTagMainMenuHandler } from './providers/mainmenu-handler';
import { CoreTagIndexLinkHandler } from './providers/index-link-handler';
import { CoreTagSearchLinkHandler } from './providers/search-link-handler';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        CoreTagProvider,
        CoreTagHelperProvider,
        CoreTagAreaDelegate,
        CoreTagMainMenuHandler,
        CoreTagIndexLinkHandler,
        CoreTagSearchLinkHandler
    ]
})
export class CoreTagModule {

    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainMenuHandler: CoreTagMainMenuHandler,
            contentLinksDelegate: CoreContentLinksDelegate, indexLinkHandler: CoreTagIndexLinkHandler,
            searchLinkHandler: CoreTagSearchLinkHandler) {
        mainMenuDelegate.registerHandler(mainMenuHandler);
        contentLinksDelegate.registerHandler(indexLinkHandler);
        contentLinksDelegate.registerHandler(searchLinkHandler);
    }
}
