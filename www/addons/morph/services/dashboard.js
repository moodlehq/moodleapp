angular.module('mm.addons.morph')
.factory('$mmaMORPHDashboard', function($mmSite, $mmCourse, $stateParams, $log, $q, $mmUser) {
    'use strict';
     var self = {};
	self.getStudents = function(courseid, userid) {
		return [
{ id:1, code: 'AUD',name: 'Ronald', lastname: 'Smith', selected: true },
{id:2, code: 'BRL', name: 'Sandra', lastname: 'Williams', selected: false },
{id:3,  code: 'CAD',name: 'Donna', lastname: 'Jones', selected: true },
{id:4, code: 'CHF',name: 'Carol', lastname: 'Taylor', selected: false },
{id:5, code: 'CNY',name: 'Laura', lastname: 'Martinez', selected: true},
{id:6, code: 'EUR',name: 'Kevin', lastname: 'Robinson', selected: true },
{id:7, code: 'GBP',name: 'Sarah', lastname: 'Garcia', selected: true },
{id:8, code: 'IDR',name: 'Kimberly', lastname: 'Lewis', selected: false },
{id:9, code: 'ILS',name: 'Deborah', lastname: 'Walker', selected: false },
{id:10, code: 'MXN',name: 'Jason', lastname: 'King', selected: true },
{ id:11,code: 'NOK',name: 'Anthony', lastname: 'Wright', selected: false },
{ id:12,code: 'NZD',name: 'Patricia', lastname: 'Hill', selected: false },
{id:13, code: 'PLN',name: 'Barbara', lastname: 'Scott', selected: false },
{id:14, code: 'RON',name: 'Linda', lastname: 'Baker', selected: false },
{id:15, code: 'RUB',name: 'Jeff', lastname: 'Campbell', selected: true },
{id:16, code: 'SEK',name: 'Susan', lastname: 'Phillips', selected: false },
{id:17, code: 'SGD',name: 'Dorothy', lastname: 'Evans', selected: false },
{id:18, code: 'USD',name: 'Edward', lastname: 'Collins', selected: true },
{ id:19,code: 'ZAR',name: 'Brian', lastname: 'Morgan', selected: false }
];
	};
	return self;
});