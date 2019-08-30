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
import { Injector, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AddonModDataFieldHandler } from '../../../providers/fields-delegate';
import { AddonModDataFieldDateComponent } from '../component/date';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Handler for date data field plugin.
 */
@Injectable()
export class AddonModDataFieldDateHandler implements AddonModDataFieldHandler {
    name = 'AddonModDataFieldDateHandler';
    type = 'date';

    constructor(private translate: TranslateService, private timeUtils: CoreTimeUtilsProvider) { }

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} field         The field object.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: any): any | Promise<any> {
        return AddonModDataFieldDateComponent;
    }

    /**
     * Get field search data in the input data.
     *
     * @param  {any} field      Defines the field to be rendered.
     * @param  {any} inputData  Data entered in the search form.
     * @return {any}            With name and value of the data to be sent.
     */
    getFieldSearchData(field: any, inputData: any): any {
        const fieldName = 'f_' + field.id,
            enabledName = 'f_' + field.id + '_z';

        if (inputData[enabledName] && typeof inputData[fieldName] == 'string') {
            const values = [],
                date = inputData[fieldName].substr(0, 10).split('-'),
                year = date[0],
                month = date[1],
                day = date[2];
            values.push({
                name: fieldName + '_y',
                value: year
            });
            values.push({
                name: fieldName + '_m',
                value: month
            });
            values.push({
                name: fieldName + '_d',
                value: day
            });
            values.push({
                name: enabledName,
                value: 1
            });

            return values;
        }

        return false;
    }

    /**
     * Get field edit data in the input data.
     *
     * @param  {any} field      Defines the field to be rendered.
     * @param  {any} inputData  Data entered in the edit form.
     * @return {any}            With name and value of the data to be sent.
     */
    getFieldEditData(field: any, inputData: any, originalFieldData: any): any {
        const fieldName = 'f_' + field.id;

        if (typeof inputData[fieldName] == 'string') {
            const values = [],
                date = inputData[fieldName].substr(0, 10).split('-'),
                year = date[0],
                month = date[1],
                day = date[2];
            values.push({
                fieldid: field.id,
                subfield: 'year',
                value: year
            });
            values.push({
                fieldid: field.id,
                subfield: 'month',
                value: month
            });
            values.push({
                fieldid: field.id,
                subfield: 'day',
                value: day
            });

            return values;
        }

        return false;
    }

    /**
     * Get field data in changed.
     *
     * @param  {any} field                  Defines the field to be rendered.
     * @param  {any} inputData              Data entered in the edit form.
     * @param  {any} originalFieldData      Original field entered data.
     * @return {Promise<boolean> | boolean} If the field has changes.
     */
    hasFieldDataChanged(field: any, inputData: any, originalFieldData: any): Promise<boolean> | boolean {
        const fieldName = 'f_' + field.id,
            input = inputData[fieldName] && inputData[fieldName].substr(0, 10) || '';

        originalFieldData = (originalFieldData && originalFieldData.content &&
                this.timeUtils.toDatetimeFormat(originalFieldData.content * 1000).substr(0, 10)) || '';

        return input != originalFieldData;
    }

    /**
     * Check and get field requeriments.
     *
     * @param  {any} field               Defines the field to be rendered.
     * @param  {any} inputData           Data entered in the edit form.
     * @return {string | false}                  String with the notification or false.
     */
    getFieldsNotifications(field: any, inputData: any): string | false {
        if (field.required &&
                (!inputData || inputData.length < 2 || !inputData[0].value || !inputData[1].value || !inputData[2].value)) {

            return this.translate.instant('addon.mod_data.errormustsupplyvalue');
        }

        return false;
    }

    /**
     * Override field content data with offline submission.
     *
     * @param  {any}  originalContent    Original data to be overriden.
     * @param  {any}  offlineContent     Array with all the offline data to override.
     * @param  {any}  [offlineFiles]     Array with all the offline files in the field.
     * @return {any}                     Data overriden
     */
    overrideData(originalContent: any, offlineContent: any, offlineFiles?: any): any {
        let date = Date.UTC(offlineContent['year'] || '', offlineContent['month'] ? offlineContent['month'] - 1 : null,
            offlineContent['day'] || null);
        date = Math.floor(date / 1000);

        originalContent.content = date || '';

        return originalContent;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
