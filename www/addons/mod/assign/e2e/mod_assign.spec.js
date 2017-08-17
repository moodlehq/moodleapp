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

describe('User can manage course assign', function () {

    it('View course assign windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Keep it short!');
        }).then(function () {
            done();
        });
    });

    it('Click description tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            return MM.clickOn('Keep it short!');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Keep it short!');
        }).then(function () {
            done();
        });
    });

    it('Add text submission', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            return MM.clickOn('Add submission');
        }).then(function () {
            browser.sleep(10000);
            browser.switchTo().frame($('.cke').$('.cke_inner').$('.cke_contents').$('iframe').click().sendKeys('Hello'));
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="save()"]'));
        }).then(function () {
            done();
        });
    });

    it('Click Add file submission button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 2 (Upload)');
        }).then(function () {
            return MM.clickOn('Add submission');
        }).then(function () {
            return MM.clickOn('Add file');
        }).then(function () {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});