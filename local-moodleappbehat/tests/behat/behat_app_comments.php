<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.

require_once(__DIR__ . '/../../../../lib/behat/behat_base.php');

use Behat\Gherkin\Node\TableNode;

/**
 * Moodle App steps definitions for comments feature.
 *
 * @package core
 * @category test
 * @copyright 2022 Noel De Martin
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_app_comments extends behat_base {

    /**
     * Creates blog entries.
     *
     * @Given the following blog entries exist:
     * @param TableNode $data Table data
     */
    public function the_following_blog_entries_exist(TableNode $data) {
        // TODO remove this once MDL-75084 is integrated
        global $CFG, $DB;

        require_once($CFG->dirroot . '/blog/locallib.php');

        $entries = $data->getColumnsHash();

        foreach ($entries as $entrydata) {
            $entrydata['userid'] = $DB->get_field('user', 'id', ['username' => $entrydata['user']]);
            $entrydata['publishstate'] = $entrydata['publishstate'] ?? 'site';
            $entrydata['summary'] = $entrydata['summary'] ?? $entrydata['body'];

            unset($entrydata['user']);

            $entry = new blog_entry(null, $entrydata);
            $entry->add();
        }
    }
}
