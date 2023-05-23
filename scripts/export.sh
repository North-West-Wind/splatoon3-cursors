#!/usr/bin/env sh

cd ../images

for size in 128 64 48 32 24; do
	mkdir -p "${size}x${size}"
	for file in *.svg; do
		inkscape --export-type=png --export-filename="${size}x${size}/${file%.*}" --export-width=$size $file
		#magick -background none +antialias $file -resize "${size}x" "png8:${size}x${size}/${file%.*}.png"
	done
done