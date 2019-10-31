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

import { Component, Input, ElementRef, OnInit, SimpleChange } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreH5PProvider } from '@core/h5p/providers/h5p';

/**
 * Component to render an H5P package.
 */
@Component({
    selector: 'core-h5p-player',
    templateUrl: 'core-h5p-player.html'
})
export class CoreH5PPlayerComponent implements OnInit {
    @Input() src: string; // The URL of the player to display the H5P package.

    playerSrc: string;
    showPackage = false;
    loading = false;
    status: string;
    canDownload: boolean;
    calculating = true;
    errorMessage: string;

    constructor(public elementRef: ElementRef,
            protected sitesProvider: CoreSitesProvider,
            protected urlUtils: CoreUrlUtilsProvider,
            protected utils: CoreUtilsProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected h5pProvider: CoreH5PProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.checkCanDownload();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        // If it's already playing and the src changes, don't change the player src, the user could lose data.
        if (changes.src && !this.showPackage) {
            this.checkCanDownload();
        }
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

        // @TODO: Check if package is downloaded and use the local player if so.

        // Get auto-login URL so the user is automatically authenticated.
        this.sitesProvider.getCurrentSite().getAutoLoginUrl(this.src, false).then((url) => {
            this.playerSrc = url;
            this.loading = false;
            this.showPackage = true;
        });
    }

    /**
     * Download the package.
     */
    download(): void {
        // @TODO: Implement package download.
    }

    /**
     * Check if the package can be downloaded.
     */
    protected checkCanDownload(): void {
        if (this.src && this.h5pProvider.canGetTrustedH5PFileInSite()) {
            const params = this.urlUtils.extractUrlParams(this.src);

            // @todo: Check if H5P offline is disabled in the site.

            // Now check if the package can be played.
            this.calculating = true;

            const options = {
                frame: this.utils.isTrueOrOne(params.frame),
                export: this.utils.isTrueOrOne(params.export),
                embed: this.utils.isTrueOrOne(params.embed),
                copyright: this.utils.isTrueOrOne(params.copyright),
            };

            this.h5pProvider.getTrustedH5PFile(params.url, options).then((file) => {
                this.canDownload = true;
                this.errorMessage = undefined;
            }).catch((error) => {
                this.canDownload = false;
                this.errorMessage = this.textUtils.getErrorMessageFromError(error);
            }).finally(() => {
                this.calculating = false;
            });

            return;
        }

        this.calculating = false;
        this.canDownload = false;
        this.errorMessage = undefined;
    }
}
