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

import { Component, Input, ElementRef } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Component to render an H5P package.
 */
@Component({
    selector: 'core-h5p-player',
    templateUrl: 'core-h5p-player.html'
})
export class CoreH5PPlayerComponent {
    @Input() src: string; // The URL of the player to display the H5P package.

    showPackage = false;
    loading = false;
    status: string;
    canDownload: boolean;
    calculating = true;

    constructor(public elementRef: ElementRef,
            protected sitesProvider: CoreSitesProvider) {
    }

    /**
     * Play the H5P.
     *
     * @param e Event.
     */
    play(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();

        this.loading = true;

        // Get auto-login URL so the user is automatically authenticated.
        this.sitesProvider.getCurrentSite().getAutoLoginUrl(this.src, false).then((url) => {
            this.src = url;
            this.loading = false;
            this.showPackage = true;
        });
    }
}
