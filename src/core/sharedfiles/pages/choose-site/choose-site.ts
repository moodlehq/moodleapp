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

import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreFileProvider } from '@providers/file';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSharedFilesHelperProvider } from '../../providers/helper';

/**
 * Modal to display the list of sites to choose one to store a shared file.
 */
@IonicPage({ segment: 'core-shared-files-choose-site' })
@Component({
    selector: 'page-core-shared-files-choose-site',
    templateUrl: 'choose-site.html',
})
export class CoreSharedFilesChooseSitePage implements OnInit {

    fileName: string;
    sites: any[];
    loaded: boolean;

    protected filePath: string;
    protected fileEntry: any;
    protected isInbox: boolean; // Whether the file is in the Inbox folder.

    constructor(private navCtrl: NavController, navParams: NavParams, private sharedFilesHelper: CoreSharedFilesHelperProvider,
            private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private fileProvider: CoreFileProvider) {
        this.filePath = navParams.get('filePath');
        this.isInbox = navParams.get('isInbox');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.filePath) {
            this.domUtils.showErrorModal('Error reading file.');
            this.navCtrl.pop();

            return;
        }

        const fileAndDir = this.fileProvider.getFileAndDirectoryFromPath(this.filePath);
        this.fileName = fileAndDir.name;

        // Get the file.
        this.fileProvider.getExternalFile(this.filePath).then((fe) => {
            this.fileEntry = fe;
            this.fileName = this.fileEntry.name;
        }).catch(() => {
            this.domUtils.showErrorModal('Error reading file.');
            this.navCtrl.pop();
        });

        // Get the sites.
        this.sitesProvider.getSites().then((sites) => {
            this.sites = sites;
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Store the file in a certain site.
     *
     * @param {string} siteId Site ID.
     */
    storeInSite(siteId: string): void {
        this.loaded = false;
        this.sharedFilesHelper.storeSharedFileInSite(this.fileEntry, siteId, this.isInbox).then(() => {
            this.navCtrl.pop();
        }).finally(() => {
            this.loaded = true;
        });
    }
}
