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

import { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { AddonModDataEntryField } from '@addons/mod/data/services/data';
import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { SafeUrl } from '@angular/platform-browser';
import { CoreAnyError } from '@classes/errors/error';
import { CoreGeolocation, CoreGeolocationError, CoreGeolocationErrorReason } from '@services/geolocation';
import { CoreLoadings } from '@services/loadings';
import { CorePlatform } from '@services/platform';
import { CoreDomUtils } from '@services/utils/dom';
import { DomSanitizer } from '@singletons';

/**
 * Component to render data latlong field.
 */
@Component({
    selector: 'addon-mod-data-field-latlong',
    templateUrl: 'addon-mod-data-field-latlong.html',
})
export class AddonModDataFieldLatlongComponent extends AddonModDataFieldPluginBaseComponent {

    north?: number;
    east?: number;
    locationServicesEnabled = false;

    constructor(fb: FormBuilder) {
        super(fb);
    }

    /**
     * Format latitude and longitude in a simple text.
     *
     * @param north Degrees north.
     * @param east Degrees East.
     * @returns Readable Latitude and logitude.
     */
    formatLatLong(north?: number, east?: number): string {
        if (north !== undefined || east !== undefined) {
            north = north || 0;
            east = east || 0;
            const northFixed = Math.abs(north).toFixed(4);
            const eastFixed = Math.abs(east).toFixed(4);

            return northFixed + (north < 0 ? '°S' : '°N') + ' ' + eastFixed + (east < 0 ? '°W' : '°E');
        }

        return '';
    }

    /**
     * Get link to maps from latitude and longitude.
     *
     * @param north Degrees north.
     * @param east Degrees East.
     * @returns Link to maps depending on platform.
     */
    getLatLongLink(north?: number, east?: number): SafeUrl {
        let url = '';
        if (north !== undefined || east !== undefined) {
            const northFixed = north ? north.toFixed(4) : '0.0000';
            const eastFixed = east ? east.toFixed(4) : '0.0000';

            if (CorePlatform.isIOS()) {
                url = 'http://maps.apple.com/?ll=' + northFixed + ',' + eastFixed + '&near=' + northFixed + ',' + eastFixed;
            } else {
                url = 'geo:' + northFixed + ',' + eastFixed;
            }
        }

        return DomSanitizer.bypassSecurityTrustUrl(url);
    }

    /**
     * @inheritdoc
     */
    protected async init(): Promise<void> {
        if (this.value) {
            this.updateValue(this.value);
        }

        if (this.editMode) {
            this.addControl('f_' + this.field.id + '_0', this.north);
            this.addControl('f_' + this.field.id + '_1', this.east);
            this.locationServicesEnabled = await CoreGeolocation.canRequest();

        } else if (this.searchMode) {
            this.addControl('f_' + this.field.id);
        }
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        this.value = value;
        this.north = (value && parseFloat(value.content!)) || undefined;
        this.east = (value && parseFloat(value.content1!)) || undefined;
    }

    /**
     * Get user location.
     *
     * @param event The event.
     */
    async getLocation(event: Event): Promise<void> {
        event.preventDefault();

        const modal = await CoreLoadings.show('addon.mod_data.gettinglocation', true);

        try {
            const coordinates = await CoreGeolocation.getCoordinates();

            this.form?.controls['f_' + this.field.id + '_0'].setValue(coordinates.latitude);
            this.form?.controls['f_' + this.field.id + '_1'].setValue(coordinates.longitude);
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
    protected showLocationErrorModal(error: CoreAnyError | CoreGeolocationError): void {
        if (error instanceof CoreGeolocationError) {
            CoreDomUtils.showErrorModal(this.getGeolocationErrorMessage(error), true);

            return;
        }

        CoreDomUtils.showErrorModalDefault(error, 'Error getting location');
    }

    /**
     * Get error message from a geolocation error.
     *
     * @param error Geolocation error.
     * @returns Geolocation message to be translated.
     */
    protected getGeolocationErrorMessage(error: CoreGeolocationError): string {
        // tslint:disable-next-line: switch-default
        switch (error.reason) {
            case CoreGeolocationErrorReason.PERMISSION_DENIED:
                return 'addon.mod_data.locationpermissiondenied';
            case CoreGeolocationErrorReason.LOCATION_NOT_ENABLED:
                return 'addon.mod_data.locationnotenabled';
        }
    }

}
