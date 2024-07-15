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
import { CoreSharedModule } from '@/core/shared.module';
import { Component, Input, OnInit } from '@angular/core';
import { CoreRating, CoreRatingItemRating } from '@features/rating/services/rating';
import { CoreDomUtils } from '@services/utils/dom';
import { ModalController } from '@singletons';

/**
 * Modal that displays individual ratings
 */
@Component({
    templateUrl: 'ratings-modal.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreRatingRatingsComponent implements OnInit {

    @Input() contextLevel!: ContextLevel;
    @Input() instanceId!: number;
    @Input() ratingComponent!: string;
    @Input() ratingArea!: string;
    @Input() aggregateMethod!: number;
    @Input() itemId!: number;
    @Input() scaleId!: number;
    @Input() courseId!: number;

    loaded = false;
    ratings: CoreRatingItemRating[] = [];

    /**
     * Modal loaded.
     */
    async ngOnInit(): Promise<void> {
        try {
            this.ratings = await CoreRating.getItemRatings(
                this.contextLevel,
                this.instanceId,
                this.ratingComponent,
                this.ratingArea,
                this.itemId,
                this.scaleId,
                undefined,
                this.courseId,
            );
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
