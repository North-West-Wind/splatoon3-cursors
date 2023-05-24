#!/usr/bin/env sh

cd "${0%/*}/.."

# Copy cursors and remove symlinks
cp -r cursors/ cursors-nosym/
find cursors-nosym/ -type l -exec rm -f {} \;

# Convert to Windows cursors
mkdir -p wincur
x2wincur cursors-nosym/* -o wincur/

# Zip them up
mkdir -p splatoon3-cursors
cp -rP cursors splatoon3-cursors/cursors
cp index.theme splatoon3-cursors/
zip -r splatoon3-cursors-linux.zip splatoon3-cursors/

# Zip Windows cursors
cd wincur
zip splatoon3-cursors-windows.zip *
mv splatoon3-cursors-windows.zip ../splatoon3-cursors-windows.zip
cd ..

# Clean up
rm -r cursors-nosym
rm -r wincur
rm -r splatoon3-cursors