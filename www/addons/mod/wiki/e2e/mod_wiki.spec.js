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

describe('User can manage course wiki', function () {

    it('View course wiki', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Share examples of digital literacy");
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            expect(MM.getNavBar().getText()).toMatch("The 8 elements");
            expect(MM.getView().getText()).toContain('Go to one of these pages and add examples');
            expect(MM.getView().getText()).toContain('View page');
            expect(MM.getView().getText()).toContain('Map');
        }).then(function () {
            done();
        });
    });

    it('Click Communicative in course wiki', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Share examples of digital literacy");
        }).then(function () {
            return MM.clickOn('Communicative');
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            expect(MM.getNavBar().getText()).toMatch("Communicative");
            expect(MM.getView().getText()).toContain('This is about understanding the different ways');
            expect(MM.getView().getText()).toContain('View page');
            expect(MM.getView().getText()).toContain('Map');
        }).then(function () {
            done();
        });
    });

    it('Click secondary buttons in course wiki', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Share examples of digital literacy");
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it('Add a new wiki item', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Share examples of digital literacy");
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return MM.clickOnElement($('[ng-click="showContextMenu($event)"]'));
        }).then(function () {
            return MM.clickOn('Create page');
        }).then(function () {
            $('input[ng-model="page.title"]').sendKeys('ABCSampleEdit');
            browser.sleep(10000);
            browser.switchTo().frame($('.cke').$('.cke_inner').$('.cke_contents').$('iframe').click().sendKeys('Hello'));
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="save()"]'));
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="goHomeWiki()"]'));
        }).then(function () {
            done();
        });
    });

    it('Edit a wiki item', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Share examples of digital literacy");
        }).then(function () {
            return MM.clickOnElement($('[ng-click="showContextMenu($event)"]'));
        }).then(function () {
            return MM.clickOn('Edit');
        }).then(function () {
            browser.sleep(10000);
            browser.switchTo().frame($('.cke').$('.cke_inner').$('.cke_contents').$('iframe').click().sendKeys('HelloWorld'));
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="save()"]'));
        }).then(function () {
            done();
        });
    });

});