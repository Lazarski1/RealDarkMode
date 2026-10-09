1. I used "Toggle Website Colors (Global)" by Manuel Reimer as a base. Source code: https://github.com/M-Reimer/toggleglobalcolors It used a different way to toggle colors, I changed most of the script in that regard.

2. I used Claude and Deepseek for most of the coding. (I'm not a pro, was just a convienent way to do so, if any bugs are found plz report)

3. Some sites/imbedded pictures/UI stuffs will be broken, it's not perfect, but it just works for now. (I haven't found any other plugin for real #000000 background everywhere.)

4. It works by creating permament setting of prefs:
browser.display.background_color
browser.display.foreground_color
browser.anchor_color
browser.display.use_system_colors
layout.css.forced-colors.enabled

(which do nothing by themselves, I use that fact)

and uses a function browser.browserSettings.overrideDocumentColors (it calls the flip of browser.display.document_color_use 1/2) to flip between dark and default mode. (It's the only of those settings that can be changed that way, hence the changes needed.

5. Default keybinds are:
Toggle - ALT+Q
Options - ALT+SHIFT+Q

Can be changed at: about:addons → gear icon → "Manage Extension Shortcuts" if the default collides with something. 