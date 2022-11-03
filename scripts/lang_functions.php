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
 * Helper functions converting moodle strings to json.
 */

function detect_languages($languages) {
    echo "\n\n\n";

    $all_languages = glob(LANGPACKSFOLDER.'/*' , GLOB_ONLYDIR);
    function get_lang_from_dir($dir) {
        return str_replace('_', '-', explode('/', $dir)[3]);
    }
    function get_lang_not_wp($langname) {
        return (substr($langname, -3) !== '-wp');
    }
    $all_languages = array_map('get_lang_from_dir', $all_languages);
    $all_languages = array_filter($all_languages, 'get_lang_not_wp');

    $detect_lang = array_diff($all_languages, $languages);
    $new_langs = [];
    foreach ($detect_lang as $lang) {
        $new = detect_lang($lang);
        if ($new) {
            $new_langs[$lang] = $lang;
        }
    }

    return $new_langs;
}

function build_languages($languages, $added_langs = []) {
    // Process the languages.
    foreach ($languages as $lang) {
        if (build_lang($lang)) {
            $added_langs[$lang] = $lang;
        }
    }

    return $added_langs;
}

/**
 * Loads lang index keys.
 */
function load_langindex() {
    global $STATS;
    global $LANGINDEX;

    $local = 0;
    $total = 0;
    // Process the index file, just once.
    $langindexjson = load_json('langindex.json');

    $LANGINDEX = [];
    foreach ($langindexjson as $appkey => $value) {
        if ($value == APPMODULENAME) {
            $file = $value;
            $lmskey = $appkey;
            $local++;
        } else {
            $exp = explode('/', $value, 2);
            $file = $exp[0];
            if (count($exp) == 2) {
                $lmskey = $exp[1];
            } else {
                $exp = explode('.', $appkey, 3);

                if (count($exp) == 3) {
                    $lmskey = $exp[2];
                } else {
                    $lmskey = $exp[1];
                }
            }
        }

        if (!isset($LANGINDEX[$file])) {
            $LANGINDEX[$file] = [];
        }

        $LANGINDEX[$file][$appkey] = $lmskey;
        $total++;
    }

    $STATS = new StdClass();
    $STATS->local = $local;
    $STATS->total = $total;

    echo "Total strings to translate $total ($local local)\n";
}

/**
 * Add lang names to config file.
 *
 * @param $langs Array of language codes to add.
 * @param $config Loaded config file.
 */
function add_langs_to_config($langs, $config) {
    $changed = false;
    $config_langs = get_object_vars($config['languages']);
    foreach ($langs as $lang) {
        if (!isset($config_langs[$lang])) {
            $langfoldername = get_langfolder($lang);

            $lmsstring = get_translation_strings($langfoldername, 'langconfig');
            $config['languages']->$lang = $lmsstring['thislanguage'];
            $changed = true;
        }
    }

    if ($changed) {
        // Sort languages by key.
        $config['languages'] = json_decode( json_encode( $config['languages'] ), true );
        ksort($config['languages']);
        $config['languages'] = json_decode( json_encode( $config['languages'] ), false );
        save_json(CONFIG, $config);
    }
}

/**
 * Save json data.
 *
 * @param $path Path of the file to load.
 * @param $content Content string to save.
 */
function save_json($path, $content) {
    file_put_contents($path, str_replace('\/', '/', json_encode($content, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))."\n");
}

/**
 * Load json data.
 *
 * @param $path Path of the file to load.
 * @return Associative array obtained from json.
 */
function load_json($path) {
    $file = file_get_contents($path);
    return (array) json_decode($file);
}

/**
 * Get's lang folder from lang code.
 *
 * @param $lang Lang code.
 * @return Folder path.
 */
function get_langfolder($lang) {
    $folder = LANGPACKSFOLDER.'/'.str_replace('-', '_', $lang);
    if (!is_dir($folder) || !is_file($folder.'/langconfig.php')) {
        return false;
    }

    return $folder;
}

/**
 * Import translation file from langpack and returns it.
 *
 * @param $langfoldername Lang folder path.
 * @param $file File name (excluding extension).
 * @param $override_folder If needed, the folder of the file to override strings.
 * @return String array.
 */
function get_translation_strings($langfoldername, $file, $override_folder = false) {
    $lmsstring = import_translation_strings($langfoldername, $file);
    if ($override_folder) {
        $override = import_translation_strings($override_folder, $file);
        $lmsstring = array_merge($lmsstring, $override);
    }

    return $lmsstring;
}

/**
 * Import translation file from langpack and returns it.
 *
 * @param $langfoldername Lang folder path.
 * @param $file File name (excluding extension).
 * @return String array.
 */
function import_translation_strings($langfoldername, $file) {

    $path = $langfoldername.'/'.$file.'.php';
    // Apply translations.
    if (!file_exists($path)) {
        return [];
    }

    $string = [];

    include($path);

    return $string;
}

