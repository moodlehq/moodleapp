webpackJsonp([30],{

/***/ 1873:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreLoginInitPageModule", function() { return CoreLoginInitPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__init__ = __webpack_require__(1998);
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



var CoreLoginInitPageModule = /** @class */ (function () {
    function CoreLoginInitPageModule() {
    }
    CoreLoginInitPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__init__["a" /* CoreLoginInitPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__init__["a" /* CoreLoginInitPage */]),
            ],
        })
    ], CoreLoginInitPageModule);
    return CoreLoginInitPageModule;
}());

//# sourceMappingURL=init.module.js.map

/***/ }),

/***/ 1998:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreLoginInitPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ionic_native_splash_screen__ = __webpack_require__(948);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_init__ = __webpack_require__(94);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__constants__ = __webpack_require__(30);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_helper__ = __webpack_require__(79);
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
 * Page that displays a "splash screen" while the app is being initialized.
 */
var CoreLoginInitPage = /** @class */ (function () {
    function CoreLoginInitPage(navCtrl, appProvider, initDelegate, sitesProvider, loginHelper, splashScreen) {
        this.navCtrl = navCtrl;
        this.appProvider = appProvider;
        this.initDelegate = initDelegate;
        this.sitesProvider = sitesProvider;
        this.loginHelper = loginHelper;
        this.splashScreen = splashScreen;
    }
    /**
     * View loaded.
     */
    CoreLoginInitPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        // Wait for the app to be ready.
        this.initDelegate.ready().then(function () {
            // Check if there was a pending redirect.
            var redirectData = _this.appProvider.getRedirect();
            if (redirectData.siteId && redirectData.page) {
                // Unset redirect data.
                _this.appProvider.storeRedirect('', '', '');
                // Only accept the redirect if it was stored less than 20 seconds ago.
                if (Date.now() - redirectData.timemodified < 20000) {
                    if (redirectData.siteId != __WEBPACK_IMPORTED_MODULE_6__constants__["a" /* CoreConstants */].NO_SITE_ID) {
                        // The redirect is pointing to a site, load it.
                        return _this.sitesProvider.loadSite(redirectData.siteId).then(function () {
                            if (!_this.loginHelper.isSiteLoggedOut(redirectData.page, redirectData.params)) {
                                return _this.navCtrl.setRoot(redirectData.page, redirectData.params, { animate: false });
                            }
                        }).catch(function () {
                            // Site doesn't exist.
                            return _this.loadPage();
                        });
                    }
                    else {
                        // No site to load, just open the state.
                        return _this.navCtrl.setRoot(redirectData.page, redirectData.params, { animate: false });
                    }
                }
            }
            return _this.loadPage();
        }).then(function () {
            // If we hide the splash screen now, the init view is still seen for an instant. Wait a bit to make sure it isn't seen.
            setTimeout(function () {
                _this.splashScreen.hide();
            }, 100);
        });
    };
    /**
     * Load the right page.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreLoginInitPage.prototype.loadPage = function () {
        var _this = this;
        if (this.sitesProvider.isLoggedIn()) {
            if (!this.loginHelper.isSiteLoggedOut()) {
                // User is logged in, go to site initial page.
                return this.loginHelper.goToSiteInitialPage();
            }
            else {
                // The site is marked as logged out. Logout and try again.
                return this.sitesProvider.logout().then(function () {
                    return _this.loadPage();
                });
            }
        }
        else {
            return this.sitesProvider.hasSites().then(function (hasSites) {
                if (hasSites) {
                    return _this.navCtrl.setRoot('CoreLoginSitesPage');
                }
                else {
                    return _this.loginHelper.goToAddSite(true);
                }
            });
        }
    };
    CoreLoginInitPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-login-init',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/init/init.html"*/'<ion-content>\n    <div class="core-bglogo">\n        <div class="core-logo">\n            <img src="assets/img/splash_logo.png"/>\n            <ion-spinner></ion-spinner>\n        </div>\n    </div>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/init/init.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_3__providers_app__["a" /* CoreAppProvider */], __WEBPACK_IMPORTED_MODULE_4__providers_init__["a" /* CoreInitDelegate */],
            __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_helper__["a" /* CoreLoginHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_2__ionic_native_splash_screen__["a" /* SplashScreen */]])
    ], CoreLoginInitPage);
    return CoreLoginInitPage;
}());

//# sourceMappingURL=init.js.map

/***/ })

});
//# sourceMappingURL=30.js.map