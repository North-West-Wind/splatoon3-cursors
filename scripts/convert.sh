#!/usr/bin/env sh

cd ../cursor_files

for file in *.cursor; do
	xcursorgen -p ../images $file ${file%.*}
	mv ${file%.*} ../cursors/${file%.*}
done