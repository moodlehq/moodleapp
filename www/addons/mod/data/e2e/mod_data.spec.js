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

describe('User can manage course database', function () {

    it('View course database', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Give us a few details');
        }).then(function () {
            done();
        });
    });

    it('View a database entry', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return MM.clickOn('Frankie');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Frankie');
            expect(MM.getView().getText()).toMatch('Here for the music!');
        }).then(function () {
            done();
        });
    });

    it('Traverse the database entry', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return MM.clickOn('Frankie');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoEntry(previousId)"]'));
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoEntry(previousId)"]'));
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoEntry(nextId)"]'));
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoEntry(nextId)"]'));
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Frankie');
            expect(MM.getView().getText()).toMatch('Here for the music!');
        }).then(function () {
            done();
        });
    });

    it('Add a database entry', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('button[ng-click="showContextMenu($event)"]').click();
        }).then(function () {
            return MM.clickOn('Add entries');
        }).then(function () {
            browser.sleep(5000);
            return $('input[name="f_164"]').sendKeys("sampleEntry");
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            return browser.switchTo().frame($('#cke_1_contents iframe').click().sendKeys('Sample description'));
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="save()"]'));
        }).then(function () {
            done();
        });
    });

    it('Search database entries', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return $('.secondary-buttons').$('button[ng-click="showSearch($event)"]').click();
        }).then(function () {
            return $('input[ng-model="search.text"]').sendKeys('sample');
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="searchEntries(0)"]'));
        }).then(function () {
            return MM.clickOn('sampleEntry');
        }).then(function () {
            expect(MM.getView().getText()).toContain('sampleEntry');
        }).then(function () {
            done();
        });
    });

    it('View and Edit the added Database entry', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return MM.clickOnElement($('a[title="Edit"]'));
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            $('input[name="f_164"]').sendKeys("edited");
        }).then(function () {
            browser.switchTo().frame($('#cke_1_contents iframe').click().sendKeys('Edited'));
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="save()"]'));
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return MM.clickOn('sampleEntryedited');
        }).then(function () {
            done();
        });
    });

    it('Delete the added Database entry', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return MM.clickOnElement($('a[title="Delete"]'));
        }).then(function () {
            return MM.clickOn("OK");
        }).then(function () {
            expect(MM.getView().getText()).not.toContain('edited');
        }).then(function () {
            done();
        });
    });

    it('Visit user profiles from database', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            return MM.clickOnElement($('a[title="Brian Franklin"]'));
        }).then(function () {
            browser.sleep(20000);
            expect(MM.getNavBar().getText()).toMatch('Brian Franklin');
            expect(MM.getView().getText()).toContain('Orange City, Australia');
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
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learner database');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('button[ng-click="showContextMenu($event)"]').click();
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});