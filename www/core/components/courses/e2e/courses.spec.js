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

describe('User can search courses', function() {

    it('User can search courses with valid word count', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            element(by.css('a[href*="#/site/mm_searchcourses"]')).click();
        }).then(function () {
            element(by.css('.mm-site_mm_searchcourses input')).sendKeys('Software Engineering');
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            element(by.xpath('/html/body/div[4]/div/div[3]/button')).click();
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[1]/ion-header-bar/button')).click();
            done();
        });
    });

    it('User can not search courses without valid word count', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            element(by.css('a[href*="#/site/mm_searchcourses"]')).click();
        }).then(function () {
            element(by.css('.mm-site_mm_searchcourses input')).sendKeys('SE');
        }).then(function () {
            expect(element(by.buttonText('Search')).isEnabled()).toBe(false);
            done();
        });

    });
});
