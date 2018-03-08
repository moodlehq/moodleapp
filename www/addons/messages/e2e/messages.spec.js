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

describe('User can manage their messages', function () {

    it('View user profile via chat box', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Messages');
        }).then(function () {
            return MM.clickOn('Amanda Hamilton');
        }).then(function () {
            return MM.clickOnElement(element(by.xpath('//a[@mm-user-link]')));
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Amanda Hamilton');
            done();
        });
    });

    it('Sending a message', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Messages');
        }).then(function () {
            return MM.clickOn('Amanda Hamilton');
        }).then(function () {
            browser.sleep(5000); // Wait for everything to render
            $('textarea[ng-model="newMessage"]').sendKeys('Hello World');
            browser.sleep(5000); // Wait for everything to render
            return MM.clickOn('Send');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Hello World');
            done();
        });
    });

    it('Searching a message', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Messages');
        }).then(function () {
            browser.sleep(7500); // Wait to render
            $('input[placeholder="Message"]').sendKeys('facebook');
            return MM.clickOnElement(element.all(by.css('button[type="submit"]')).get(1));
        }).then(function () {
            return MM.clickOn('Brian Franklin');
        }).then(function () {
            browser.sleep(7500); // Wait to render
            expect(MM.getView().getText()).toMatch('facebook');
        }).then(function () {
            done();
        });
    });

});
