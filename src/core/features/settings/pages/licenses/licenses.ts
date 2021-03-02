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

/**
 * Defines license info
 */
interface CoreSettingsLicense {
    name: string;
    version: string;
    licenses: string;
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

    constructor() {
        let version = 'v' + CoreConstants.CONFIG.versionname;
        if (version.indexOf('-') > 0) {
            version = 'integration';
        }

        this.licensesUrl = 'https://raw.githubusercontent.com/moodlehq/moodleapp/' + version + '/licenses.json';
    }

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        try {
            const licenses = await Http.get(this.licensesUrl).toPromise();
            this.licenses = Object.keys(licenses).map((name) => {
                const license = licenses[name];

                const nameSplit = name.lastIndexOf('@');
                license.name = name.substring(0, nameSplit);
                license.version = name.substring(nameSplit + 1);

                if (license.repository) {
                    license.repository = license.repository.replace('git://', 'https://');
                    if (license.repository.indexOf('github.com') > 0) {
                        license.licenseUrl = license.repository + '/blob/' + license.version + '/' + license.licenseFile;
                    }
                }

                return license;
            });

            this.error = false;
        } catch {
            this.error = true;
        }

        this.loaded = true;
    }

}
