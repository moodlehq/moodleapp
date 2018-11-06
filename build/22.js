webpackJsonp([22],{

/***/ 1882:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreMainMenuPageModule", function() { return CoreMainMenuPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__more__ = __webpack_require__(2007);
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






var CoreMainMenuPageModule = /** @class */ (function () {
    function CoreMainMenuPageModule() {
    }
    CoreMainMenuPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__more__["a" /* CoreMainMenuMorePage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__more__["a" /* CoreMainMenuMorePage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreMainMenuPageModule);
    return CoreMainMenuPageModule;
}());

//# sourceMappingURL=more.module.js.map

/***/ }),

/***/ 2007:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreMainMenuMorePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_delegate__ = __webpack_require__(96);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_mainmenu__ = __webpack_require__(929);
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
 * Page that displays the list of main menu options that aren't in the tabs.
 */
var CoreMainMenuMorePage = /** @class */ (function () {
    function CoreMainMenuMorePage(menuDelegate, sitesProvider, navCtrl, mainMenuProvider, eventsProvider) {
        this.menuDelegate = menuDelegate;
        this.sitesProvider = sitesProvider;
        this.navCtrl = navCtrl;
        this.mainMenuProvider = mainMenuProvider;
        this.langObserver = eventsProvider.on(__WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */].LANGUAGE_CHANGED, this.loadSiteInfo.bind(this));
        this.updateSiteObserver = eventsProvider.on(__WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */].SITE_UPDATED, this.loadSiteInfo.bind(this), sitesProvider.getCurrentSiteId());
        this.loadSiteInfo();
    }
    /**
     * View loaded.
     */
    CoreMainMenuMorePage.prototype.ionViewDidLoad = function () {
        var _this = this;
        // Load the handlers.
        this.subscription = this.menuDelegate.getHandlers().subscribe(function (handlers) {
            _this.handlers = handlers.slice(__WEBPACK_IMPORTED_MODULE_5__providers_mainmenu__["a" /* CoreMainMenuProvider */].NUM_MAIN_HANDLERS); // Remove the main handlers.
            _this.handlersLoaded = _this.menuDelegate.areHandlersLoaded();
        });
    };
    /**
     * Page destroyed.
     */
    CoreMainMenuMorePage.prototype.ngOnDestroy = function () {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    };
    /**
     * Load the site info required by the view.
     */
    CoreMainMenuMorePage.prototype.loadSiteInfo = function () {
        var _this = this;
        var currentSite = this.sitesProvider.getCurrentSite(), config = currentSite.getStoredConfig();
        this.siteInfo = currentSite.getInfo();
        this.logoutLabel = 'core.mainmenu.' + (config && config.tool_mobile_forcelogout == '1' ? 'logout' : 'changesite');
        this.showWeb = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_website');
        this.showHelp = !currentSite.isFeatureDisabled('CoreMainMenuDelegate_help');
        currentSite.getDocsUrl().then(function (docsUrl) {
            _this.docsUrl = docsUrl;
        });
        this.mainMenuProvider.getCustomMenuItems().then(function (items) {
            _this.customItems = items;
        });
    };
    /**
     * Open a handler.
     *
     * @param {CoreMainMenuHandlerData} handler Handler to open.
     */
    CoreMainMenuMorePage.prototype.openHandler = function (handler) {
        this.navCtrl.push(handler.page, handler.pageParams);
    };
    /**
     * Open an embedded custom item.
     *
     * @param {CoreMainMenuCustomItem} item Item to open.
     */
    CoreMainMenuMorePage.prototype.openItem = function (item) {
        this.navCtrl.push('CoreViewerIframePage', { title: item.label, url: item.url });
    };
    /**
     * Open settings page.
     */
    CoreMainMenuMorePage.prototype.openSettings = function () {
        this.navCtrl.push('CoreSettingsListPage');
    };
    /**
     * Logout the user.
     */
    CoreMainMenuMorePage.prototype.logout = function () {
        this.sitesProvider.logout();
    };
    CoreMainMenuMorePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-mainmenu-more',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/mainmenu/pages/more/more.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="siteInfo.sitename"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-list>\n        <a ion-item core-user-link userId="{{siteInfo.userid}}">\n            <ion-avatar item-start>\n                <img [src]="siteInfo.userpictureurl" core-external-content alt="{{ \'core.pictureof\' | translate:{$a: siteInfo.fullname} }}" role="presentation">\n            </ion-avatar>\n            <p>{{siteInfo.fullname}}</p>\n        </a>\n        <ion-item-divider color="light"></ion-item-divider>\n        <ion-item text-center *ngIf="(!handlers || !handlers.length) && !handlersLoaded">\n            <ion-spinner></ion-spinner>\n        </ion-item>\n        <a ion-item *ngFor="let handler of handlers" [ngClass]="[\'core-moremenu-handler\', handler.class]" (click)="openHandler(handler)" title="{{ handler.title | translate }}" detail-push>\n            <core-icon [name]="handler.icon" item-start></core-icon>\n            <p>{{ handler.title | translate}}</p>\n            <ion-badge item-end *ngIf="handler.showBadge" [hidden]="handler.loading || !handler.badge">{{handler.badge}}</ion-badge>\n            <ion-spinner item-end *ngIf="handler.showBadge && handler.loading"></ion-spinner>\n        </a>\n        <div *ngFor="let item of customItems" class="core-moremenu-customitem">\n            <a ion-item *ngIf="item.type != \'embedded\'" [href]="item.url" core-link [capture]="item.type == \'app\'" [inApp]="item.type == \'inappbrowser\'" title="{{item.label}}">\n                <core-icon [name]="item.icon" item-start></core-icon>\n                <p>{{item.label}}</p>\n            </a>\n            <a ion-item *ngIf="item.type == \'embedded\'" (click)="openItem(item)" title="{{item.label}}">\n                <core-icon [name]="item.icon" item-start></core-icon>\n                <p>{{item.label}}</p>\n            </a>\n        </div>\n        <a *ngIf="showWeb" ion-item [href]="siteInfo.siteurl" core-link autoLogin="yes" title="{{ \'core.mainmenu.website\' | translate }}">\n            <ion-icon name="globe" item-start></ion-icon>\n            <p>{{ \'core.mainmenu.website\' | translate }}</p>\n        </a>\n        <a *ngIf="showHelp" ion-item [href]="docsUrl" core-link autoLogin="no" title="{{ \'core.mainmenu.help\' | translate }}">\n            <ion-icon name="help-buoy" item-start></ion-icon>\n            <p>{{ \'core.mainmenu.help\' | translate }}</p>\n        </a>\n        <a ion-item (click)="openSettings()" title="{{ \'core.mainmenu.appsettings\' | translate }}">\n            <ion-icon name="cog" item-start></ion-icon>\n            <p>{{ \'core.mainmenu.appsettings\' | translate }}</p>\n        </a>\n        <a ion-item (click)="logout()" title="{{ logoutLabel | translate }}">\n            <ion-icon name="log-out" item-start></ion-icon>\n            <p>{{ logoutLabel | translate }}</p>\n        </a>\n    </ion-list>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/mainmenu/pages/more/more.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_4__providers_delegate__["a" /* CoreMainMenuDelegate */], __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_5__providers_mainmenu__["a" /* CoreMainMenuProvider */],
            __WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */]])
    ], CoreMainMenuMorePage);
    return CoreMainMenuMorePage;
}());

//# sourceMappingURL=more.js.map

/***/ })

});
//# sourceMappingURL=22.js.map