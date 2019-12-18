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
import { FormBuilder } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Platform } from 'ionic-angular';
import { Geolocation, GeolocationOptions } from '@ionic-native/geolocation';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Component to render data latlong field.
 */
@Component({
    selector: 'addon-mod-data-field-latlong',
    templateUrl: 'addon-mod-data-field-latlong.html'
})
export class AddonModDataFieldLatlongComponent extends AddonModDataFieldPluginComponent {

    north: number;
    east: number;

    constructor(protected fb: FormBuilder,
            protected platform: Platform,
            protected geolocation: Geolocation,
            protected domUtils: CoreDomUtilsProvider,
            protected sanitizer: DomSanitizer) {
        super(fb);
    }

    /**
     * Format latitude and longitude in a simple text.
     *
     * @param north Degrees north.
     * @param east Degrees East.
     * @return Readable Latitude and logitude.
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
     * @param north Degrees north.
     * @param east Degrees East.
     * @return Link to maps depending on platform.
     */
    getLatLongLink(north: number, east: number): SafeUrl {
        if (north !== null || east !== null) {
            const northFixed = north ? north.toFixed(4) : '0.0000';
            const eastFixed = east ? east.toFixed(4) : '0.0000';
            let url;

            if (this.platform.is('ios')) {
                url = 'http://maps.apple.com/?ll=' + northFixed + ',' + eastFixed + '&near=' + northFixed + ',' + eastFixed;
            } else {
                url = 'geo:' + northFixed + ',' + eastFixed;
            }

            return this.sanitizer.bypassSecurityTrustUrl(url);
        }
    }

    /**
     * Initialize field.
     */
    protected init(): void {
        if (this.value) {
            this.updateValue(this.value);
        }

        if (this.mode == 'edit') {
            this.addControl('f_' + this.field.id + '_0', this.north);
            this.addControl('f_' + this.field.id + '_1', this.east);
        } else if (this.mode == 'search') {
            this.addControl('f_' + this.field.id);
        }
    }

    /**
     * Update value being shown.
     *
     * @param value New value to be set.
     */
    protected updateValue(value: any): void {
        this.value = value;
        this.north = (value && parseFloat(value.content)) || null;
        this.east = (value && parseFloat(value.content1)) || null;
    }

    /**
     * Get user location.
     *
     * @param $event The event.
     */
    getLocation(event: Event): void {
        event.preventDefault();

        const modal = this.domUtils.showModalLoading('addon.mod_data.gettinglocation', true);

        const options: GeolocationOptions = {
            enableHighAccuracy: true,
            timeout: 30000
        };

        this.geolocation.getCurrentPosition(options).then((result) => {
            this.form.controls['f_' + this.field.id + '_0'].setValue(result.coords.latitude);
            this.form.controls['f_' + this.field.id + '_1'].setValue(result.coords.longitude);
        }).catch((error) => {
            if (this.isPermissionDeniedError(error)) {
                this.domUtils.showErrorModal('addon.mod_data.locationpermissiondenied', true);

                return;
            }

            this.domUtils.showErrorModalDefault(error,  'Error getting location');
        }).finally(() => {
            modal.dismiss();
        });
    }

    protected isPermissionDeniedError(error?: any): boolean {
        return error && 'code' in error && 'PERMISSION_DENIED' in error && error.code === error.PERMISSION_DENIED;
    }
}
