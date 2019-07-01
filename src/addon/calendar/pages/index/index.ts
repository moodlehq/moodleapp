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

import { Component, OnInit } from '@angular/core';
import { IonicPage } from 'ionic-angular';

/**
 * Page that displays the calendar events.
 */
@IonicPage({ segment: 'addon-calendar-index' })
@Component({
    selector: 'page-addon-calendar-index',
    templateUrl: 'index.html',
})
export class AddonCalendarIndexPage implements OnInit {

    constructor() {
        // @todo
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        // @todo
    }
}
