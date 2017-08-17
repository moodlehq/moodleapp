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

describe('User can view and manage Course Overview.', function () {

    it("Land on course overview page", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Course overview');
        }).then(function () {
            done();
        });
    });

    it("Redirect to an activity via timeline", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOnElement($("a[ng-click=\"switchTab('timeline')\"]"));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Future');
        }).then(function () {
            return MM.clickOn('Feedback Your views on this course closes');
        }).then(function () {
            browser.sleep(5000);
            expect(MM.getNavBar().getText()).toMatch('Your views on this course');
        }).then(function () {
            done();
        });
    });

    it("Sort via courses in timeline view", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOnElement($("a[ng-click=\"switchTab('timeline')\"]"));
        }).then(function () {
            return MM.clickOnElement($('select[ng-change="switchSort()"]'));
        }).then(function () {
            return MM.clickOnElement($('option[value="sortbycourses"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Celebrating Cultures');
        }).then(function () {
            done();
        });
    });

    it("View courses in different grid types", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOnElement($("a[ng-click=\"switchTab('courses')\"]"));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Celebrating Cultures');
            expect($('svg').isPresent()).toBeTruthy();
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="switchGrid()"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Celebrating Cultures');
            expect($('progress').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it("Sort via courses in timeline view", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOnElement($("a[ng-click=\"switchTab('courses')\"]"));
        }).then(function () {
            return MM.clickOnElement($('select[ng-model="courses.selected"]'));
        }).then(function () {
            return MM.clickOnElement($('option[value="inprogress"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Celebrating Cultures');
        }).then(function () {
            return MM.clickOnElement($('option[value="future"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Mystère à Hyères');
        }).then(function () {
            return MM.clickOnElement($('option[value="past"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Moodle and Mountaineering');
        }).then(function () {
            done();
        });
    });

});