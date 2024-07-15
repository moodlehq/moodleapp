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
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import {
    CoreRating,
    CoreRatingInfo,
    CoreRatingInfoItem,
    CoreRatingProvider,
} from '@features/rating/services/rating';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

/**
 * Component that displays the aggregation of a rating item.
 */
@Component({
    selector: 'core-rating-aggregate',
    templateUrl: 'core-rating-aggregate.html',
})
export class CoreRatingAggregateComponent implements OnChanges, OnDestroy {

    @Input() ratingInfo!: CoreRatingInfo;
    @Input() contextLevel!: ContextLevel;
    @Input() instanceId!: number;
    @Input() itemId!: number;
    @Input() aggregateMethod!: number;
    @Input() scaleId!: number;
    @Input() courseId?: number;

    item?: CoreRatingInfoItem;
    showCount = false;
    disabled = false;
    labelKey = '';

    protected aggregateObserver?: CoreEventObserver;
    protected updateSiteObserver: CoreEventObserver;

    constructor() {
        this.disabled = CoreRating.isRatingDisabledInSite();

        // Update visibility if current site info is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.disabled = CoreRating.isRatingDisabledInSite();
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.aggregateObserver?.off();
        delete this.aggregateObserver;

        this.item = (this.ratingInfo.ratings || []).find((rating) => rating.itemid === this.itemId);
        if (!this.item) {
            return;
        }

        switch (this.aggregateMethod) {
            case CoreRatingProvider.AGGREGATE_AVERAGE:
                this.labelKey = 'core.rating.aggregateavg';
                break;
            case CoreRatingProvider.AGGREGATE_COUNT:
                this.labelKey = 'core.rating.aggregatecount';
                break;
            case CoreRatingProvider.AGGREGATE_MAXIMUM:
                this.labelKey = 'core.rating.aggregatemax';
                break;
            case CoreRatingProvider.AGGREGATE_MINIMUM:
                this.labelKey = 'core.rating.aggregatemin';
                break;
            case CoreRatingProvider.AGGREGATE_SUM:
                this.labelKey = 'core.rating.aggregatesum';
                break;
            default:
                this.labelKey = '';

                return;
        }

        this.showCount = (this.aggregateMethod != CoreRatingProvider.AGGREGATE_COUNT);

        // Update aggrgate when the user adds or edits a rating.
        this.aggregateObserver =
            CoreEvents.on(CoreRatingProvider.AGGREGATE_CHANGED_EVENT, (data) => {
                if (this.item &&
                    data.contextLevel === this.contextLevel &&
                    data.instanceId === this.instanceId &&
                    data.component === this.ratingInfo.component &&
                    data.ratingArea === this.ratingInfo.ratingarea &&
                    data.itemId === this.itemId) {
                    this.item.aggregatestr = data.aggregate;
                    this.item.count = data.count;
                }
            });
    }

    /**
     * Open the individual ratings page.
     */
    async openRatings(): Promise<void> {
        if (!this.ratingInfo.canviewall || !this.item?.count || this.disabled) {
            return;
        }

        const { CoreRatingRatingsComponent } =
            await import('@features/rating/components/ratings/ratings');

        await CoreDomUtils.openModal({
            component: CoreRatingRatingsComponent,
            componentProps: {
                contextLevel: this.contextLevel,
                instanceId: this.instanceId,
                ratingComponent: this.ratingInfo.component,
                ratingArea: this.ratingInfo.ratingarea,
                itemId: this.itemId,
                scaleId: this.scaleId,
                courseId: this.courseId,
            },
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.aggregateObserver?.off();
        this.updateSiteObserver.off();
    }

}
