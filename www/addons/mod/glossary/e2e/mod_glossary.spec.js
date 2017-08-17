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

describe('User can manage course glossary', function () {

    it('View course glossary windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Read through and add some common terms');
            expect(MM.getView().getText()).toContain('Accessibility');
        }).then(function () {
            done();
        });
    });

    it('Click course glossary tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            return MM.clickOn('Accessibility');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Blended learning');
        }).then(function () {
            done();
        });
    });

    it('Search course glossary', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            browser.sleep(10000);
            return $('[ng-click="pickMode($event)"]').click();
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            browser.sleep(10000);
            return $('[ng-model="data.value"]').sendKeys('Accessibility');
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            return MM.clickOn('Accessibility');
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
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            return $('[ng-click="showContextMenu($event)"]').click();
        }).then(function () {
           browser.sleep(5000); // Wait for css to render.
           expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it('Add a new glossary entry', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            return MM.clickOnElement($('[ng-click="showContextMenu($event)"]'));
        }).then(function () {
            return MM.clickOn('Add a new entry');
        }).then(function () {
            return MM.clickOnElement($('input[ng-model="entry.concept"]'));
        }).then(function () {
            browser.sleep(5000);
            $('input[ng-model="entry.concept"]').sendKeys('ASampleEntry');
            browser.switchTo().frame($('.cke').$('.cke_inner').$('.cke_contents').$('iframe').click().sendKeys('ASampleDescription'));
        }).then(function () {
            return MM.clickOn('Categories');
        }).then(function () {
            return MM.clickOn('21st century terminology');
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="saveOptions();"]'));
        }).then(function () {
            $('textarea[ng-model="options.aliases"]').sendKeys('sample');
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="save()"]'));
        }).then(function () {
            return MM.clickOn('ASampleEntry');
        }).then(function () {
            expect(MM.getView().getText()).toContain('ASampleDescription');
            done();
        });
    });

});
