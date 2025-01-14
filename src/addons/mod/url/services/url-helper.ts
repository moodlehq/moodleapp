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

import { Injectable } from '@angular/core';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Service that provides helper functions for urls.
 */
@Injectable({ providedIn: 'root' })
export class AddonModUrlHelperProvider {

    /**
     * Opens a URL.
     *
     * @param url The URL to go to.
     */
    async open(url: string): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            await CoreSites.visitLink(url, {
                checkRoot: true,
                openBrowserRoot: true,
            });
        } finally {
            modal.dismiss();
        }
    }

}
export const AddonModUrlHelper = makeSingleton(AddonModUrlHelperProvider);
