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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';

/**
 * Page that displays the list of blog entries.
 */
@IonicPage({ segment: 'addon-blog-entries' })
@Component({
    selector: 'page-addon-blog-entries',
    templateUrl: 'entries.html',
})
export class AddonBlogEntriesPage {
    userId: number;
    courseId: number;
    cmId: number;
    entryId: number;
    groupId: number;
    tagId: number;
    title: string;

    constructor(params: NavParams) {
        this.userId = params.get('userId');
        this.courseId = params.get('courseId');
        this.cmId = params.get('cmId');
        this.entryId = params.get('entryId');
        this.groupId = params.get('groupId');
        this.tagId = params.get('tagId');

        if (!this.userId && !this.courseId && !this.cmId && !this.entryId && !this.groupId && !this.tagId) {
            this.title = 'addon.blog.siteblogheading';
        } else {
            this.title = 'addon.blog.blogentries';
        }
    }
}
