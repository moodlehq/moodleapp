webpackJsonp([64],{

/***/ 1835:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModQuizPreflightModalModule", function() { return AddonModQuizPreflightModalModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__preflight_modal__ = __webpack_require__(1956);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
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






var AddonModQuizPreflightModalModule = /** @class */ (function () {
    function AddonModQuizPreflightModalModule() {
    }
    AddonModQuizPreflightModalModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__preflight_modal__["a" /* AddonModQuizPreflightModalPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__preflight_modal__["a" /* AddonModQuizPreflightModalPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], AddonModQuizPreflightModalModule);
    return AddonModQuizPreflightModalModule;
}());

//# sourceMappingURL=preflight-modal.module.js.map

/***/ }),

/***/ 1956:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModQuizPreflightModalPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_access_rules_delegate__ = __webpack_require__(75);
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
 * Modal that renders the access rules for a quiz.
 */
var AddonModQuizPreflightModalPage = /** @class */ (function () {
    function AddonModQuizPreflightModalPage(params, fb, translate, sitesProvider, viewCtrl, accessRuleDelegate, injector, domUtils) {
        this.viewCtrl = viewCtrl;
        this.accessRuleDelegate = accessRuleDelegate;
        this.injector = injector;
        this.domUtils = domUtils;
        this.accessRulesData = []; // Components and data for each access rule.
        this.title = params.get('title') || translate.instant('addon.mod_quiz.startattempt');
        this.quiz = params.get('quiz');
        this.attempt = params.get('attempt');
        this.prefetch = params.get('prefetch');
        this.siteId = params.get('siteId') || sitesProvider.getCurrentSiteId();
        this.rules = params.get('rules') || [];
        // Create an empty form group. The controls will be added by the access rules components.
        this.preflightForm = fb.group({});
    }
    /**
     * Component being initialized.
     */
    AddonModQuizPreflightModalPage.prototype.ngOnInit = function () {
        var _this = this;
        var promises = [];
        this.rules.forEach(function (rule) {
            // Check if preflight is required for rule and, if so, get the component to render it.
            promises.push(_this.accessRuleDelegate.isPreflightCheckRequiredForRule(rule, _this.quiz, _this.attempt, _this.prefetch, _this.siteId).then(function (required) {
                if (required) {
                    return _this.accessRuleDelegate.getPreflightComponent(rule, _this.injector).then(function (component) {
                        if (component) {
                            _this.accessRulesData.push({
                                component: component,
                                data: {
                                    rule: rule,
                                    quiz: _this.quiz,
                                    attempt: _this.attempt,
                                    prefetch: _this.prefetch,
                                    form: _this.preflightForm,
                                    siteId: _this.siteId
                                }
                            });
                        }
                    });
                }
            }));
        });
        Promise.all(promises).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error loading rules');
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Check that the data is valid and send it back.
     */
    AddonModQuizPreflightModalPage.prototype.sendData = function () {
        if (!this.preflightForm.valid) {
            // Form not valid. Scroll to the first element with errors.
            if (!this.domUtils.scrollToInputError(this.content)) {
                // Input not found, show an error modal.
                this.domUtils.showErrorModal('core.errorinvalidform', true);
            }
        }
        else {
            this.viewCtrl.dismiss(this.preflightForm.value);
        }
    };
    /**
     * Close modal.
     */
    AddonModQuizPreflightModalPage.prototype.closeModal = function () {
        this.viewCtrl.dismiss();
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonModQuizPreflightModalPage.prototype, "content", void 0);
    AddonModQuizPreflightModalPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-quiz-preflight-modal',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/quiz/pages/preflight-modal/preflight-modal.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ title | translate }}</ion-title>\n        <ion-buttons end>\n            <button ion-button icon-only (click)="closeModal()" [attr.aria-label]="\'core.close\' | translate">\n                <ion-icon name="close"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content padding class="addon-mod_quiz-preflight-modal">\n    <core-loading [hideUntil]="loaded">\n        <form ion-list [formGroup]="preflightForm" (ngSubmit)="sendData()">\n            <!-- Access rules. -->\n            <ng-container *ngFor="let data of accessRulesData; let last = last">\n                <core-dynamic-component [component]="data.component" [data]="data.data">\n                    <p padding>Couldn\'t find the directive to render this access rule.</p>\n                </core-dynamic-component>\n                <ion-item-divider color="light" *ngIf="!last"></ion-item-divider>\n            </ng-container>\n\n            <button ion-button block type="submit">\n                {{ title | translate }}\n            </button>\n        </form>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/quiz/pages/preflight-modal/preflight-modal.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_3__angular_forms__["a" /* FormBuilder */], __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_4__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */], __WEBPACK_IMPORTED_MODULE_6__providers_access_rules_delegate__["a" /* AddonModQuizAccessRuleDelegate */],
            __WEBPACK_IMPORTED_MODULE_0__angular_core__["C" /* Injector */], __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__["a" /* CoreDomUtilsProvider */]])
    ], AddonModQuizPreflightModalPage);
    return AddonModQuizPreflightModalPage;
}());

//# sourceMappingURL=preflight-modal.js.map

/***/ })

});
//# sourceMappingURL=64.js.map