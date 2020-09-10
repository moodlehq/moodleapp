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

const exec = require('child_process').exec;
const https = require('https');
const inquirer = require('inquirer');
const fs = require('fs');
const request = require('request'); // This lib is deprecated, but it was the only way I found to make upload files work.
const DevConfig = require('./dev-config');
const Git = require('./git');
const Url = require('./url');
const Utils = require('./utils');

const apiVersion = 2;

/**
 * Class to interact with Jira.
 */
class Jira {

    /**
     * Ask the password to the user.
     *
     * @return Promise resolved with the password.
     */
    async askPassword() {
        const data = await inquirer.prompt([
            {
                type: 'password',
                name: 'password',
                message: `Please enter the password for the username ${this.username}.`,
            },
        ]);

        return data.password;
    }

    /**
     * Ask the user the tracker data.
     *
     * @return Promise resolved with the data, rejected if cannot get.
     */
    async askTrackerData() {
        const data = await inquirer.prompt([
            {
                type: 'input',
                name: 'url',
                message: 'Please enter the tracker URL.',
                default: 'https://tracker.moodle.org/',
            },
            {
                type: 'input',
                name: 'username',
                message: 'Please enter your tracker username.',
            },
        ]);

        DevConfig.save({
            'tracker.url': data.url,
            'tracker.username': data.username,
        });

        return data;
    }

    /**
     * Build URL to perform requests to Jira.
     *
     * @param uri URI to add the the Jira URL.
     * @return URL.
     */
    buildRequestUrl(uri) {
        return Utils.concatenatePaths([this.url, this.uri, '/rest/api/', apiVersion, uri]);
    }

    /**
     * Delete an attachment.
     *
     * @param attachmentId Attachment ID.
     * @return Promise resolved when done.
     */
    async deleteAttachment(attachmentId) {
        const response = await this.request(`attachment/${attachmentId}`, 'DELETE');

        if (response.status != 204) {
            throw new Error('Could not delete the attachment');
        }
    }

    /**
     * Load the issue info from jira server using a REST API call.
     *
     * @param key Key to identify the issue. E.g. MOBILE-1234.
     * @param fields Fields to get.
     * @return Promise resolved with the issue data.
     */
    async getIssue(key, fields) {
        fields = fields || '*all,-comment';

        await this.init(); // Initialize data if needed.

        const response = await this.request(`issue/${key}`, 'GET', {'fields': fields, 'expand': 'names'});

        if (response.status == 404) {
            throw new Error('Issue could not be found.');
        } else if (response.status != 200) {
            throw new Error('The tracker is not available.')
        }

        const issue = response.data;
        issue.named = {};

        // Populate the named fields in a separate key. Allows us to easily find them without knowing the field ID.
        const nameList = issue.names || {};
        for (const fieldKey in issue.fields) {
            if (nameList[fieldKey]) {
                issue.named[nameList[fieldKey]] = issue.fields[fieldKey];
            }
        }

        return issue
    }

    /**
     * Load the version info from the jira server using a rest api call.
     *
     * @return Promise resolved when done.
     */
    async getServerInfo() {
        const response = await this.request('serverInfo');

        if (response.status != 200) {
            throw new Error(`Unexpected response code: ${response.status}`, response);
        }

        this.version = response.data;
    }

    /**
     * Get tracker data to push an issue.
     *
     * @return Promise resolved with the data.
     */
    async getTrackerData() {
        // Check dev-config file first.
        let data = this.getTrackerDataFromDevConfig();

        if (data) {
            console.log('Using tracker data from dev-config file');
            return data;
        }

        // Try to use mdk now.
        try {
            data = await this.getTrackerDataFromMdk();

            console.log('Using tracker data from mdk');

            return data;
        } catch (error) {
            // MDK not available or not configured. Ask for the data.
            const data = await this.askTrackerData();

            data.fromInput = true;

            return data;
        }
    }

    /**
     * Get tracker data from dev config file.
     *
     * @return Data, undefined if cannot get.
     */
    getTrackerDataFromDevConfig() {
        const url = DevConfig.get('tracker.url');
        const username = DevConfig.get('tracker.username');

        if (url && username) {
            return {
                url,
                username,
            };
        }
    }

    /**
     * Get tracker URL and username from mdk.
     *
     * @return Promise resolved with the data, rejected if cannot get.
     */
    getTrackerDataFromMdk() {
        return new Promise((resolve, reject) => {
            exec('mdk config show tracker.url', (err, url) => {
                if (!url) {
                    reject(err || 'URL not found.');
                    return;
                }

                exec('mdk config show tracker.username', (err, username) => {
                    if (username) {
                        resolve({
                            url: url.replace('\n', ''),
                            username: username.replace('\n', ''),
                        });
                    } else {
                        reject(err | 'Username not found.');
                    }
                });
            });
        });
    }

