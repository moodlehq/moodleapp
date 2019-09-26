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
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModDataComponentsModule } from '../../components/components.module';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { AddonModDataHelperProvider } from '../../providers/helper';
import { CoreTagProvider } from '@core/tag/providers/tag';

/**
 * Page that displays the search modal.
 */
@IonicPage({ segment: 'addon-mod-data-search' })
@Component({
    selector: 'page-addon-mod-data-search',
    templateUrl: 'search.html',
})
export class AddonModDataSearchPage {
    search: any;
    fields: any;
    data: any;
    advancedSearch: any;
    extraImports = [AddonModDataComponentsModule];
    searchForm: FormGroup;
    jsData: any;
    fieldsArray: any;

    constructor(params: NavParams, private viewCtrl: ViewController, fb: FormBuilder, protected utils: CoreUtilsProvider,
            protected domUtils: CoreDomUtilsProvider, protected fieldsDelegate: AddonModDataFieldsDelegate,
            protected textUtils: CoreTextUtilsProvider, protected dataHelper: AddonModDataHelperProvider,
            private tagProvider: CoreTagProvider) {
        this.search = params.get('search');
        this.fields = params.get('fields');
        this.data = params.get('data');

        const advanced = {};
        if (typeof this.search.advanced == 'object') {
            Object.keys(this.search.advanced).forEach((index) => {
                if (typeof this.search.advanced[index] != 'undefined' && typeof this.search.advanced[index].name != 'undefined') {
                    advanced[this.search.advanced[index].name] = this.search.advanced[index].value ?
                        this.textUtils.parseJSON(this.search.advanced[index].value) : '';
                } else {
                    advanced[index] = this.search.advanced[index] ?
                        this.textUtils.parseJSON(this.search.advanced[index]) : '';
                }
            });
        } else {
            this.search.advanced.forEach((field) => {
                advanced[field.name] = field.value ? this.textUtils.parseJSON(field.value) : '';
            });
        }
        this.search.advanced = advanced;

        this.searchForm = fb.group({
            text: [this.search.text],
            sortBy: [this.search.sortBy || '0'],
            sortDirection: [this.search.sortDirection || 'DESC'],
            firstname: [this.search.advanced['firstname'] || ''],
            lastname: [this.search.advanced['lastname'] || '']
        });

        this.fieldsArray = this.utils.objectToArray(this.fields);
        this.advancedSearch = this.renderAdvancedSearchFields();
    }

    /**
     * Displays Advanced Search Fields.
     *
     * @return Generated HTML.
     */
    protected renderAdvancedSearchFields(): string {
        this.jsData = {
            fields: this.fields,
            form: this.searchForm,
            search: this.search.advanced
        };

        let template = this.dataHelper.getTemplate(this.data, 'asearchtemplate', this.fieldsArray),
            replace, render;

        // Replace the fields found on template.
        this.fieldsArray.forEach((field) => {
            replace = '[[' + field.name + ']]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            render = '<addon-mod-data-field-plugin mode="search" [field]="fields[' + field.id +
                ']" [form]="form" [search]="search"></addon-mod-data-field-plugin>';
            template = template.replace(replace, render);
        });

        // Not pluginable other search elements.
        // Replace firstname field by the text input.
        replace = new RegExp('##firstname##', 'gi');
        render = '<span [formGroup]="form"><ion-input type="text" name="firstname" \
        [placeholder]="\'addon.mod_data.authorfirstname\' | translate" formControlName="firstname"></ion-input></span>';
        template = template.replace(replace, render);

        // Replace lastname field by the text input.
        replace = new RegExp('##lastname##', 'gi');
        render = '<span [formGroup]="form"><ion-input type="text" name="lastname" \
        [placeholder]="\'addon.mod_data.authorlastname\' | translate" formControlName="lastname"></ion-input></span>';
        template = template.replace(replace, render);

        // Searching by tags is not supported.
        replace = new RegExp('##tags##', 'gi');
        const message = '<p class="item-dimmed">{{ \'addon.mod_data.searchbytagsnotsupported\' | translate }}</p>';
        template = template.replace(replace, this.tagProvider.areTagsAvailableInSite() ? message : '');

        return template;
    }

    /**
     * Retrieve the entered data in search in a form.
     *
     * @param searchedData Array with the entered form values.
     * @return Array with the answers.
     */
    getSearchDataFromForm(searchedData: any): any[] {
        const advancedSearch = [];

        // Filter and translate fields to each field plugin.
        this.fieldsArray.forEach((field) => {
            const fieldData = this.fieldsDelegate.getFieldSearchData(field, searchedData);

            if (fieldData) {
                fieldData.forEach((data) => {
                    data.value = JSON.stringify(data.value);
                    // WS wants values in Json format.
                    advancedSearch.push(data);
                });
            }
        });

        // Not pluginable other search elements.
        if (searchedData['firstname']) {
            // WS wants values in Json format.
            advancedSearch.push({
                name: 'firstname',
                value: JSON.stringify(searchedData['firstname'])
            });
        }

        if (searchedData['lastname']) {
            // WS wants values in Json format.
            advancedSearch.push({
                name: 'lastname',
                value: JSON.stringify(searchedData['lastname'])
            });
        }

        return advancedSearch;
    }

    /**
     * Close modal.
     *
     * @param data Data to return to the page.
     */
    closeModal(data?: any): void {
        this.viewCtrl.dismiss(data);
    }

    /**
     * Toggles between advanced to normal search.
     *
     * @param advanced True for advanced, false for basic.
     */
    changeAdvanced(advanced: boolean): void {
        this.search.searchingAdvanced = advanced;
    }

    /**
     * Done editing.
     *
     * @param e Event.
     */
    searchEntries(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        const searchedData = this.searchForm.value;

        if (this.search.searchingAdvanced) {
            this.search.advanced = this.getSearchDataFromForm(searchedData);
            this.search.searching = this.search.advanced.length > 0;
        } else {
            this.search.text = searchedData.text;
            this.search.searching = this.search.text.length > 0;
        }

        this.search.sortBy = searchedData.sortBy;
        this.search.sortDirection = searchedData.sortDirection;

        this.closeModal(this.search);
    }
}
