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

describe('User can manage course choice', function () {

    it('Click About this course course choice tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('How confident are you? (1)');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('How confident are you');
        }).then(function () {
            done();
        });
    });

    it("User can manage About this course assessment choices", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn("About this course");
        }).then(function () {
            return MM.clickOn('How confident are you? (1)');
        }).then(function () {
            return MM.clickOn('Not so confident');
        }).then(function () {
            return MM.clickOn('Save my choice');
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
            return MM.clickOn("About this course");
        }).then(function () {
            return MM.clickOn('How confident are you? (1)');
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});

