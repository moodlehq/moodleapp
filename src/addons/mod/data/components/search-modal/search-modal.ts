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

import { Component, ElementRef, Input, OnInit, Type, ViewChild, inject } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CoreTag } from '@features/tag/services/tag';
import { CoreSites } from '@services/sites';
import { CoreFormFields, CoreForms } from '@singletons/form';
import { CoreText } from '@singletons/text';
import { CoreObject } from '@singletons/object';
import { ModalController } from '@singletons';
import {
    AddonModDataField,
    AddonModDataData,
    AddonModDataSearchEntriesAdvancedField,
} from '../../services/data';
import { AddonModDataFieldsDelegate } from '../../services/data-fields-delegate';
import { AddonModDataHelper } from '../../services/data-helper';

import { AddonModDataSearchDataParams } from '../index';
import { AddonModDataTemplateType } from '../../constants';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCompileHtmlComponent } from '@features/compile/components/compile-html/compile-html';

/**
 * Page that displays the search modal.
 */
@Component({
    selector: 'addon-mod-data-search-modal',
    templateUrl: 'search-modal.html',
    styleUrls: ['../../data.scss', '../../data-forms.scss'],
    imports: [
        CoreSharedModule,
        CoreCompileHtmlComponent,
    ],
})
export class AddonModDataSearchModalComponent implements OnInit {

    protected fb = inject(FormBuilder);

    @ViewChild('searchFormEl') formElement!: ElementRef;

    @Input({ required: true }) search!: AddonModDataSearchDataParams;
    @Input({ required: true }) fields!: Record<number, AddonModDataField>;
    @Input({ required: true }) database!: AddonModDataData;

    advancedSearch = '';
    advancedIndexed: CoreFormFields = {};
    extraImports?: Type<unknown>[];

    searchForm: FormGroup = new FormGroup({});
    jsData?: {
        fields: Record<number, AddonModDataField>;
        form: FormGroup;
        search: CoreFormFields;
    };

    fieldsArray: AddonModDataField[] = [];

    async ngOnInit(): Promise<void> {
        this.advancedIndexed = {};
        this.search.advanced?.forEach((field) => {
            if (field !== undefined) {
                this.advancedIndexed[field.name] = field.value
                    ? CoreText.parseJSON(field.value, '')
                    : '';
            }
        });

        this.searchForm.addControl('text', this.fb.control(this.search.text || ''));
        this.searchForm.addControl('sortBy', this.fb.control(this.search.sortBy || '0'));
        this.searchForm.addControl('sortDirection', this.fb.control(this.search.sortDirection || 'DESC'));
        this.searchForm.addControl('firstname', this.fb.control(this.advancedIndexed['firstname'] || ''));
        this.searchForm.addControl('lastname', this.fb.control(this.advancedIndexed['lastname'] || ''));

        this.fieldsArray = CoreObject.toArray(this.fields);
        this.advancedSearch = this.renderAdvancedSearchFields();

        this.extraImports = await AddonModDataHelper.getComponentsToCompile();
    }

    /**
     * Displays Advanced Search Fields.
     *
     * @returns Generated HTML.
     */
    protected renderAdvancedSearchFields(): string {
        this.jsData = {
            fields: this.fields,
            form: this.searchForm,
            search: this.advancedIndexed,
        };

        let template = AddonModDataHelper.getTemplate(this.database, AddonModDataTemplateType.SEARCH, this.fieldsArray);

        // Replace the fields found on template.
        this.fieldsArray.forEach((field) => {
            let replace = `[[${field.name}]]`;
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            let replaceRegex = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            const render = '<addon-mod-data-field-plugin mode="search" [field]="fields[' + field.id +
                ']" [form]="form" [searchFields]="search"></addon-mod-data-field-plugin>';
            template = template.replace(replaceRegex, render);

            // Replace the field name tag.
            replace = `[[${field.name}#name]]`;
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegex = new RegExp(replace, 'gi');

            template = template.replace(replaceRegex, field.name);

            // Replace the field description tag.
            replace = `[[${field.name}#description]]`;
            replace = replace.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            replaceRegex = new RegExp(replace, 'gi');

            template = template.replace(replaceRegex, field.description);
        });

        // Not pluginable other search elements.
        // Replace firstname field by the text input.
        let replaceRegex = new RegExp('##firstname##', 'gi');
        let render = '<span [formGroup]="form"><ion-input type="text" name="firstname" \
        [placeholder]="\'addon.mod_data.authorfirstname\' | translate" formControlName="firstname"></ion-input></span>';
        template = template.replace(replaceRegex, render);

        // Replace lastname field by the text input.
        replaceRegex = new RegExp('##lastname##', 'gi');
        render = '<span [formGroup]="form"><ion-input type="text" name="lastname" \
        [placeholder]="\'addon.mod_data.authorlastname\' | translate" formControlName="lastname"></ion-input></span>';
        template = template.replace(replaceRegex, render);

        // Searching by otherfields.
        const regex = new RegExp('##otherfields##', 'gi');

        if (template.match(regex)) {
            const unusedFields = this.fieldsArray.filter(field => !template.includes(`[field]="fields[${field.id}]`)).map((field) =>
                `<p><strong>${field.name}</strong></p>` +
                    '<p><addon-mod-data-field-plugin mode="search" [field]="fields[' + field.id +
                    ']" [form]="form" [searchFields]="search"></addon-mod-data-field-plugin><p>');

            template = template.replace(regex, unusedFields.join(''));
        }

        // Searching by tags is not supported.
        replaceRegex = new RegExp('##tags##', 'gi');
        const message = CoreTag.areTagsAvailableInSite() ?
            '<p class="item-dimmed">{{ \'addon.mod_data.searchbytagsnotsupported\' | translate }}</p>'
            : '';
        template = template.replace(replaceRegex, message);

        return template;
    }

    /**
     * Retrieve the entered data in search in a form.
     *
     * @param searchedData Array with the entered form values.
     * @returns Array with the answers.
     */
    getSearchDataFromForm(searchedData: CoreFormFields): AddonModDataSearchEntriesAdvancedField[] {
        const advancedSearch: AddonModDataSearchEntriesAdvancedField[] = [];

        // Filter and translate fields to each field plugin.
        this.fieldsArray.forEach((field) => {
            const fieldData = AddonModDataFieldsDelegate.getFieldSearchData(field, searchedData);

            fieldData.forEach((data) => {
                // WS wants values in Json format.
                advancedSearch.push({
                    name: data.name,
                    value: JSON.stringify(data.value),
                });
            });
        });

        // Not pluginable other search elements.
        if (searchedData.firstname) {
            // WS wants values in Json format.
            advancedSearch.push({
                name: 'firstname',
                value: JSON.stringify(searchedData.firstname),
            });
        }

        if (searchedData.lastname) {
            // WS wants values in Json format.
            advancedSearch.push({
                name: 'lastname',
                value: JSON.stringify(searchedData.lastname),
            });
        }

        return advancedSearch;
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        ModalController.dismiss();
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

        CoreForms.triggerFormSubmittedEvent(this.formElement, false, CoreSites.getCurrentSiteId());

        ModalController.dismiss(this.search);
    }

}