/**
 * Build translations files from langpack.
 *
 * @param lang Language code.
 * @return Wether it succeeded.
 */
function build_lang($lang) {
    global $STATS;
    global $LANGINDEX;

    $langfoldername = get_langfolder($lang);
    if (!$langfoldername) {
        echo "Cannot translate $lang, folder not found";

        return false;
    }

    if (OVERRIDE_LANG_SUFIX) {
        $override_langfolder = get_langfolder($lang.OVERRIDE_LANG_SUFIX);
    } else {
        $override_langfolder = false;
    }

    $total = $STATS->total;
    $local = 0;

    $langparts = explode('-', $lang, 2);
    $parentname = $langparts[0] ? $langparts[0] : "";
    $parent = "";

    echo "Processing $lang";
    // Check parent language exists.
    if ($parentname != $lang && get_langfolder($parentname)) {
        echo " ($parentname)";
        $parent = $parentname;
    }

    $langFile = false;
    if (file_exists(ASSETSPATH.$lang.'.json')) {
        // Load lang files just once.
        $langFile = load_json(ASSETSPATH.$lang.'.json');
    }

    $translations = [];
    // Add the translation to the array.
    foreach ($LANGINDEX as $file => $keys) {
        $lmsstring = get_translation_strings($langfoldername, $file, $override_langfolder);
        foreach ($keys as $appkey => $lmskey) {
            // Apply translations.
            if (empty($lmsstring)) {
                if ($file == 'donottranslate') {
                    // Restore it form the json.
                    if ($langFile && is_array($langFile) && isset($langFile[$appkey])) {
                        $translations[$appkey] = $langFile[$appkey];
                    } else {
                        // If not present, do not count it in the total.
                        $total--;
                    }

                    continue;
                }

                if (TOTRANSLATE) {
                    echo "\n\t\tTo translate $lmskey on $file";
                }
                continue;
            }

            if (!isset($lmsstring[$lmskey]) || ($lang == 'en' && $file == APPMODULENAME)) {
                // Not yet translated. Do not override.
                if ($langFile && is_array($langFile) && isset($langFile[$appkey])) {
                    $translations[$appkey] = $langFile[$appkey];

                    if ($file == APPMODULENAME) {
                        $local++;
                    }
                }
                if (TOTRANSLATE && !isset($lmsstring[$lmskey])) {
                    echo "\n\t\tTo translate $lmskey on $file";
                }
                continue;
            }

            $text = $lmsstring[$lmskey];

            if ($file != APPMODULENAME) {
                $text = str_replace('$a->@', '$a.', $text);
                $text = str_replace('$a->', '$a.', $text);
                $text = str_replace('{$a', '{{$a', $text);
                $text = str_replace('}', '}}', $text);
                $text = preg_replace('/@@.+?@@(<br>)?\\s*/', '', $text);
                // Prevent double.
                $text = str_replace(['{{{', '}}}'], ['{{', '}}'], $text);
            } else {
                // @TODO: Remove that line when core.cannotconnect and core.login.invalidmoodleversion are completelly changed to use $a
                if (($appkey == 'core.cannotconnect' || $appkey == 'core.login.invalidmoodleversion') && strpos($text, '2.4')) {
                    $text = str_replace('2.4', '{{$a}}', $text);
                }
                $local++;
            }

            $translations[$appkey] = html_entity_decode($text);
        }
    }

    if (!empty($parent)) {
        $translations['core.parentlanguage'] = $parent;
    } else if (isset($translations['core.parentlanguage'])) {
        unset($translations['core.parentlanguage']);
    }

    // Sort and save.
    ksort($translations);
    save_json(ASSETSPATH.$lang.'.json', $translations);

    $success = count($translations);
    $percentage = floor($success/$total * 100);
    $bar = progressbar($percentage);
    if (strlen($lang) <= 2 && !$parent) {
        echo "\t";
    }
    echo "\t\t$success of $total -> $percentage% $bar ($local local)\n";

    if ($lang == 'en') {
        generate_local_module_file($LANGINDEX[APPMODULENAME], $translations);
        override_component_lang_files($translations);
    }

    return true;
}

/**
 * Generates an ASCII progress bar.
 *
 * @param $percentage Done part.
 * @param $length Length of the text.
 * @return Text generated.
 */
function progressbar($percentage, $length = 10) {
    $done = floor($percentage / $length);
    return "\t".str_repeat('=', $done) . str_repeat('-', $length - $done);
}

/**
 * Check translations on langpack and detects if the language should be added.
 *
 * @param lang Language code.
 * @return If the file should be added to the app.
 */
