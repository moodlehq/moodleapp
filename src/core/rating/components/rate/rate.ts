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

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChange, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreRatingProvider, CoreRatingInfo, CoreRatingInfoItem, CoreRatingScale } from '@core/rating/providers/rating';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreRatingOfflineProvider } from '@core/rating/providers/offline';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Component that displays the user rating select.
 */
@Component({
    selector: 'core-rating-rate',
    templateUrl: 'core-rating-rate.html'
})
export class CoreRatingRateComponent implements OnChanges, OnDestroy {
    @Input() ratingInfo: CoreRatingInfo;
    @Input() contextLevel: string; // Context level: course, module, user, etc.
    @Input() instanceId: number; // Context instance id.
    @Input() itemId: number; // Item id. Example: forum post id.
    @Input() itemSetId: number; // Item set id. Example: forum discussion id.
    @Input() courseId: number;
    @Input() aggregateMethod: number;
    @Input() scaleId: number;
    @Input() userId: number;
    @Output() onLoading: EventEmitter<boolean>; // Eevent that indicates whether the component is loading data.
    @Output() onUpdate: EventEmitter<void>; // Event emitted when the rating is updated online.

    item: CoreRatingInfoItem;
    scale: CoreRatingScale;
    rating: number;
    disabled = false;
    protected updateSiteObserver;

    constructor(private domUtils: CoreDomUtilsProvider, private translate: TranslateService, eventsProvider: CoreEventsProvider,
            private ratingProvider: CoreRatingProvider, private ratingOffline: CoreRatingOfflineProvider,
            sitesProvider: CoreSitesProvider) {

        this.onLoading = new EventEmitter<boolean>();
        this.onUpdate = new EventEmitter<void>();

        this.disabled = this.ratingProvider.isRatingDisabledInSite();

        // Update visibility if current site info is updated.
        this.updateSiteObserver = eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            this.disabled = this.ratingProvider.isRatingDisabledInSite();
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        this.item = (this.ratingInfo.ratings || []).find((rating) => rating.itemid == this.itemId);
        this.scale = (this.ratingInfo.scales || []).find((scale) => scale.id == this.scaleId);

        if (!this.item || !this.scale || !this.ratingProvider.isAddRatingWSAvailable()) {
            this.item = null;

            return;
        }

        // Set numeric scale items.
        if (!this.scale.items) {
            this.scale.items = [];
            if (this.scale.isnumeric) {
                for (let n = 0; n <= this.scale.max; n++) {
                    this.scale.items.push({name: String(n), value: n});
                }
            }
        }

        // Add "No rating" item to the scale.
        if (!this.scale.items[0] || this.scale.items[0].value != CoreRatingProvider.UNSET_RATING) {
            this.scale.items.unshift({
                name: this.translate.instant('core.none'),
                value: CoreRatingProvider.UNSET_RATING
            });
        }

        this.onLoading.emit(true);
        this.ratingOffline.getRating(this.contextLevel, this.instanceId, this.ratingInfo.component, this.ratingInfo.ratingarea,
                this.itemId).then((rating) => {
            this.rating = rating.rating;
        }).catch(() => {
            if (this.item && this.item.rating != null) {
                this.rating = this.item.rating;
            } else {
                this.rating = CoreRatingProvider.UNSET_RATING;
            }
        }).finally(() => {
            this.onLoading.emit(false);
        });
    }

    /**
     * Send or save the user rating when changed.
     */
    protected userRatingChanged(): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.ratingProvider.addRating(this.ratingInfo.component, this.ratingInfo.ratingarea, this.contextLevel, this.instanceId,
                this.itemId, this.itemSetId, this.courseId, this.scaleId, this.rating, this.userId, this.aggregateMethod)
                .then((response) => {
            if (response == null) {
                this.domUtils.showToast('core.datastoredoffline', true, 3000);
            } else {
                this.onUpdate.emit();
            }
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
