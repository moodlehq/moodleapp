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
import { NavParams } from 'ionic-angular';

/**
 * Component to display a Bootstrap Tooltip in a popover.
 */
@Component({
    selector: 'core-bs-tooltip',
    templateUrl: 'core-bs-tooltip.html'
})
export class CoreBSTooltipComponent {
    content: string;
    html: boolean;

    constructor(navParams: NavParams) {
        this.content = navParams.get('content') || '';
        this.html = !!navParams.get('html');
    }
}
