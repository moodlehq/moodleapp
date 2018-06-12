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

import { Component, Input } from '@angular/core';
import { NavParams, NavController } from 'ionic-angular';
import { CoreCommentsProvider } from '../../providers/comments';

/**
 * Component that displays the count of comments.
 */
@Component({
    selector: 'core-comments',
    templateUrl: 'core-comments.html',
})
export class CoreCommentsCommentsComponent {
    @Input() contextLevel: string;
    @Input() instanceId: number;
    @Input() component: string;
    @Input() itemId: number;
    @Input() area = '';
    @Input() page = 0;
    @Input() title?: string;

    commentsLoaded = false;
    commentsCount: number;

    constructor(navParams: NavParams, private navCtrl: NavController, private commentsProvider: CoreCommentsProvider) {}

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.commentsProvider.getComments(this.contextLevel, this.instanceId, this.component, this.itemId, this.area, this.page)
            .then((comments) => {
                this.commentsCount = comments && comments.length ? comments.length : 0;
            }).catch(() => {
                this.commentsCount = -1;
            }).finally(() => {
                this.commentsLoaded = true;
            });
    }

    /**
     * Opens the comments page.
     */
    openComments(): void {
        if (this.commentsCount > 0) {
            // Open a new state with the interpolated contents.
            this.navCtrl.push('CoreCommentsViewerPage', {
                contextLevel: this.contextLevel,
                instanceId: this.instanceId,
                component: this.component,
                itemId: this.itemId,
                area: this.area,
                page: this.page,
                title: this.title,
            });
        }
    }
}
