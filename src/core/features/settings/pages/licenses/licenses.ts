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

import { Component, OnInit } from '@angular/core';
import { CoreConstants } from '@/core/constants';
import { Http } from '@singletons';
import { IonSearchbar } from '@ionic/angular';

/**
 * Defines license info
 */
interface CoreSettingsLicense {
    name: string;
    version: string;
    licenses: string | string[];
    repository?: string;
    publisher?: string;
    url?: string;
    email?: string;
    licenseUrl?: string;
    licenseFile?: string;
}

/**
 * Page that displays the open source licenses information.
 */
@Component({
    selector: 'page-core-app-settings-licenses',
    templateUrl: 'licenses.html',
})
export class CoreSettingsLicensesPage implements OnInit {

    licensesUrl: string;
    loaded = false;
    licenses: CoreSettingsLicense[] = [];
    error = false;
    textFilter = '';
    appLicenseVersion: string;

    protected allLicenses: CoreSettingsLicense[] = [];

    constructor() {
        this.appLicenseVersion = CoreConstants.CONFIG.versionname.indexOf('-') > 0
            ? 'integration'
            : 'v' + CoreConstants.CONFIG.versionname;

        this.licensesUrl = 'https://raw.githubusercontent.com/moodlehq/moodleapp/' + this.appLicenseVersion + '/licenses.json';
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const licenses = await Http.get(this.licensesUrl).toPromise();
            this.allLicenses = Object.keys(licenses).map((name) => {
                const license = licenses[name];

                const nameSplit = name.lastIndexOf('@');
                license.name = name.substring(0, nameSplit);
                license.version = name.substring(nameSplit + 1);
                if (Array.isArray(license.licenses)) {
                    license.licenses = license.licenses.join(', ');
                }

                if (license.repository) {
                    license.repository = license.repository.replace('git://', 'https://');
                    if (license.repository.indexOf('github.com') > 0) {
                        const version = license.name == 'moodlemobile' ? this.appLicenseVersion : license.version;
                        license.licenseUrl = license.repository + '/blob/' + version + '/' + license.licenseFile;
                    }
                }

                return license;
            });

            this.filterLicenses();

            this.error = false;
        } catch {
            this.error = true;
        }

        this.loaded = true;
    }

    /**
     * Filter licenses using filter text.
     */
    filterLicenses(): void {
        const filter = this.textFilter.trim().toLowerCase();

        if (filter == '') {
            this.licenses = this.allLicenses;

            return;
        }

        this.licenses = this.allLicenses.filter((license) => license.name.toLowerCase().indexOf(filter) >=0 ||
            license.version.toLowerCase().indexOf(filter) >=0 ||
            typeof license.licenses == 'string' && license.licenses.toLowerCase().indexOf(filter) >=0 ||
            license.repository && license.repository.toLowerCase().indexOf(filter) >=0 ||
            license.publisher && license.publisher.toLowerCase().indexOf(filter) >=0 ||
            license.url && license.url.toLowerCase().indexOf(filter) >=0 ||
            license.email && license.email.toLowerCase().indexOf(filter) >=0);
    }

    /**
     * Text filter changed.
     *
     * @param target Searchbar element.
     */
    filterChanged(target: IonSearchbar): void {
        this.textFilter = target.value || '';

        this.filterLicenses();
    }

}
