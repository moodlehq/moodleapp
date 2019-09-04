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
 * Helper functions for converting a Moodle WS structure to a TS type.
 */

/**
 * Get the structure of a WS params or returns.
 */
function get_ws_structure($wsname, $useparams) {
    global $DB;

    // get all the function descriptions
    $functions = $DB->get_records('external_functions', array(), 'name');
    $functiondescs = array();
    foreach ($functions as $function) {
        $functiondescs[$function->name] = external_api::external_function_info($function);
    }

    if (!isset($functiondescs[$wsname])) {
        return false;
    } else if ($useparams) {
        return $functiondescs[$wsname]->parameters_desc;
    } else {
        return $functiondescs[$wsname]->returns_desc;
    }
}

/**
 * Fix a comment: make sure first letter is uppercase and add a dot at the end if needed.
 */
function fix_comment($desc) {
    $desc = trim($desc);
    $desc = ucfirst($desc);

    if (substr($desc, -1) !== '.') {
        $desc .= '.';
    }

    return $desc;
}

/**
 * Get an inline comment based on a certain text.
 */
function get_inline_comment($desc) {
    if (empty($desc)) {
        return '';
    }

    return ' // ' . fix_comment($desc);
}

/**
 * Add the TS documentation of a certain element.
 */
function get_ts_doc($type, $desc, $indentation) {
    if (empty($desc)) {
        // If no key, it's probably in an array. We only document object properties.
        return '';
    }

    return $indentation . "/**\n" .
           $indentation . " * " . fix_comment($desc) . "\n" .
           (!empty($type) ? ($indentation . " * @type {" . $type . "}\n") : '') .
           $indentation . " */\n";
}

/**
 * Specify a certain type, with or without a key.
 */
function convert_key_type($key, $type, $required, $indentation) {
    if ($key) {
        // It has a key, it's inside an object.
        return $indentation . "$key" . ($required == VALUE_OPTIONAL ? '?' : '') . ": $type";
    } else {
        // No key, it's probably in an array. Just include the type.
        return $type;
    }
}

/**
 * Convert a certain element into a TS structure.
 */
function convert_to_ts($key, $value, $boolisnumber = false, $indentation = '', $arraydesc = '') {
    if ($value instanceof external_value || $value instanceof external_warnings || $value instanceof external_files) {
        // It's a basic field or a pre-defined type like warnings.
        $type = 'string';

        if ($value instanceof external_warnings) {
            $type = 'CoreWSExternalWarning[]';
        } else if ($value instanceof external_files) {
            $type = 'CoreWSExternalFile[]';
        } else if ($value->type == PARAM_BOOL && !$boolisnumber) {
            $type = 'boolean';
        } else if (($value->type == PARAM_BOOL && $boolisnumber) || $value->type == PARAM_INT || $value->type == PARAM_FLOAT ||
                $value->type == PARAM_LOCALISEDFLOAT || $value->type == PARAM_PERMISSION || $value->type == PARAM_INTEGER ||
                $value->type == PARAM_NUMBER) {
            $type = 'number';
        }

        $result = convert_key_type($key, $type, $value->required, $indentation);

        return $result;

    } else if ($value instanceof external_single_structure) {
        // It's an object.
        $result = convert_key_type($key, '{', $value->required, $indentation);

        if ($arraydesc) {
            // It's an array of objects. Print the array description now.
            $result .= get_inline_comment($arraydesc);
        }

        $result .= "\n";

        foreach ($value->keys as $key => $value) {
            $result .= convert_to_ts($key, $value, $boolisnumber, $indentation . '    ') . ';';

            if (!$value instanceof external_multiple_structure || !$value->content instanceof external_single_structure) {
                // Add inline comments after the field, except for arrays of objects where it's added at the start.
                $result .= get_inline_comment($value->desc);
            }

            $result .= "\n";
        }

        $result .= "$indentation}";

        return $result;

    } else if ($value instanceof external_multiple_structure) {
        // It's an array.
        $result = convert_key_type($key, '', $value->required, $indentation);

        $result .= convert_to_ts(null, $value->content, $boolisnumber, $indentation, $value->desc);

        $result .= "[]";

        return $result;
    } else {
        echo "WARNING: Unknown structure: $key " . get_class($value) . " \n";

        return "";
    }
}

/**
 * Concatenate two paths.
 */
function concatenate_paths($left, $right, $separator = '/') {
    if (!is_string($left) || $left == '') {
        return $right;
    } else if (!is_string($right) || $right == '') {
        return $left;
    }

    $lastCharLeft = substr($left, -1);
    $firstCharRight = $right[0];

    if ($lastCharLeft === $separator && $firstCharRight === $separator) {
        return $left . substr($right, 1);
    } else if ($lastCharLeft !== $separator && $firstCharRight !== '/') {
        return $left . '/' . $right;
    } else {
        return $left . $right;
    }
}

/**
 * Detect changes between 2 WS structures. We only detect fields that have been added or modified, not removed fields.
 */
function detect_ws_changes($new, $old, $key = '', $path = '') {
    $messages = [];

    if (gettype($new) != gettype($old)) {
        // The type has changed.
        $messages[] = "Property '$key' has changed type, from '" . gettype($old) . "' to '" . gettype($new) .
                        ($path != '' ? "' inside $path." : "'.");

    } else if ($new instanceof external_value && $new->type != $old->type) {
        // The type has changed.
        $messages[] = "Property '$key' has changed type, from '" . $old->type . "' to '" . $new->type .
                        ($path != '' ? "' inside $path." : "'.");

    } else if ($new instanceof external_warnings || $new instanceof external_files) {
        // Ignore these types.

    } else if ($new instanceof external_single_structure) {
        // Check each subproperty.
        $newpath = ($path != '' ? "$path." : '') . $key;

        foreach ($new->keys as $subkey => $value) {
            if (!isset($old->keys[$subkey])) {
                // New property.
                $messages[] = "New property '$subkey' found" . ($newpath != '' ? " inside '$newpath'." : '.');
            } else {
                $messages = array_merge($messages, detect_ws_changes($value, $old->keys[$subkey], $subkey, $newpath));
            }
        }
    } else if ($new instanceof external_multiple_structure) {
        // Recursive call with the content.
        $messages = array_merge($messages, detect_ws_changes($new->content, $old->content, $key, $path));
    }

    return $messages;
}

/**
 * Remove all closures (anonymous functions) in the default values so the object can be serialized.
 */
function remove_default_closures($value) {
    if ($value instanceof external_warnings || $value instanceof external_files) {
        // Ignore these types.

    } else if ($value instanceof external_value) {
        if ($value->default instanceof Closure) {
            $value->default = null;
        }

    } else if ($value instanceof external_single_structure) {

        foreach ($value->keys as $key => $subvalue) {
            remove_default_closures($subvalue);
        }

    } else if ($value instanceof external_multiple_structure) {
        remove_default_closures($value->content);
    }
}
