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

describe('User can manage course book', function () {

    it('Click Background reading course book tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('One approach to digital literacy');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('1. Models of digital literacy');
        }).then(function () {
            done();
        });
    });

    it('Can go through the One approach to digital literacy press next and previous icon', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('One approach to digital literacy');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('1. Models of digital literacy');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="action(next)"]'));
        }).then(function () {
            expect(MM.getView().getText()).toMatch('2. Youtube video');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="action(next)"]'));
        }).then(function () {
            expect(MM.getView().getText()).toMatch('3. Cultural');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="action(previous)"]'));
        }).then(function () {
            return MM.clickOnElement($('[ng-click="action(previous)"]'));
        }).then(function () {
            expect(MM.getView().getText()).toMatch('1. Models of digital literacy');
        }).then(function () {
            done();
        });
    });

    it('Click secondary bookmark button in One approach to digital literacy', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('One approach to digital literacy');
        }).then(function () {
            browser.sleep(5000); // Wait for everything to render
            return $('[ng-click="openToc($event)"]').click();
        }).then(function () {
            return MM.clickOn('Cognitive');
        }).then(function () {
            browser.sleep(5000); // Wait for everything to render
            expect(MM.getView().getText()).toMatch('4. Cognitive');
        }).then(function () {
            done();
        });
    });

    it('Click secondary menu button in One approach to digital literacy', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('One approach to digital literacy');
        }).then(function () {
            browser.sleep(5000); // Wait for everything to render
            return $('[ng-click="showContextMenu($event)"]').click();
        }).then(function () {
           browser.sleep(5000); // Wait for button css to render.
           expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});

