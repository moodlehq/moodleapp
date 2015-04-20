#!/bin/sh
# setup test data for author article topic.

BK="ydn-aat-1"

gsutil mb gs://$BK

gsutil setacl acl.xml gs://$BK
gsutil setdefacl default-acl.xml gs://$BK
gsutil setcors cors.xml  gs://$BK

gsutil -m cp -r -z json data/* gs://$BK
gsutil -m setmeta -h "Content-Type:application/json" -h "Cache-Control:public, max-age=3600" gs://$BK/article/*
gsutil -m setmeta -h "Content-Type:application/json" -h "Cache-Control:public, max-age=3600" gs://$BK/author/*