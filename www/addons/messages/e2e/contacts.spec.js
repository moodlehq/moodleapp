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

describe('User can manage their contacts', function() {

    it('Adding a new contact', function(done) {
        return MM.loginAsStudent().then(function() {
            return MM.clickOnInSideMenu('Messages');
        }).then(function() {
            return MM.clickOn('Contacts');
        }).then(function() {
            expect(MM.getView().getText()).not.toMatch('Heather Reyes');
            element(by.model('formData.searchString')).sendKeys('Heather');
            return MM.clickOnElement(element(by.binding('search')));
        }).then(function() {
            return MM.clickOn('Heather Reyes');
        }).then(function() {
            return MM.clickOnElement(element(by.xpath('//a[@mm-user-link]')));
        }).then(function() {
            return MM.clickOn('Add contact');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('Clear search');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Heather Reyes');
            done();
        });
    });

    it('Blocking a contact', function(done) {
        return MM.loginAsStudent().then(function() {
            return MM.clickOnInSideMenu('Messages');
        }).then(function() {
            return MM.clickOn('Contacts');
        }).then(function() {
            expect(MM.getView().getText()).not.toMatch('Blocked');
            expect(MM.getView().getText()).not.toMatch('Anna Alexander');
            element(by.model('formData.searchString')).sendKeys('Anna Alexander');
            return MM.clickOnElement(element(by.binding('search')));
        }).then(function() {
            return MM.clickOn('Anna Alexander');
        }).then(function() {
            return MM.clickOnElement(element(by.xpath('//a[@mm-user-link]')));
        }).then(function() {
            return MM.clickOn('Block contact');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('Clear search');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Blocked');
            expect(MM.getView().getText()).toMatch('Anna Alexander');
            done();
        });
    });

});
