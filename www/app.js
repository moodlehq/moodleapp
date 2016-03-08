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

// Dependencies will be automatically added here, the following line must declare ionic as first dependency
// and should not be split into multiple lines, see gulpfile.js.
angular.module('mm', ['ionic', 'ngCordova', 'angular-md5', 'pascalprecht.translate', 'ngAria', 'ngIOS9UIWebViewPatch'])

.run(function($ionicPlatform) {
	$ionicPlatform.ready(function() {
		if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
			window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
		}
		if (window.StatusBar) {
			StatusBar.styleDefault();
		}
	});
});
