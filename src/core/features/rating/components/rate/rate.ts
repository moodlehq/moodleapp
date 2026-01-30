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

import { ContextLevel } from '@/core/constants';
import { Component, EventEmitter, Input, OnChanges, Output, OnDestroy } from '@angular/core';
import {
    CoreRatingProvider,
    CoreRatingInfo,
    CoreRatingInfoItem,
    CoreRatingScale,
    CoreRating,
} from '@features/rating/services/rating';
import { CoreRatingOffline } from '@features/rating/services/rating-offline';
import { CoreSites } from '@services/sites';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays the user rating select.
 */
@Component({
    selector: 'core-rating-rate',
    templateUrl: 'core-rating-rate.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreRatingRateComponent implements OnChanges, OnDestroy {

    @Input({ required: true }) ratingInfo!: CoreRatingInfo;
    @Input({ required: true }) contextLevel!: ContextLevel; // Context level: course, module, user, etc.
    @Input({ required: true }) instanceId!: number; // Context instance id.
    @Input({ required: true }) itemId!: number; // Item id. Example: forum post id.
    @Input({ required: true }) itemSetId!: number; // Item set id. Example: forum discussion id.
    @Input({ required: true }) courseId!: number;
    @Input({ required: true }) aggregateMethod!: number;
    @Input({ required: true }) scaleId!: number;
    @Input({ required: true }) userId!: number;
    @Output() protected onLoading: EventEmitter<boolean>; // Eevent that indicates whether the component is loading data.
    @Output() protected onUpdate: EventEmitter<void>; // Event emitted when the rating is updated online.

    item?: CoreRatingInfoItem;
    scale?: CoreRatingScale;
    rating?: number;
    disabled = false;

    protected updateSiteObserver: CoreEventObserver;

    constructor() {

        this.onLoading = new EventEmitter<boolean>();
        this.onUpdate = new EventEmitter<void>();

        this.disabled = CoreRating.isRatingDisabledInSite();

        // Update visibility if current site info is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.disabled = CoreRating.isRatingDisabledInSite();
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(): Promise<void> {
        this.item = (this.ratingInfo.ratings || []).find((rating) => rating.itemid == this.itemId);
        this.scale = (this.ratingInfo.scales || []).find((scale) => scale.id == this.scaleId);

        if (!this.item || !this.scale) {
            this.item = undefined;

            return;
        }

        // Set numeric scale items.
        if (!this.scale.items) {
            this.scale.items = [];
            if (this.scale.isnumeric) {
                for (let n = 0; n <= this.scale.max; n++) {
                    this.scale.items.push({ name: String(n), value: n });
                }
            }
        }

        // Add "No rating" item to the scale.
        if (!this.scale.items[0] || this.scale.items[0].value != CoreRatingProvider.UNSET_RATING) {
            this.scale.items.unshift({
                name: Translate.instant('core.none'),
                value: CoreRatingProvider.UNSET_RATING,
            });
        }

        this.onLoading.emit(true);

        try {
            const rating = await CoreRatingOffline.getRating(
                this.contextLevel,
                this.instanceId,
                this.ratingInfo.component,
                this.ratingInfo.ratingarea,
                this.itemId,
            );
            this.rating = rating.rating;
        } catch {
            if (this.item && this.item.rating != null) {
                this.rating = this.item.rating;
            } else {
                this.rating = CoreRatingProvider.UNSET_RATING;
            }
        } finally {
            this.onLoading.emit(false);
        }
    }

    /**
     * Send or save the user rating when changed.
     */
    async userRatingChanged(): Promise<void> {
        if (this.rating === undefined) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const response = await CoreRating.addRating(
                this.ratingInfo.component,
                this.ratingInfo.ratingarea,
                this.contextLevel,
                this.instanceId,
                this.itemId,
                this.itemSetId,
                this.courseId,
                this.scaleId,
                this.rating,
                this.userId,
                this.aggregateMethod,
            );

            if (response === undefined) {
                CoreToasts.show({
                    message: 'core.datastoredoffline',
                    translateMessage: true,
                    duration: ToastDuration.LONG,
                });
            } else {
                this.onUpdate.emit();
            }
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
    }

}
