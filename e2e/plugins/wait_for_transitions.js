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

/**
 * Locator of the current view.
 * @type {String}
 */
var currentView = 'ion-view[nav-view="active"]';

/**
 * Check if the menu is being animated.
 *
 * The default values of the side menu are being hardcoded here.
 *
 * @return {Promise} True when it is.
 */
var isMenuInTransition = function() {
    var sideMenuContentLocator = by.css('ion-side-menu-content');
    return browser.driver.isElementPresent(sideMenuContentLocator).then(function(present) {
        if (!present) {
            return false;
        }
        el = browser.driver.findElement(sideMenuContentLocator);
        return el.getLocation().then(function(location) {
            if (location.x !== 275 && location.x !== 0) {
                return true;
            }
            return false;
        });
    });
};

/**
 * Check if mmLoading is in progress.
 *
 * @return {Promise} True when it is.
 */
var isMMLoadingActive = function() {
    var mmLoadingLocator = by.css(currentView + ' .mm-loading-container:not(.hide)');
    return browser.driver.isElementPresent(mmLoadingLocator).then(function(present) {
        return present;
    });
};

/**
 * Wait for the transitions.
 *
 * We can only rely on direct driver requests here protractor would call this
 * function before executing the requests in this function.
 *
 * @return {Promise} True when the conditions are resolved.
 */
exports.waitForCondition = function() {
    return isMMLoadingActive().then(function(inTransition) {
        return !inTransition || isMenuInTransition();
    }).then(function(inTransition) {
        return inTransition;
    });
};

