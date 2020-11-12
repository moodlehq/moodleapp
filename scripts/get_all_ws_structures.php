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

/**
 * Script for getting the PHP structure of a WS returns or params.
 *
 * The first parameter (required) is the path to the Moodle installation to use.
 * The second parameter (required) is the name to the WS to convert.
 * The third parameter (optional) is a number: 1 to convert the params structure,
 * 0 to convert the returns structure. Defaults to 0.
 */

if (!isset($argv[1])) {
    echo "ERROR: Please pass the Moodle path as the first parameter.\n";
    die();
}

$moodlepath = $argv[1];

define('CLI_SCRIPT', true);

require($moodlepath . '/config.php');
require($CFG->dirroot . '/webservice/lib.php');
require_once('ws_to_ts_functions.php');

$structures = get_all_ws_structures();

foreach ($structures as $wsname => $structure) {

    remove_default_closures($structure->parameters_desc);
    print_ws_structure($wsname, $structure->parameters_desc, true);

    remove_default_closures($structure->returns_desc);
    print_ws_structure($wsname, $structure->returns_desc, false);
}
