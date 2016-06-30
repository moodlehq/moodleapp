/**
 * Created by Supun
 */

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

