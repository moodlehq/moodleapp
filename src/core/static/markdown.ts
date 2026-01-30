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
 * Static class with helper functions for markdown formatting.
 */
export class CoreMarkdown {

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Converts Markdown text to HTML, handling only line breaks and tables.
     *
     * @param markdown - Markdown-formatted text.
     * @returns HTML string.
     */
    static toHtml(markdown: string): string {
        const lines = markdown.trim().split('\n');
        const htmlLines: string[] = [];

        let inTable = false;
        let tableHeaderParsed = false;
        let inTbody = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const isTableRow = line.includes('|');
            const isSeparatorRow = /^[:\-| ]+$/.test(line);

            if (isTableRow && !isSeparatorRow) {
                const cells = line.split('|').map(cell => cell.trim()).filter(Boolean);

                if (!inTable) {
                    htmlLines.push('<table class="core-table">');
                    inTable = true;
                    tableHeaderParsed = false;
                    inTbody = false;
                }

                if (!tableHeaderParsed) {
                    // Start the table header
                    htmlLines.push('<thead>');
                    htmlLines.push('<tr>' + cells.map(cell => `<th>${cell}</th>`).join('') + '</tr>');
                    htmlLines.push('</thead>');
                    tableHeaderParsed = true;
                } else {
                    // Start tbody if not already started
                    if (!inTbody) {
                        htmlLines.push('<tbody class="auto-striped">');
                        inTbody = true;
                    }
                    htmlLines.push('<tr>' + cells.map(cell => `<td>${cell}</td>`).join('') + '</tr>');
                }
            } else if (isSeparatorRow) {
                continue; // Skip separator like | --- | --- |
            } else {
                // If we were in a table, close it
                if (inTable) {
                    if (inTbody) {
                        htmlLines.push('</tbody>');
                    }
                    htmlLines.push('</table>');
                    inTable = false;
                    inTbody = false;
                }

                htmlLines.push(`${line}<br>`);
            }
        }

        // Close open table if still active
        if (inTable) {
            if (inTbody) {
                htmlLines.push('</tbody>');
            }
            htmlLines.push('</table>');
        }

        return htmlLines.join('\n');
    }

}
