#!/bin/bash

# Search tags.
declare -A tags

for feature in `find ./src/ -iname *.feature`
do
    tag=`head -n 1 $feature | sed -E s/\\\\s+.*//`
    tags[$tag]=$tag
done

# Serialize to JSON.
tags_json="["

for tag in "${tags[@]}"
do
    tags_json+="\"$tag\","
done

tags_json="${tags_json%?}"
tags_json+="]"

# Print to console.
echo $tags_json
