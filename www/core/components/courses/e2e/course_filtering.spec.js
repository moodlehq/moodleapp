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
describe('User can filter courses correctly', function () {

    it('Filter course names by one letter', function (done) {
        return MM.loginAsStudent().then(function () {
            browser.sleep(5000); // Wait to render and become clickable.
            return MM.clickOnElement($('a[ng-click="switchFilter()"]'));
        }).then(function () {
            return $('[ng-model="courses.filter"]').sendKeys('a');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Celebrating Cultures');
            expect(MM.getView().getText()).toContain('Digital Literacy');
        }).then(function () {
            done();
        });
    });

    it('Filter course names if it is single word or part of the word', function (done) {
        return MM.loginAsStudent().then(function () {
            browser.sleep(5000); // Wait to render and become clickable.
            return MM.clickOnElement($('a[ng-click="switchFilter()"]'));
        }).then(function () {
            browser.sleep(5000); // Wait to render
            return $('[ng-model="courses.filter"]').sendKeys('the');
        }).then(function () {
            expect(MM.getView().getText()).toContain('The Impressionists');
            expect(MM.getView().getText()).toContain('English: The Lake Poets');
        }).then(function () {
            done();
        });
    });

    it('Can delete some Filtered words and again check the current filter course names', function (done) {
        return MM.loginAsStudent().then(function () {
            browser.sleep(5000); // Wait to render and become clickable.
            return MM.clickOnElement($('a[ng-click="switchFilter()"]'));
        }).then(function () {
            browser.sleep(5000); // Wait to render
            return $('[ng-model="courses.filter"]').sendKeys('the ');
        }).then(function () {
            expect(MM.getView().getText()).toContain('English: The Lake Poets');
        }).then(function () {
            var input = $('[ng-model="courses.filter"]');
            input.sendKeys(protractor.Key.BACK_SPACE);
        }).then(function () {
            expect(MM.getView().getText()).toContain('The Impressionists');
            expect(MM.getView().getText()).toContain('English: The Lake Poets');
        }).then(function () {
            var input = $('[ng-model="courses.filter"]');
            input.sendKeys(protractor.Key.BACK_SPACE);
        }).then(function () {
            var input = $('[ng-model="courses.filter"]');
            input.sendKeys(protractor.Key.BACK_SPACE);
        }).then(function () {
            expect(MM.getView().getText()).toContain('Digital Literacy');
            expect(MM.getView().getText()).toContain('Celebrating Cultures');
        }).then(function () {
            done();
        });
    });

});

