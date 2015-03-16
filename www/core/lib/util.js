angular.module('mm.core')

.provider('$mmUtil', function() {

    this.param = function(obj) {
        var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

        for (name in obj) {
            value = obj[name];

            if (value instanceof Array) {
                for (i = 0; i < value.length; ++i) {
                    subValue = value[i];
                    fullSubName = name + '[' + i + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += param(innerObj) + '&';
                }
            }
            else if (value instanceof Object) {
                for (subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += param(innerObj) + '&';
                }
            }
            else if (value !== undefined && value !== null) query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
        }

        return query.length ? query.substr(0, query.length - 1) : query;
    };

    function mmUtil($mmSite, $ionicLoading) {

        /**
         * Formats a URL, trim, lowercase, etc...
         * @param  {str} url The url to be formatted
         * @return {str}     The url formatted
         */
        this.formatURL = function(url) {

            url = url.trim();

            // Check if the URL starts by http or https.
            if (! /^http(s)?\:\/\/.*/i.test(url)) {
                // Test first allways https.
                url = "https://" + url;
            }

            // http allways in lowercase.
            url = url.replace(/^http/i, 'http');
            url = url.replace(/^https/i, 'https');

            // Replace last slash.
            url = url.replace(/\/$/, "");

            return url;
        };

        /**
         * Validates a URL for a specific pattern.
         * @param {String} url The url to test against the pattern
         * @return {bool} TRUE if the url matches the expected pattern.
         *                FALSE otherwise.
         */
        this.isValidURL = function(url) {
            return /^http(s)?\:\/\/([\da-zA-Z\.-]+)\.([\da-zA-Z\.]{2,6})([\/\w \.-]*)*\/?/i.test(url);
        };

        /**
         * This function downloads a file from Moodle if the file is already downloaded the function replaces the www reference with
         * the internal file system reference
         *
         * @param  {string} file The file path (usually a url)
         * @return {string}      A local or URL path
         */
        this.getMoodleFilePath = function (fileurl, courseId, siteId, token) {

            return fileurl;

            // This function is used in regexp callbacks, better not to risk!!
            // if (!fileurl) {
            //     return '';
            // }

            // if (!courseId) {
            //     courseId = 1;
            // }

            // if (!siteId) {
            //     siteId = MM.config.current_site.id;
            // }

            // if (!token) {
            //     var site = MM.db.get('sites', siteId);
            //     token = site.get('token');
            // }

            // var downloadURL = MM.fixPluginfile(fileurl, token);
            // var extension = "." + fileurl.split('.').pop();
            // if (extension.indexOf(".php") === 0) {
            //     extension = "";
            // }

            // var filename = hex_md5(fileurl) + extension;

            // var path = {
            //     directory: siteId + "/" + courseId,
            //     file:      siteId + "/" + courseId + "/" + filename
            // };

            // // We download the file asynchronously because this function must to be sync.
            // MM.fs.init(function() {
            //     MM.fs.fileExists(path.file,
            //     function(path) {
            //         MM.util.replaceFile(downloadURL, path);
            //     },
            //     function() {});

            //     if (MM.deviceConnected()) {
            //         MM.log("Starting download of Moodle file: " + downloadURL);
            //         // All the functions are asynchronous, like createDir.
            //         MM.fs.createDir(path.directory, function() {
            //             MM.log("Downloading Moodle file to " + path.file + " from URL: " + downloadURL);

            //             MM.moodleDownloadFile(downloadURL, path.file,
            //                 function(fullpath) {
            //                     MM.util.replaceFile(downloadURL, fullpath);
            //                     MM.log("Download of content finished " + fullpath + " URL: " + downloadURL);
            //                 },
            //                 function(fullpath) {
            //                    MM.log("Error downloading " + fullpath + " URL: " + downloadURL);
            //                 }
            //             );
            //         });
            //     }
            // });

            // return downloadURL;
        };

        /**
         * Displays a loading modal window
         *
         * @param {string} title The text of the modal window
         */
        this.showModalLoading = function(text) {
            $ionicLoading.show({
                template: '<i class="icon ion-load-c">'+text
            });
        };

        /**
         * Close a modal loading window
         */
        this.closeModalLoading = function() {
            $ionicLoading.hide();
        };
    }

    this.$get = function($mmSite, $ionicLoading) {
        return new mmUtil($mmSite, $ionicLoading);
    };
});
