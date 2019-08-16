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
import { AddonModDataFieldTextHandler } from '../../text/providers/handler';
import { AddonModDataFieldUrlComponent } from '../component/url';

/**
 * Handler for url data field plugin.
 */
@Injectable()
export class AddonModDataFieldUrlHandler extends AddonModDataFieldTextHandler {
    name = 'AddonModDataFieldUrlHandler';
    type = 'url';

    constructor(protected translate: TranslateService) {
        super(translate);
    }

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} field         The field object.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: any): any | Promise<any> {
        return AddonModDataFieldUrlComponent;
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

        return [
            {
                fieldid: field.id,
                subfield: '0',
                value: (inputData[fieldName] && inputData[fieldName].trim()) || ''
            }
        ];
    }

    /**
     * Check and get field requeriments.
     *
     * @param  {any} field               Defines the field to be rendered.
     * @param  {any} inputData           Data entered in the edit form.
     * @return {string | false}                  String with the notification or false.
     */
    getFieldsNotifications(field: any, inputData: any): string | false {
        if (field.required && (!inputData || !inputData.length || !inputData[0].value)) {
            return this.translate.instant('addon.mod_data.errormustsupplyvalue');
        }

        return false;
    }
}
