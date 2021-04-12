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

import { Component, OnInit, ViewChild } from '@angular/core';
import { CoreCommentsCommentsComponent } from '@features/comments/components/comments/comments';
import { CoreComments } from '@features/comments/services/comments';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTag } from '@features/tag/services/tag';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonModGlossary,
    AddonModGlossaryEntry,
    AddonModGlossaryGlossary,
    AddonModGlossaryProvider,
} from '../../services/glossary';

/**
 * Page that displays a glossary entry.
 */
@Component({
    selector: 'page-addon-mod-glossary-entry',
    templateUrl: 'entry.html',
})
export class AddonModGlossaryEntryPage implements OnInit {

    @ViewChild(CoreCommentsCommentsComponent) comments?: CoreCommentsCommentsComponent;

    component = AddonModGlossaryProvider.COMPONENT;
    componentId?: number;
    entry?: AddonModGlossaryEntry;
    glossary?: AddonModGlossaryGlossary;
    loaded = false;
    showAuthor = false;
    showDate = false;
    ratingInfo?: CoreRatingInfo;
    tagsEnabled = false;
    commentsEnabled = false;
    courseId!: number;

    protected entryId!: number;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.entryId = CoreNavigator.getRouteNumberParam('entryId')!;
        this.tagsEnabled = CoreTag.areTagsAvailableInSite();
        this.commentsEnabled = !CoreComments.areCommentsDisabledInSite();

        try {
            await this.fetchEntry();

            if (!this.glossary) {
                return;
            }

            await CoreUtils.ignoreErrors(AddonModGlossary.logEntryView(this.entryId, this.componentId!, this.glossary.name));
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher): Promise<void> {
        if (this.glossary?.allowcomments && this.entry && this.entry.id > 0 && this.commentsEnabled && this.comments) {
            // Refresh comments. Don't add it to promises because we don't want the comments fetch to block the entry fetch.
            CoreUtils.ignoreErrors(this.comments.doRefresh());
        }

        try {
            await CoreUtils.ignoreErrors(AddonModGlossary.invalidateEntry(this.entryId));

            await this.fetchEntry();
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Convenience function to get the glossary entry.
     *
     * @return Promise resolved when done.
     */
    protected async fetchEntry(): Promise<void> {
        try {
            const result = await AddonModGlossary.getEntry(this.entryId);

            this.entry = result.entry;
            this.ratingInfo = result.ratinginfo;

            if (this.glossary) {
                // Glossary already loaded, nothing else to load.
                return;
            }

            // Load the glossary.
            this.glossary = await AddonModGlossary.getGlossaryById(this.courseId, this.entry.glossaryid);
            this.componentId = this.glossary.coursemodule;

            switch (this.glossary.displayformat) {
                case 'fullwithauthor':
                case 'encyclopedia':
                    this.showAuthor = true;
                    this.showDate = true;
                    break;
                case 'fullwithoutauthor':
                    this.showAuthor = false;
                    this.showDate = true;
                    break;
                default: // Default, and faq, simple, entrylist, continuous.
                    this.showAuthor = false;
                    this.showDate = false;
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingentry', true);
        }
    }

    /**
     * Function called when rating is updated online.
     */
    ratingUpdated(): void {
        AddonModGlossary.invalidateEntry(this.entryId);
    }

}
