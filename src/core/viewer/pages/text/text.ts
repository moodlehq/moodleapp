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
import { IonicPage, ViewController, NavParams } from 'ionic-angular';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Page to render a certain text. If opened as a modal, it will have a button to close the modal.
 */
@IonicPage({ segment: 'core-viewer-text' })
@Component({
    selector: 'page-core-viewer-text',
    templateUrl: 'text.html',
})
export class CoreViewerTextPage {
    title: string; // Page title.
    content: string; // Page content.
    component: string; // Component to use in format-text.
    componentId: string | number; // Component ID to use in format-text.
    files: any[]; // List of files.
    filter: boolean; // Whether to filter the text.
    contextLevel: string; // The context level.
    instanceId: number; // The instance ID related to the context.
    courseId: number; // Course ID the text belongs to. It can be used to improve performance with filters.

    constructor(private viewCtrl: ViewController, params: NavParams, textUtils: CoreTextUtilsProvider) {
        this.title = params.get('title');
        this.content = params.get('content');
        this.component = params.get('component');
        this.componentId = params.get('componentId');
        this.files = params.get('files');
        this.filter = params.get('filter');
        this.contextLevel = params.get('contextLevel');
        this.instanceId = params.get('instanceId');
        this.courseId = params.get('courseId');
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