function detect_lang($lang) {
    global $STATS;
    global $LANGINDEX;

    $langfoldername = get_langfolder($lang);
    if (!$langfoldername) {
        echo "Cannot translate $lang, folder not found";

        return false;
    }

    $total = $STATS->total;
    $success = 0;
    $local = 0;

    $lmsstring = get_translation_strings($langfoldername, 'langconfig');
    $parent = isset($lmsstring['parentlanguage']) ? $lmsstring['parentlanguage'] : "";
    if (!isset($lmsstring['thislanguage'])) {
        echo "Cannot translate $lang, translated name not found";
        return false;
    }

    $title = $lang;
    if ($parent != "" && $parent != $lang) {
        $title .= " ($parent)";
    }
    $langname = $lmsstring['thislanguage'];
    $title .= " ".$langname." -D";

    $lmsstring = get_translation_strings($langfoldername, APPMODULENAME);
    if (!empty($lmsstring)) {
        // Add the translation to the array.
        foreach ($LANGINDEX as $file => $keys) {
            $lmsstring = get_translation_strings($langfoldername, $file);

            // Apply translations.
            if (empty($lmsstring)) {
                // Do not count non translatable in the totals.
                if ($file == 'donottranslate') {
                    $total -= count($keys);
                }
                continue;
            }

            foreach ($keys as $lmskey) {
                if (!isset($lmsstring[$lmskey])) {
                    continue;
                }

                if ($file == APPMODULENAME) {
                    $local++;
                }

                $success++;
            }
        }
    }

    echo "Checking ".$title.str_repeat("\t", 7 - floor(mb_strlen($title, 'UTF-8')/8));

    if ($local == 0) {
        echo "\tNo Mobile App strings found\n";
    } else {
        $percentage = floor($success/$total * 100);
        $bar = progressbar($percentage);

        echo "\t$success of $total -> $percentage% $bar ($local local)";
        if (($percentage > 75 && $local > 50) || ($percentage > 50 && $local > 75)) {
            echo " \t DETECTED\n";
            return true;
        }
        echo "\n";
    }

    return false;
}

/**
 * Save a key - value pair into a json file.
 *
 * @param key Key of the json object.
 * @param value Value of the json object.
 * @param filePath Path of the json file.
 */
function save_key($key, $value, $filePath) {
    $file = load_json($filePath);
    $value = html_entity_decode($value);
    if (!isset($file[$key]) || $file[$key] != $value) {
        $file[$key] = $value;
        ksort($file);
        save_json($filePath, $file);
    }
}

/**
 * Take newer ENGLISH translations from the langpacks and applies it to the app lang.json files.
 *
 * @param  [array] $translations    English translations.
 */
function override_component_lang_files($translations) {
    echo "Override component lang files.\n";
    foreach ($translations as $key => $value) {
        $path = '../src/';
        $exp = explode('.', $key, 3);

        $type = $exp[0];
        if (count($exp) == 3) {
            $component = $exp[1];
            $plainid = $exp[2];
        } else {
            $component = 'moodle';
            $plainid = $exp[1];
        }
        switch($type) {
            case 'core':
                if ($component == 'moodle') {
                    $path .= 'core/lang.json';
                } else {
                    $path .= 'core/features/'.str_replace('_', '/', $component).'/lang.json';
                }
                break;
            case 'addon':
                $path .= 'addons/'.str_replace('_', '/', $component).'/lang.json';
                break;
            case 'assets':
                $path .= $type.'/'.$component.'.json';
                break;
            default:
                $path .= $type.'/lang.json';
                break;

        }

        if (is_file($path)) {
            save_key($plainid, $value, $path);
        } else {
            echo "Cannot override: $path not found.\n";
        }
    }
}

/**
 * Generates local module file to update languages in AMOS.
 *
 * @param  [array] $appindex        Translation appindex.
 * @param  [array] $translations    English translations.
 */
function generate_local_module_file($appindex, $translations) {
    echo 'Generate '.APPMODULENAME."\n";

    $lmsstring = "";
    foreach ($appindex as $appkey => $lmskey) {
        if (isset($translations[$appkey])) {
            $lmsstring .= '$string[\''.$appkey.'\'] = \''.str_replace("'", "\'", $translations[$appkey]).'\';'."\n";
        }
    }

    if (empty($lmsstring)) {
        echo "ERROR, translations not found, you probably didn't run gulp lang!\n";

        return;
    }

    $filepath = '../../moodle-'.APPMODULENAME.'/lang/en/'.APPMODULENAME.'.php';
    $filecontents = file_get_contents($filepath);

    $startcomment = "/* AUTO START */\n";
    $endcomment = '/* AUTO END */';

    $start = strpos($filecontents, $startcomment);
    $start = $start === false ? 0 : $start + strlen($startcomment);

    $end = strpos($filecontents, $endcomment, $start);
    $end = $end === false ? strlen($filecontents) : $end;

    $filecontents = substr_replace($filecontents, $lmsstring, $start, $end - $start);

    if (substr($filecontents, -2) != "\n\n") {
        $filecontents .= "\n";
    }

    file_put_contents($filepath, $filecontents);
}
