#!/bin/bash

TARGET_DIR="/usr/share/nginx/html/data/stats"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" || exit 1

CURRENT_MONTH=$(date +"%Y%m")
PREVIOUS_MONTH=$(date -d "$(date +%Y-%m-15) -1 month" +"%Y%m")

wget -N "${BASE_URL}/stats/recent_week.json"

mkdir -p mvd
wget -N -P mvd "${BASE_URL}/stats/mvd/${PREVIOUS_MONTH}.json"
wget -N -P mvd "${BASE_URL}/stats/mvd/${CURRENT_MONTH}.json"
wget -N -P mvd "${BASE_URL}/stats/mvd/all.json"
