// (C) Copyright 2015 Moodle Pty Ltd.
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

/**
 * Handle display options included in the URL and put them in the H5PIntegration object if it exists.
 */

if (window.H5PIntegration && window.H5PIntegration.contents && location.search) {
    var contentData = window.H5PIntegration.contents[Object.keys(window.H5PIntegration.contents)[0]];

    if (contentData) {
        contentData.displayOptions = contentData.displayOptions || {};

        var search = location.search.replace(/^\?/, ''),
            split = search.split('&');

        split.forEach(function(param) {
            var nameAndValue = param.split('=');
            if (nameAndValue.length == 2) {
                contentData.displayOptions[nameAndValue[0]] = nameAndValue[1] === '1' || nameAndValue[1] === 'true';
            }
        });
    }
}
