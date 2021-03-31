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

import { Component, OnInit, Input } from '@angular/core';
import { Params } from '@angular/router';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreTag } from '@features/tag/services/tag';
import { CoreUser } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreEvents } from '@singletons/events';
import {
    AddonModDataAction,
    AddonModDataData,
    AddonModDataEntry,
    AddonModDataProvider,
    AddonModDataTemplateMode,
} from '../../services/data';
import { AddonModDataHelper } from '../../services/data-helper';
import { AddonModDataOffline } from '../../services/data-offline';
import { AddonModDataModuleHandlerService } from '../../services/handlers/module';

/**
 * Component that displays a database action.
 */
@Component({
    selector: 'addon-mod-data-action',
    templateUrl: 'addon-mod-data-action.html',
})
export class AddonModDataActionComponent implements OnInit {

    @Input() mode!: AddonModDataTemplateMode; // The render mode.
    @Input() action!: AddonModDataAction; // The field to render.
    @Input() entry!: AddonModDataEntry; // The value of the field.
    @Input() database!: AddonModDataData; // Database object.
    @Input() module!: CoreCourseModule; // Module object.
    @Input() group = 0; // Module object.
    @Input() offset?: number; // Offset of the entry.

    siteId: string;
    userPicture?: string;
    tagsEnabled = false;

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();
        this.tagsEnabled = CoreTag.areTagsAvailableInSite();
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (this.action == AddonModDataAction.USERPICTURE) {
            const profile = await CoreUser.getProfile(this.entry.userid, this.database.course);
            this.userPicture = profile.profileimageurl;
        }
    }

    /**
     * Approve the entry.
     */
    approveEntry(): void {
        AddonModDataHelper.approveOrDisapproveEntry(this.database.id, this.entry.id, true, this.database.course);
    }

    /**
     * Show confirmation modal for deleting the entry.
     */
    deleteEntry(): void {
        AddonModDataHelper.showDeleteEntryModal(this.database.id, this.entry.id, this.database.course);
    }

    /**
     * Disapprove the entry.
     */
    disapproveEntry(): void {
        AddonModDataHelper.approveOrDisapproveEntry(this.database.id, this.entry.id, false, this.database.course);
    }

    /**
     * Go to the edit page of the entry.
     */
    editEntry(): void {
        const params = {
            courseId: this.database.course,
            module: this.module,
        };

        CoreNavigator.navigateToSitePath(
            `${AddonModDataModuleHandlerService.PAGE_NAME}/${this.module.course}/${this.module.id}/edit/${this.entry.id}`,
            { params },
        );
    }

    /**
     * Go to the view page of the entry.
     */
    viewEntry(): void {
        const params: Params = {
            courseId: this.database.course,
            module: this.module,
            entryId: this.entry.id,
            group: this.group,
            offset: this.offset,
        };

        CoreNavigator.navigateToSitePath(
            `${AddonModDataModuleHandlerService.PAGE_NAME}/${this.module.course}/${this.module.id}/${this.entry.id}`,
            { params },
        );
    }

    /**
     * Undo delete action.
     *
     * @return Solved when done.
     */
    async undoDelete(): Promise<void> {
        const dataId = this.database.id;
        const entryId = this.entry.id;

        await AddonModDataOffline.getEntry(dataId, entryId, AddonModDataAction.DELETE, this.siteId);

        // Found. Just delete the action.
        await AddonModDataOffline.deleteEntry(dataId, entryId, AddonModDataAction.DELETE, this.siteId);
        CoreEvents.trigger(AddonModDataProvider.ENTRY_CHANGED, { dataId: dataId, entryId: entryId }, this.siteId);
    }

}
