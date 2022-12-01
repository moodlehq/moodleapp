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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreCommentsCommentsComponent } from '@features/comments/components/comments/comments';
import { CoreComments } from '@features/comments/services/comments';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTag } from '@features/tag/services/tag';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { AddonModGlossaryEntriesSource } from '../../classes/glossary-entries-source';
import { AddonModGlossaryEntriesSwipeManager } from '../../classes/glossary-entries-swipe-manager';
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
export class AddonModGlossaryEntryPage implements OnInit, OnDestroy {

    @ViewChild(CoreCommentsCommentsComponent) comments?: CoreCommentsCommentsComponent;

    component = AddonModGlossaryProvider.COMPONENT;
    componentId?: number;
    entry?: AddonModGlossaryEntry;
    entries?: AddonModGlossaryEntryEntriesSwipeManager;
    glossary?: AddonModGlossaryGlossary;
    loaded = false;
    showAuthor = false;
    showDate = false;
    ratingInfo?: CoreRatingInfo;
    tagsEnabled = false;
    commentsEnabled = false;
    courseId!: number;
    cmId?: number;

    protected entryId!: number;

    constructor(protected route: ActivatedRoute) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const routeData = this.route.snapshot.data;
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.entryId = CoreNavigator.getRequiredRouteNumberParam('entryId');
            this.tagsEnabled = CoreTag.areTagsAvailableInSite();
            this.commentsEnabled = !CoreComments.areCommentsDisabledInSite();

            if (routeData.swipeEnabled ?? true) {
                this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
                const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                    AddonModGlossaryEntriesSource,
                    [this.courseId, this.cmId, routeData.glossaryPathPrefix ?? ''],
                );

                this.entries = new AddonModGlossaryEntryEntriesSwipeManager(source);

                await this.entries.start();
            } else {
                this.cmId = CoreNavigator.getRouteNumberParam('cmId');
            }
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        try {
            await this.fetchEntry();

            if (!this.glossary || !this.componentId) {
                return;
            }

            await CoreUtils.ignoreErrors(AddonModGlossary.logEntryView(this.entryId, this.componentId, this.glossary.name));
        } finally {
            this.loaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.entries?.destroy();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
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
     * @returns Promise resolved when done.
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

/**
 * Helper to manage swiping within a collection of glossary entries.
 */
class AddonModGlossaryEntryEntriesSwipeManager extends AddonModGlossaryEntriesSwipeManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot): string | null {
        return `${this.getSource().GLOSSARY_PATH_PREFIX}entry/${route.params.entryId}`;
    }

}
