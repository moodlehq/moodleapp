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

describe('User can manage their contacts', function () {

    it('Search and Add a new contact', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Messages');
        }).then(function () {
            return MM.clickOn('Contacts');
        }).then(function () {
            browser.sleep(7500); // Wait to render
            $('input[placeholder="Contact name"]').sendKeys('Heather');
            return element.all(by.css('button[type="submit"]')).get(2).click();
        }).then(function () {
            return MM.clickOn('Heather Reyes');
        }).then(function () {
            return MM.clickOnElement(element(by.xpath('//a[@mm-user-link]')));
        }).then(function () {
            return MM.clickOn('Add contact');
        }).then(function () {
            browser.sleep(7500); // Wait for spinner
            return MM.goBack();
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Clear search');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Heather Reyes');
            done();
        });
    });

    it('Search and Block a contact', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Messages');
        }).then(function () {
            return MM.clickOn('Contacts');
        }).then(function () {
            browser.sleep(7500); // Wait to render
            expect(MM.getView().getText()).not.toMatch('Blocked');
            expect(MM.getView().getText()).not.toMatch('Anna Alexander');
            $('input[placeholder="Contact name"]').sendKeys('Anna Alexander');
            return element.all(by.css('button[type="submit"]')).get(2).click();
        }).then(function () {
            return MM.clickOn('Anna Alexander');
        }).then(function () {
            return MM.clickOnElement(element(by.xpath('//a[@mm-user-link]')));
        }).then(function () {
            browser.sleep(7500); // Wait to render
            return $('a[title="Block contact"]').click();
        }).then(function () {
            browser.sleep(75000); // Wait to render
            return $('.popup-buttons button[class="button ng-binding button-positive"').click();
        }).then(function () {
            browser.sleep(5000); // Wait to render
            expect(MM.getView().getText()).toMatch('Unblock contact');
            done();
        });
    });

});
