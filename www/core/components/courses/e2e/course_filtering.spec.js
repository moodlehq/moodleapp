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
describe('User can filter courses correctly', function() {

    it('Filter course names by one letter', function (done) {
        return MM.loginAsStudent().then(function () {
            return $('[ng-model="filter.filterText"]').click();
        }).then(function () {
            return $('[ng-model="filter.filterText"]').sendKeys('a');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Psychology in Cinema');
            expect(MM.getView().getText()).toMatch('Celebrating Cultures');

        }).then(function () {
            done();
        });
    });

    it('Filter course names if it is single word or part of the word', function (done) {
        return MM.loginAsStudent().then(function () {
            return $('[ng-model="filter.filterText"]').click();
        }).then(function () {
            return $('[ng-model="filter.filterText"]').sendKeys('the');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The Impressionists');
            expect(MM.getView().getText()).toMatch('Junior Mathematics');
        }).then(function () {
            done();
        });
    });

    it('Can delete some Filtered words and again check the current filter course names', function (done) {
        return MM.loginAsStudent().then(function () {
            return $('[ng-model="filter.filterText"]').click();
        }).then(function () {
            return $('[ng-model="filter.filterText"]').sendKeys('them');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Junior Mathematics');
        }).then(function () {
            var input = $('[ng-model="filter.filterText"]');
            input.sendKeys(protractor.Key.BACK_SPACE);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The Impressionists');
            expect(MM.getView().getText()).toMatch('Junior Mathematics');
        }).then(function () {
            var input = $('[ng-model="filter.filterText"]');
            input.sendKeys(protractor.Key.BACK_SPACE);
        }).then(function () {
            var input = $('[ng-model="filter.filterText"]');
            input.sendKeys(protractor.Key.BACK_SPACE);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The Impressionists');
            expect(MM.getView().getText()).toMatch('Celebrating Cultures');
        }).then(function () {
            done();
        });
    });

});

