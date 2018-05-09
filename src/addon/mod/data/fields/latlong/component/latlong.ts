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
import { FormBuilder } from '@angular/forms';
import { Platform } from 'ionic-angular';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';

/**
 * Component to render data latlong field.
 */
@Component({
    selector: 'addon-mod-data-field-latlong',
    templateUrl: 'latlong.html'
})
export class AddonModDataFieldLatlongComponent extends AddonModDataFieldPluginComponent implements OnInit {

    north: number;
    east: number;

    constructor(protected fb: FormBuilder, private platform: Platform) {
        super(fb);
    }

    /**
     * Format latitude and longitude in a simple text.
     *
     * @param  {number} north Degrees north.
     * @param  {number} east  Degrees East.
     * @return {string}       Readable Latitude and logitude.
     */
    formatLatLong(north: number, east: number): string {
        if (north !== null || east !== null) {
            const northFixed = north ? Math.abs(north).toFixed(4) : '0.0000',
                eastFixed = east ? Math.abs(east).toFixed(4) : '0.0000';

            return northFixed + (north < 0 ? '°S' : '°N') + ' ' + eastFixed + (east < 0 ? '°W' : '°E');
        }
    }

    /**
     * Get link to maps from latitude and longitude.
     *
     * @param  {number} north Degrees north.
     * @param  {number} east  Degrees East.
     * @return {string}       Link to maps depending on platform.
     */
    getLatLongLink(north: number, east: number): string {
        if (north !== null || east !== null) {
            const northFixed = north ? north.toFixed(4) : '0.0000',
                eastFixed = east ? east.toFixed(4) : '0.0000';

            if (this.platform.is('ios')) {
                return 'http://maps.apple.com/?ll=' + northFixed + ',' + eastFixed + '&near=' + northFixed + ',' + eastFixed;
            }

            return 'geo:' + northFixed + ',' + eastFixed;
        }
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.mode = this.mode == 'list' ? 'show' : this.mode;
        this.render();
    }

    protected render(): void {
        if (this.value) {
            this.north = (this.value && parseFloat(this.value.content)) || null;
            this.east = (this.value && parseFloat(this.value.content1)) || null;
        }

        if (this.mode == 'edit') {
            this.addControl('f_' + this.field.id + '_0', this.north);
            this.addControl('f_' + this.field.id + '_1', this.east);
        } else if (this.mode == 'search') {
            this.addControl('f_' + this.field.id);
        }
    }
}
