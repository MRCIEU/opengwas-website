#!/bin/bash

TARGET_DIR="/usr/share/nginx/html/data/gwasinfo"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" || exit 1

wget -N "${BASE_URL}/gwasinfo/gwasinfo.json"
wget -N "${BASE_URL}/gwasinfo/gwasinfo_batches.json"
