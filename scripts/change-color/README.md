# Splatcur Editor
A script to generate NorthWestWind's Splatoon cursor pack with different colors.

## Usage
### Prerequisites
- Install Node.js 16+ on your system
- Install Python 3 on your system, if you want to generate Windows cursors

### Install
Run the following command in a shell (Linux) / command prompt (Windows).
```
npm i -g splatcur-editor
```
Keep the shell opened for the next steps as well.

### Quick Start
1. Launch a shell (Linux) / command prompt (Windows) if you haven't already and set the current directory (`cd`) to an empty directory.
2. Run `splatcur-editor`. This will create a directory named `tmp` and pull in `s3cconfig.json`.
3. Edit `s3cconfig.json` to your liking. Colors are formatted in RGB Hex. While you may change everything, I don't recommend altering the following fields:
	- groups
	- subgroups
	- exclude
	- symlinks
4. Run `splatcur-editor` again.
5. Enjoy your cursors inside `splatoon3-cursors-linux.zip` (and `splatoon3-cursors-windows.zip`)!

### Detailed Usage
Users who want to explore all the options this program can do can run read the help command:
```
splatcur-editor -h
```

## License
GPLv3
