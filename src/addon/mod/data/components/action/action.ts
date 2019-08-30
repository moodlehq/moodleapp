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
import { NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataHelperProvider } from '../../providers/helper';
import { AddonModDataOfflineProvider } from '../../providers/offline';
import { CoreSitesProvider } from '@providers/sites';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreTagProvider } from '@core/tag/providers/tag';

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
    @Input() module: any; // Module object.
    @Input() group: number; // Module object.
    @Input() offset?: number; // Offset of the entry.

    siteId: string;
    rootUrl: string;
    url: string;
    userPicture: string;
    tagsEnabled: boolean;

    constructor(protected injector: Injector, protected dataProvider: AddonModDataProvider,
            protected dataOffline: AddonModDataOfflineProvider, protected eventsProvider: CoreEventsProvider,
            sitesProvider: CoreSitesProvider, protected userProvider: CoreUserProvider, private navCtrl: NavController,
            protected linkHelper: CoreContentLinksHelperProvider, private dataHelper: AddonModDataHelperProvider,
            private tagProvider: CoreTagProvider) {
        this.rootUrl = sitesProvider.getCurrentSite().getURL();
        this.siteId = sitesProvider.getCurrentSiteId();
        this.tagsEnabled = this.tagProvider.areTagsAvailableInSite();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.action == 'userpicture') {
            this.userProvider.getProfile(this.entry.userid, this.database.courseid).then((profile) => {
                this.userPicture = profile.profileimageurl;
            });
        }
    }

    /**
     * Approve the entry.
     */
    approveEntry(): void {
        this.dataHelper.approveOrDisapproveEntry(this.database.id, this.entry.id, true, this.database.courseid);
    }

    /**
     * Show confirmation modal for deleting the entry.
     */
    deleteEntry(): void {
       this.dataHelper.showDeleteEntryModal(this.database.id, this.entry.id, this.database.courseid);
    }

    /**
     * Disapprove the entry.
     */
    disapproveEntry(): void {
        this.dataHelper.approveOrDisapproveEntry(this.database.id, this.entry.id, false, this.database.courseid);
    }

    /**
     * Go to the edit page of the entry.
     */
    editEntry(): void {
        const pageParams = {
            courseId: this.database.course,
            module: this.module,
            entryId: this.entry.id
        };

        this.linkHelper.goInSite(this.navCtrl, 'AddonModDataEditPage', pageParams);
    }

    /**
     * Go to the view page of the entry.
     */
    viewEntry(): void {
        const pageParams: any = {
            courseId: this.database.course,
            module: this.module,
            entryId: this.entry.id,
            group: this.group,
            offset: this.offset
        };

        this.linkHelper.goInSite(this.navCtrl, 'AddonModDataEntryPage', pageParams);
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
}
