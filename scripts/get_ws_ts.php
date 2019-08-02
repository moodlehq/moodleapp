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
 * Script for converting a PHP WS structure to a TS type.
 *
 * The first parameter (required) is the path to the Moodle installation to use.
 * The second parameter (required) is the name to the WS to convert.
 * The third parameter (optional) is the name to put to the TS type. Defaults to "TypeName".
 * The fourth parameter (optional) is a boolean: true to convert the params structure,
 * false to convert the returns structure. Defaults to false.
 */

if (!isset($argv[1])) {
    echo "ERROR: Please pass the Moodle path as the first parameter.\n";
    die();
}


if (!isset($argv[2])) {
    echo "ERROR: Please pass the WS name as the second parameter.\n";
    die();
}

$moodlepath = $argv[1];
$wsname = $argv[2];
$typename = isset($argv[3]) ? $argv[3] : 'TypeName';
$useparams = !!(isset($argv[4]) && $argv[4]);

define('CLI_SCRIPT', true);

require($moodlepath . '/config.php');
require($CFG->dirroot . '/webservice/lib.php');
require_once('ws_to_ts_functions.php');

// get all the function descriptions
$functions = $DB->get_records('external_functions', array(), 'name');
$functiondescs = array();
foreach ($functions as $function) {
    $functiondescs[$function->name] = external_api::external_function_info($function);
}

if (!isset($functiondescs[$wsname])) {
    echo "ERROR: The WS wasn't found in this Moodle installation.\n";
    die();
}

if ($useparams) {
    $structure = $functiondescs[$wsname]->parameters_desc;
    $description = "Params of WS $wsname.";
} else {
    $structure = $functiondescs[$wsname]->returns_desc;
    $description = "Result of WS $wsname.";
}

echo get_ts_doc(null, $description, '') . "export type $typename = " . convert_to_ts(null, $structure, $useparams) . ";\n";
