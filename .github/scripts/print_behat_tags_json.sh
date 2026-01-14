#!/bin/bash

# Search tags.
declare -A tags

# If the first argument is -d or --debug, enable debug output.
debug=$([[ "$1" == "-d" || "$1" == "--debug" ]] && echo "1" || echo "")

parallelrunmissing=false
for feature in `find ./src/ -iname *.feature`
do
    if [[ "$1" == "snapshots" ]] && ! grep -q -i "the UI should match the snapshot" "$feature"; then
        continue
    fi

    featuretags=`head -n 1 $feature`
    # Count non-blank lines in feature file also ignoring comments on the start of the line.
    lines=`grep -c -v -e '^[[:space:]]*$' -e '^[[:space:]]*#' $feature`
    parallelruninfile=false
    for tag in $featuretags; do
        # Only include @app_parallel_run_ tags.
        if [[ "$tag" =~ @app_parallel_run_ ]]; then
            parallelruninfile=true
            if [[ -n "${tags[$tag]}" ]]; then
                tags[$tag]=$((${tags[$tag]} + lines))
            else
                tags[$tag]="$lines"
            fi
            break
        fi
    done

    if [ "$parallelruninfile" = false ] ; then
        # Invalid or missing tag in $feature
        parallelrunmissing=true
    fi
done

# Serialize to JSON.
tags_json=""
for tag in $(printf "%s\n" "${!tags[@]}" | sort);
do
    if [ ! -z "$debug" ]; then
        lines=${tags[$tag]}
        echo "$tag - $lines lines"
    fi

    tags_json+="\"$tag\","
done

tags_json="${tags_json%?}"

# If there's any invalid tags, use the negation of all other tags.
negation=""
if [ "$parallelrunmissing" = true ] ; then
    for tag in $(printf "%s\n" "${!tags[@]}" | sort);
    do
        negation+="~${tag}&&"
    done
    tags_json="${tags_json},\"${negation%??}\""
fi

# Print to console.
echo "[${tags_json}]"
