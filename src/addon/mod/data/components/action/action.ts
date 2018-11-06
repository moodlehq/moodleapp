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
import { Component, Input, OnInit, Injector } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataOfflineProvider } from '../../providers/offline';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Component that displays a database action.
 */
@Component({
    selector: 'addon-mod-data-action',
    templateUrl: 'addon-mod-data-action.html',
})
export class AddonModDataActionComponent implements OnInit {
    @Input() mode: string; // The render mode.
    @Input() action: string; // The field to render.
    @Input() entry?: any; // The value of the field.
    @Input() database: any; // Database object.

    siteId: string;
    rootUrl: string;
    url: string;
    userPicture: string;

    constructor(protected injector: Injector, protected dataProvider: AddonModDataProvider,
            protected dataOffline: AddonModDataOfflineProvider, protected eventsProvider: CoreEventsProvider,
            sitesProvider: CoreSitesProvider, protected userProvider: CoreUserProvider) {
        this.rootUrl = sitesProvider.getCurrentSite().getURL();
        this.siteId = sitesProvider.getCurrentSiteId();
    }

    /**
     * Undo delete action.
     *
     * @return {Promise<any>} Solved when done.
     */
    undoDelete(): Promise<any> {
        const dataId = this.database.id,
            entryId = this.entry.id;

        return this.dataOffline.getEntry(dataId, entryId, 'delete', this.siteId).then(() => {
            // Found. Just delete the action.
            return this.dataOffline.deleteEntry(dataId, entryId, 'delete', this.siteId);
        }).then(() => {
            this.eventsProvider.trigger(AddonModDataProvider.ENTRY_CHANGED, {dataId: dataId, entryId: entryId}, this.siteId);
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        switch (this.action) {
            case 'more':
                this.url = this.rootUrl + '/mod/data/view.php?d= ' + this.entry.dataid + '&rid=' + this.entry.id;
                break;
            case 'edit':
                this.url = this.rootUrl + '/mod/data/edit.php?d= ' + this.entry.dataid + '&rid=' + this.entry.id;
                break;
            case 'delete':
                this.url = this.rootUrl + '/mod/data/view.php?d= ' + this.entry.dataid + '&delete=' + this.entry.id;
                break;
            case 'approve':
                this.url = this.rootUrl + '/mod/data/view.php?d= ' + this.entry.dataid + '&approve=' + this.entry.id;
                break;
            case 'disapprove':
                this.url = this.rootUrl + '/mod/data/view.php?d= ' + this.entry.dataid + '&disapprove=' + this.entry.id;
                break;
            case 'userpicture':
                this.userProvider.getProfile(this.entry.userid, this.database.courseid).then((profile) => {
                    this.userPicture = profile.profileimageurl;
                });
                break;
            default:
                break;
        }
    }
}
