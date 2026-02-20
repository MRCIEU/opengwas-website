#!/bin/bash

TARGET_DIR="/usr/share/nginx/html/data/others"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" || exit 1

wget -O gpmap.json "https://gpmap.opengwas.io/static/opengwas_ids.json"