    /**
     * Initialize some data.
     *
     * @return Promise resolved when done.
     */
    async init() {
        if (this.initialized) {
            // Already initialized.
            return;
        }

        // Get tracker URL and username.
        const trackerData = await this.getTrackerData();

        this.url = trackerData.url;
        this.username = trackerData.username;

        const parsed = Url.parse(this.url);
        this.ssl = parsed.protocol == 'https';
        this.host = parsed.domain;
        this.uri = parsed.path;

        // Get the password.
        const keytar = require('keytar');

        this.password = await keytar.getPassword('mdk-jira-password', this.username); // Use same service name as mdk.

        if (!this.password) {
            // Ask the user.
            this.password = await this.askPassword();
        }

        while (!this.initialized) {
            try {
                await this.getServerInfo();

                this.initialized = true;
                keytar.setPassword('mdk-jira-password', this.username, this.password);
            } catch (error) {
                console.log('Error connecting to the server. Please make sure you entered the data correctly.', error);
                if (trackerData.fromInput) {
                    // User entered the data manually, ask him again.
                    trackerData = await this.askTrackerData();

                    this.url = trackerData.url;
                    this.username = trackerData.username;
                }

                this.password = await this.askPassword();
            }
        }
    }

    /**
     * Check if a certain issue could be a security issue.
     *
     * @param key Key to identify the issue. E.g. MOBILE-1234.
     * @return Promise resolved with boolean: whether it's a security issue.
     */
    async isSecurityIssue(key) {
        const issue = await this.getIssue(key, 'security');

        return issue.fields && !!issue.fields.security;
    }

    /**
     * Sends a request to the server and returns the data.
     *
     * @param uri URI to add the the Jira URL.
     * @param method Method to use. Defaults to 'GET'.
     * @param params Params to send as GET params (in the URL).
     * @param data JSON string with the data to send as POST/PUT params.
     * @param headers Headers to send.
     * @return Promise resolved with the result.
     */
    request(uri, method, params, data, headers) {
        uri = uri || '';
        method = (method || 'GET').toUpperCase();
        data = data || '';
        params = params || {};
        headers = headers || {};
        headers['Content-Type'] = 'application/json';

        return new Promise((resolve, reject) => {

            // Build the request URL.
            const url = Url.addParamsToUrl(this.buildRequestUrl(uri), params);

            // Initialize the request.
            const options = {
                method: method,
                auth: `${this.username}:${this.password}`,
                headers: headers,
            };
            const request = https.request(url, options);

            // Add data.
            if (data) {
                request.write(data);
            }

            // Treat response.
            request.on('response', (response) => {
                // Read the result.
                let result = '';
                response.on('data', (chunk) => {
                    result += chunk;
                });
                response.on('end', () => {
                    try {
                        result = JSON.parse(result);
                    } catch (error) {
                        // Leave it as text.
                    }

                    resolve({
                        status: response.statusCode,
                        data: result,
                    });
                });
            });

            request.on('error', (e) => {
                reject(e);
            });

            // Send the request.
            request.end();
        });
    }

    /**
     * Sets a set of fields for a certain issue in Jira.
     *
     * @param key Key to identify the issue. E.g. MOBILE-1234.
     * @param updates Object with the fields to update.
     * @return Promise resolved when done.
     */
    async setCustomFields(key, updates) {
        const issue = await this.getIssue(key);
        const update = {'fields': {}};

        // Detect which fields have changed.
        for (const updateName in updates) {
            const updateValue = updates[updateName];
            const remoteValue = issue.named[updateName];

            if (!remoteValue || remoteValue != updateValue) {
                // Map the label of the field with the field code.
                let fieldKey;
                for (const key in issue.names) {
                    if (issue.names[key] == updateName) {
                        fieldKey = key;
                        break;
                    }
                }

                if (!fieldKey) {
                    throw new Error(`Could not find the field named ${updateName}.`);
                }

                update.fields[fieldKey] = updateValue;
            }
        }

        if (!Object.keys(update.fields).length) {
            // No fields to update.
            console.log('No updates required.')
            return;
        }

        const response = await this.request(`issue/${key}`, 'PUT', null, JSON.stringify(update));

        if (response.status != 204) {
            throw new Error(`Issue was not updated: ${response.status}`, response.data);
        }

        console.log('Issue updated successfully.');
    }

    /**
     * Upload a new attachment to an issue.
     *
     * @param key Key to identify the issue. E.g. MOBILE-1234.
     * @param filePath Path to the file to upload.
     * @return Promise resolved when done.
     */
    async upload(key, filePath) {

        const uri = `issue/${key}/attachments`;
        const headers = {
            'X-Atlassian-Token': 'nocheck',
        }

        const response = await this.uploadFile(uri, 'file', filePath, headers);

        if (response.status != 200) {
            throw new Error('Could not upload file to Jira issue');
        }

        console.log('File successfully uploaded.')
    }

    /**
     * Upload a file to Jira.
     *
     * @param uri URI to add the the Jira URL.
     * @param fieldName Name of the form field where to put the file.
     * @param filePath Path to the file.
     * @param headers Headers.
     * @return Promise resolved with the result.
     */
    async uploadFile(uri, fieldName, filePath, headers) {
        uri = uri || '';
        headers = headers || {};
        headers['Content-Type'] = 'multipart/form-data';

        return new Promise((resolve, reject) => {
            // Add the file to the form data.
            const formData = {};
            formData[fieldName] = {
                value: fs.createReadStream(filePath),
                options: {
                    filename: filePath.substr(filePath.lastIndexOf('/') + 1),
                    contentType: 'multipart/form-data',
                },
            };

            // Perform the request.
            const options = {
                url: this.buildRequestUrl(uri),
                method: 'POST',
                headers: headers,
                auth: {
                    user: this.username,
                    pass: this.password,
                },
                formData: formData,
            };

            request(options, (err, httpResponse, body) => {
                resolve({
                    status: httpResponse.statusCode,
                    data: body,
                });
            });
        });
    }
}

module.exports = new Jira();
