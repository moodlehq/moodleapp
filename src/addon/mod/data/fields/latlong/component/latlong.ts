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
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';
import { CoreApp, CoreAppProvider } from '@providers/app';
import { CoreGeolocation, CoreGeolocationError, CoreGeolocationErrorReason } from '@providers/geolocation';
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
    showGeolocation: boolean;

    constructor(
            protected fb: FormBuilder,
            protected domUtils: CoreDomUtilsProvider,
            protected sanitizer: DomSanitizer,
            appProvider: CoreAppProvider) {
        super(fb);

        this.showGeolocation = !appProvider.isDesktop();
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

            if (CoreApp.instance.isIOS()) {
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
    async getLocation(event: Event): Promise<void> {
        event.preventDefault();

        const modal = this.domUtils.showModalLoading('addon.mod_data.gettinglocation', true);

        try {
            const coordinates = await CoreGeolocation.instance.getCoordinates();

            this.form.controls['f_' + this.field.id + '_0'].setValue(coordinates.latitude);
            this.form.controls['f_' + this.field.id + '_1'].setValue(coordinates.longitude);
        } catch (error) {
            this.showLocationErrorModal(error);
        }

        modal.dismiss();
    }

    /**
     * Show the appropriate error modal for the given error getting the location.
     *
     * @param error Location error.
     */
    protected showLocationErrorModal(error: any): void {
        if (error instanceof CoreGeolocationError) {
            this.domUtils.showErrorModal(this.getGeolocationErrorMessage(error), true);

            return;
        }

        this.domUtils.showErrorModalDefault(error,  'Error getting location');
    }

    /**
     * Get error message from a geolocation error.
     *
     * @param error Geolocation error.
     */
    protected getGeolocationErrorMessage(error: CoreGeolocationError): string {
        // tslint:disable-next-line: switch-default
        switch (error.reason) {
            case CoreGeolocationErrorReason.PermissionDenied:
                return 'addon.mod_data.locationpermissiondenied';
            case CoreGeolocationErrorReason.LocationNotEnabled:
                return 'addon.mod_data.locationnotenabled';
        }
    }

}
