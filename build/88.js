webpackJsonp([88],{

/***/ 1811:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModDataSearchPageModule", function() { return AddonModDataSearchPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(385);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__search__ = __webpack_require__(1932);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__core_compile_components_compile_html_compile_html_module__ = __webpack_require__(386);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};







var AddonModDataSearchPageModule = /** @class */ (function () {
    function AddonModDataSearchPageModule() {
    }
    AddonModDataSearchPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_5__search__["a" /* AddonModDataSearchPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* AddonModDataComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_6__core_compile_components_compile_html_compile_html_module__["a" /* CoreCompileHtmlComponentModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_5__search__["a" /* AddonModDataSearchPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModDataSearchPageModule);
    return AddonModDataSearchPageModule;
}());

//# sourceMappingURL=search.module.js.map

/***/ }),

/***/ 1932:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModDataSearchPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_components_module__ = __webpack_require__(385);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_fields_delegate__ = __webpack_require__(63);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};








/**
 * Page that displays the search modal.
 */
var AddonModDataSearchPage = /** @class */ (function () {
    function AddonModDataSearchPage(params, viewCtrl, fb, utils, domUtils, fieldsDelegate, textUtils) {
        var _this = this;
        this.viewCtrl = viewCtrl;
        this.utils = utils;
        this.domUtils = domUtils;
        this.fieldsDelegate = fieldsDelegate;
        this.textUtils = textUtils;
        this.extraImports = [__WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* AddonModDataComponentsModule */]];
        this.search = params.get('search');
        this.fields = params.get('fields');
        this.data = params.get('data');
        var advanced = {};
        if (typeof this.search.advanced == 'object') {
            Object.keys(this.search.advanced).forEach(function (index) {
                if (typeof _this.search.advanced[index] != 'undefined' && typeof _this.search.advanced[index].name != 'undefined') {
                    advanced[_this.search.advanced[index].name] = _this.search.advanced[index].value ?
                        _this.textUtils.parseJSON(_this.search.advanced[index].value) : '';
                }
                else {
                    advanced[index] = _this.search.advanced[index] ?
                        _this.textUtils.parseJSON(_this.search.advanced[index]) : '';
                }
            });
        }
        else {
            this.search.advanced.forEach(function (field) {
                advanced[field.name] = field.value ? _this.textUtils.parseJSON(field.value) : '';
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
     * @return {string}         Generated HTML.
     */
    AddonModDataSearchPage.prototype.renderAdvancedSearchFields = function () {
        if (!this.data.asearchtemplate) {
            return '';
        }
        this.jsData = {
            fields: this.fields,
            form: this.searchForm,
            search: this.search.advanced
        };
        var template = this.data.asearchtemplate, replace, render;
        // Replace the fields found on template.
        this.fieldsArray.forEach(function (field) {
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
        return template;
    };
    /**
     * Retrieve the entered data in search in a form.
     *
     * @param {any} searchedData Array with the entered form values.
     * @return {any[]}          Array with the answers.
     */
    AddonModDataSearchPage.prototype.getSearchDataFromForm = function (searchedData) {
        var _this = this;
        var advancedSearch = [];
        // Filter and translate fields to each field plugin.
        this.fieldsArray.forEach(function (field) {
            var fieldData = _this.fieldsDelegate.getFieldSearchData(field, searchedData);
            if (fieldData) {
                fieldData.forEach(function (data) {
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
    };
    /**
     * Close modal.
     *
     * @param {any} [data] Data to return to the page.
     */
    AddonModDataSearchPage.prototype.closeModal = function (data) {
        this.viewCtrl.dismiss(data);
    };
    /**
     * Toggles between advanced to normal search.
     */
    AddonModDataSearchPage.prototype.toggleAdvanced = function () {
        this.search.searchingAdvanced = !this.search.searchingAdvanced;
    };
    /**
     * Done editing.
     */
    AddonModDataSearchPage.prototype.searchEntries = function () {
        var searchedData = this.searchForm.value;
        if (this.search.searchingAdvanced) {
            this.search.advanced = this.getSearchDataFromForm(searchedData);
            this.search.searching = this.search.advanced.length > 0;
        }
        else {
            this.search.text = searchedData.text;
            this.search.searching = this.search.text.length > 0;
        }
        this.search.sortBy = searchedData.sortBy;
        this.search.sortDirection = searchedData.sortDirection;
        this.closeModal(this.search);
    };
    AddonModDataSearchPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-data-search',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/data/pages/search/search.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'addon.mod_data.search\' | translate }}</ion-title>\n        <ion-buttons end>\n            <button ion-button icon-only (click)="closeModal()" [attr.aria-label]="\'core.close\' | translate">\n                <ion-icon name="close"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <div class="fixed-content core-tabs-bar">\n        <a class="tab-slide" [attr.aria-selected]="!search.searchingAdvanced" (click)="toggleAdvanced()">{{ \'addon.mod_data.search\' | translate}}</a>\n        <a class="tab-slide" [attr.aria-selected]="search.searchingAdvanced" (click)="toggleAdvanced()">{{ \'addon.mod_data.advancedsearch\' | translate }}</a>\n    </div>\n    <form (ngSubmit)="searchEntries()" [formGroup]="searchForm">\n        <ion-list no-margin>\n            <ion-item [hidden]="search.searchingAdvanced">\n                <ion-input type="text" placeholder="{{ \'addon.mod_data.search\' | translate}}" [(ngModel)]="search.text" name="text" formControlName="text"></ion-input>\n            </ion-item>\n            <ion-item text-wrap>\n                <ion-label stacked>{{ \'core.sortby\' | translate }}</ion-label>\n                <ion-select interface="popover" name="sortBy" formControlName="sortBy">\n                    <optgroup *ngIf="fieldsArray.length" label="{{ \'addon.mod_data.fields\' | translate }}">\n                        <ion-option *ngFor="let field of fieldsArray" [value]="field.id">{{field.name}}</ion-option>\n                    </optgroup>\n                    <optgroup label="{{ \'addon.mod_data.other\' | translate }}">\n                        <ion-option value="0">{{ \'addon.mod_data.timeadded\' | translate }}</ion-option>\n                        <ion-option value="-4">{{ \'addon.mod_data.timemodified\' | translate }}</ion-option>\n                        <ion-option value="-1">{{ \'addon.mod_data.authorfirstname\' | translate }}</ion-option>\n                        <ion-option value="-2">{{ \'addon.mod_data.authorlastname\' | translate }}</ion-option>\n                        <ion-option value="-3" *ngIf="data.approval">{{ \'addon.mod_data.approved\' | translate }}</ion-option>\n                    </optgroup>\n                </ion-select>\n            </ion-item>\n            <ion-list radio-group [(ngModel)]="search.sortDirection" name="sortDirection" formControlName="sortDirection">\n                <ion-item>\n                    <ion-label>{{ \'addon.mod_data.ascending\' | translate }}</ion-label>\n                    <ion-radio value="ASC"></ion-radio>\n                </ion-item>\n                <ion-item>\n                    <ion-label>{{ \'addon.mod_data.descending\' | translate }}</ion-label>\n                    <ion-radio value="DESC"></ion-radio>\n                </ion-item>\n            </ion-list>\n            <div padding [hidden]="!advancedSearch || !search.searchingAdvanced" class="addon-data-advanced-search">\n                <core-compile-html [text]="advancedSearch" [jsData]="jsData" [extraImports]="extraImports"></core-compile-html>\n            </div>\n        </ion-list>\n        <div padding>\n            <button ion-button block type="submit" icon-start>\n                <ion-icon name="search"></ion-icon>\n                {{ \'addon.mod_data.search\' | translate }}\n            </button>\n        </div>\n    </form>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/data/pages/search/search.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */], __WEBPACK_IMPORTED_MODULE_2__angular_forms__["a" /* FormBuilder */], __WEBPACK_IMPORTED_MODULE_3__providers_utils_utils__["a" /* CoreUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_fields_delegate__["a" /* AddonModDataFieldsDelegate */],
            __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__["a" /* CoreTextUtilsProvider */]])
    ], AddonModDataSearchPage);
    return AddonModDataSearchPage;
}());

//# sourceMappingURL=search.js.map

/***/ })

});
//# sourceMappingURL=88.js.map