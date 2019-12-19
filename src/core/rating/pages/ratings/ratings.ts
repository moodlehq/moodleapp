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

import { Component } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreRatingProvider, CoreRatingItemRating } from '@core/rating/providers/rating';

/**
 * Page that displays individual ratings
 */
@IonicPage({ segment: 'core-rating-ratings' })
@Component({
    selector: 'page-core-rating-ratings',
    templateUrl: 'ratings.html',
})
export class CoreRatingRatingsPage {
    contextLevel: string;
    instanceId: number;
    component: string;
    ratingArea: string;
    aggregateMethod: number;
    itemId: number;
    scaleId: number;
    courseId: number;
    loaded = false;
    ratings: CoreRatingItemRating[] = [];

    constructor(navParams: NavParams, private viewCtrl: ViewController, private domUtils: CoreDomUtilsProvider,
            private ratingProvider: CoreRatingProvider) {
        this.contextLevel = navParams.get('contextLevel');
        this.instanceId = navParams.get('instanceId');
        this.component = navParams.get('ratingComponent');
        this.ratingArea = navParams.get('ratingArea');
        this.aggregateMethod = navParams.get('aggregateMethod');
        this.itemId = navParams.get('itemId');
        this.scaleId = navParams.get('scaleId');
        this.courseId = navParams.get('courseId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return Resolved when done.
     */
    fetchData(): Promise<any> {
        return this.ratingProvider.getItemRatings(this.contextLevel, this.instanceId, this.component, this.ratingArea, this.itemId,
                this.scaleId, undefined, this.courseId).then((ratings) => {
            this.ratings = ratings;
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        });
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    refreshRatings(refresher: any): void {
        this.ratingProvider.invalidateRatingItems(this.contextLevel, this.instanceId, this.component, this.ratingArea, this.itemId,
                this.scaleId).finally(() => {
            return this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
