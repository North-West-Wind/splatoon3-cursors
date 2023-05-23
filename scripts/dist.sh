#!/usr/bin/env sh

cd "${0%/*}/.."

# Copy cursors and remove symlinks
cp -R cursors/ cursors-nosym/
find cursors-nosym/ -type l -exec rm -f {} \;

# Convert to Windows cursors
mkdir -p wincur
x2wincur cursors-nosym/* -o wincur/

# Zip them up
mkdir -p splatoon3-cursors
cp -r cursors splatoon3-cursors/cursors
cp index.theme splatoon3-cursors/
zip -r splatoon3-cursors.zip splatoon3-cursors/

# Clean up
rm -r cursors-nosym
rm -r splatoon3-cursors