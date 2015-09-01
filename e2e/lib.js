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

var MM = {},
    currentNavBar = '.nav-bar-block[nav-bar="active"]',
    currentView = 'ion-view[nav-view="active"]';

/**
 * Finds and click on a target using text.
 *
 * We do not use by.linkText() because it does not find the elements not directly visible.
 *
 * @param  {String} text Text contained in the node.
 * @param  {Element} container The container in which the node should be found.
 * @return {Promise}
 */
MM.clickOn = function(text, container) {
    var locator = by.xpath('(//a | //button | //*[contains(concat(" ",normalize-space(@class)," ")," item ")])[contains(.,"' + text + '") or contains(@aria-label,"' + text + '")]');
    if (container) {
        node = container.element(locator);
    } else {
        node = element(locator);
    }
    return MM.clickOnElement(node);
};

/**
 * Click on a element.
 *
 * This will scroll the view if required.
 *
 * @param  {Element} el
 * @return {Promise}
 */
MM.clickOnElement = function(el) {
    browser.executeScript('arguments[0].scrollIntoView(true)', el.getWebElement());
    return el.click();
};

/**
 * Click on a link in the side menu.
 *
 * @param  {String} text The link name
 * @return {Promise}
 */
MM.clickOnInSideMenu = function(text) {
    return MM.openSideMenu().then(function() {
        var menu = $('ion-side-menu[side="left"]');
        return MM.clickOn(text, menu);
    });
};

/**
 * Return the active header bar.
 *
 * @return {Element}
 */
MM.getNavBar = function() {
    return $(currentNavBar);
};

/**
 * Return the active view.
 *
 * @return {Element}
 */
MM.getView = function() {
    return $(currentView);
};

/**
 * Navigate back.
 *
 * @return {Promise}
 */
MM.goBack = function() {
    var backBtn = $(currentNavBar + ' .back-button');
    return backBtn.isPresent().then(function(present) {
        if (present) {
            return backBtn.isDisplayed().then(function(displayed) {
                if (displayed) {
                    return backBtn.click();
                }
                throw new Error('Could not find the back button.');
            });
        }
        throw new Error('Could not find the back button.');
    });
};

/**
 * Login as a user.
 *
 * @param {String} username The login
 * @param {String} password The password
 * @return {Promise}
 */
MM.loginAs = function(username, password) {
    element(by.model('siteurl'))
        .sendKeys(SITEURL);

    return $('[ng-click="connect(siteurl)"]').click()
    .then(function() {
        element(by.model('credentials.username'))
            .sendKeys(username);
        element(by.model('credentials.password'))
            .sendKeys(password);

        return $('[ng-click="login()"]').click();
    });
};

/**
 * Login as admin.
 *
 * @return {Promise}
 */
MM.loginAsAdmin = function() {
    return MM.loginAs(USERS.ADMIN.LOGIN, USERS.ADMIN.PASSWORD);
};

/**
 * Login as student.
 *
 * @return {Promise}
 */
MM.loginAsStudent = function() {
    return MM.loginAs(USERS.STUDENT.LOGIN, USERS.STUDENT.PASSWORD);
};


/**
 * Login as teacher.
 *
 * @return {Promise}
 */
MM.loginAsTeacher = function() {
    return MM.loginAs(USERS.TEACHER.LOGIN, USERS.TEACHER.PASSWORD);
};

/**
 * Logout (change site).
 *
 * @return {Promise}
 */
MM.logout = function() {
    return MM.clickOnInSideMenu('Change site');
};

/**
 * Open the side menu from anywhere.
 *
 * @return {Promise}
 */
MM.openSideMenu = function() {
    var menuBtn = $(currentNavBar + ' [menu-toggle="left"]:not(.hide)');
    function navigateBack() {
        return MM.goBack().then(function() {
            return openMenu();
        });
    }
    function openMenu() {
        return menuBtn.isPresent().then(function(present) {
            if (present) {
                return menuBtn.isDisplayed().then(function(displayed) {
                    if (displayed) {
                        return menuBtn.click();
                    }
                    return navigateBack();
                });
            }
            return navigateBack();
        });
    }
    return openMenu();
};

global.MM = global.MM || MM;
