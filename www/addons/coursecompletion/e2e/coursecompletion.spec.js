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

describe('User can manage course completion', function () {

    it('View course completion inside the course in main page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
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

    it('User can land course completion page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            return MM.clickOn('Course completion');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Course completion');
        }).then(function () {
            done();
        });
    });

    it('User can view content of course completion page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            return MM.clickOn('Course completion');
        }).then(function () {
            browser.sleep(7500);
            expect(MM.getNavBar().getText()).toMatch('Course completion');
            expect(MM.getView().getText()).toContain('Status');
            expect(MM.getView().getText()).toContain('In progress');
            expect(MM.getView().getText()).toContain('Required');
            expect(MM.getView().getText()).toContain('All criteria below are required');
        }).then(function () {
            done();
        });
    });

});
