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

describe('User can view and manage their profile', function () {

    it('Visit the user profile', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.openSideMenu();
        }).then(function () {
            return MM.clickOnElement($('a[userid="56"]'));
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Barbara Gardner');
            expect(MM.getView().getText()).toContain('Barbara Gardner');
            expect(MM.getView().getText()).toContain('Orange City, Australia');
        }).then(function () {
            done();
        });
    });

    it('View user details page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.openSideMenu();
        }).then(function () {
            return MM.clickOnElement($('a[userid="56"]'));
        }).then(function () {
            return MM.clickOn('Details');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Contact');
            expect(MM.getView().getText()).toContain('Email address');
            expect(MM.getView().getText()).toContain('User details');
            expect(MM.getView().getText()).toContain('Interests');
            expect(MM.getView().getText()).toContain('music, horses, friends, Films');
            expect(MM.getView().getText()).toContain("Description");
            expect(MM.getView().getText()).toContain("I'm Barbara but friends call me B");
        }).then(function () {
            done();
        });
    });

    it('View user learning plans incompetent one', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.openSideMenu();
        }).then(function () {
            return MM.clickOnElement($('a[userid="56"]'));
        }).then(function () {
            return MM.clickOn('Learning plans');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Learning plans');
            return MM.clickOn('Digital Literacies Basics');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Digital Literacies Basics');
            expect($('progress').isDisplayed()).toBeTruthy();
            expect(MM.getView().getText()).toContain('Learning plan competencies');
        }).then(function () {
            return MM.clickOn('220221072');
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('220221072');
            expect(MM.getView().getText()).toContain('remix content into something new');
            expect(MM.getView().getText()).toContain('Proficient');
            expect(MM.getView().getText()).toContain('No');
            expect(MM.getView().getText()).toContain('Cross-referenced competencies');
            expect(MM.getView().getText()).toContain('Digital Literacies (Starter level)');
        }).then(function () {
            done();
        });
    });

    it('View user learning plans competent one', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.openSideMenu();
        }).then(function () {
            return MM.clickOnElement($('a[userid="56"]'));
        }).then(function () {
            return MM.clickOn('Learning plans');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Learning plans');
            return MM.clickOn('Digital Literacies Basics');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Digital Literacies Basics');
            expect($('progress').isDisplayed()).toBeTruthy();
            expect(MM.getView().getText()).toContain('Learning plan competencies');
        }).then(function () {
            return MM.clickOn('220220174');
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('220220174');
            expect(MM.getView().getText()).toContain('get involved locally and nationally');
            expect(MM.getView().getText()).toContain('Proficient');
            expect(MM.getView().getText()).toContain('Yes');
            expect(MM.getView().getText()).toContain('Cross-referenced competencies');
            expect(MM.getView().getText()).toContain('Competent');
            expect(MM.getView().getText()).toContain('Digital Literacies (Starter level)');
        }).then(function () {
            done();
        });
    });

    it('View user badge page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.openSideMenu();
        }).then(function () {
            return MM.clickOnElement($('a[userid="56"]'));
        }).then(function () {
            return MM.clickOn('Badges');
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('Badges');
            expect(MM.getView().getText()).toContain('Analysis');
            expect(MM.getView().getText()).toContain('2014');
            expect(MM.getView().getText()).toContain('Subject Knowledge');
            expect(MM.getView().getText()).toContain('Moodle Support Hero');
            expect(MM.getView().getText()).toContain('Assignment Superstar');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('Analysis');
            expect($('img[ng-src="http://school.demo.moodle.net/pluginfile.php/411/user/icon/boost/f1?rev=2472"]').isPresent()).toBeTruthy();
            expect(MM.getView().getText()).toContain('Recipient details');
            expect(MM.getView().getText()).toContain('Barbara Gardner');
            expect(MM.getView().getText()).toContain('Issuer details');
            expect(MM.getView().getText()).toContain('Mount Orange school');
        }).then(function () {
            done();
        });
    });

});