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

describe('User can manage course glossary', function() {

    it('Click All sections course glossary tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Concepts and Characters');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('View course glossary windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Concepts and Characters');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('A glossary of the key concepts and characters involved');
            expect(MM.getView().getText()).toMatch('Dissociative Identity Disorder');
        }).then(function () {
            return MM.clickOn('A glossary of the key concepts and characters involved');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('A glossary of the key concepts and characters involved');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Click course glossary tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Concepts and Characters');
        }).then(function () {
            return MM.clickOn('Dissociative Identity Disorder');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('John Nash');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Paranoid schizophrenia');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Robert');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Tyler Durden');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Search course glossary', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Concepts and Characters');
        }).then(function () {
            return $('[ng-click="pickMode($event)"]').click();
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            return $('[ng-model="searchData.searchQuery"]').sendKeys('Tyler Durden');
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            return MM.clickOn('Tyler Durden');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Concepts and Characters');
        }).then(function () {
            return $('.secondary-buttons').click();
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

});
