#!/usr/bin/env sh

cd "${0%/*}"

# Check for programs
if ! command -v inkscape &> /dev/null
then
	echo "Inkscape is required for converting SVGs into PNGs, but it is not found."
	exit
fi

if [ ! command -v node &> /dev/null ] || [ ! command -v npm &> /dev/null ]
then
	echo "Node.JS is required for generating loading animation, but it is not found."
	exit
fi

# Run the SVG export script
cd scripts
bash ./export.sh

# Run the loading animator
cd loading_animator
npm install
npm test

# Run the convert script
cd ..
bash ./convert.sh