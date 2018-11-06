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
import { TranslateService } from '@ngx-translate/core';
import { IonicPage, ViewController, NavParams } from 'ionic-angular';

/**
 * Page to view an image. If opened as a modal, it will have a button to close the modal.
 */
@IonicPage({ segment: 'core-viewer-image' })
@Component({
    selector: 'page-core-viewer-image',
    templateUrl: 'image.html',
})
export class CoreViewerImagePage {
    title: string; // Page title.
    image: string; // Image URL.
    component: string; // Component to use in external-content.
    componentId: string | number; // Component ID to use in external-content.

    constructor(private viewCtrl: ViewController, params: NavParams, translate: TranslateService) {
        this.title = params.get('title') || translate.instant('core.imageviewer');
        this.image = params.get('image');
        this.component = params.get('component');
        this.componentId = params.get('componentId');
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
