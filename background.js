"use strict";

async function ToolbarButtonClicked() {
  try {
    const current = (await browser.browserSettings.overrideDocumentColors.get({})).value;
    const next = current === "always" ? "never" : "always";
    await browser.browserSettings.overrideDocumentColors.set({ value: next });
    await UpdateBadge();
  } catch (err) {
    console.error("Real Black Mode: toggle failed:", err);
  }
}

async function UpdateBadge() {
  try {
    const value = (await browser.browserSettings.overrideDocumentColors.get({})).value;
    const enabled = value === "always";
    await browser.browserAction.setBadgeText({ text: enabled ? "" : "X" });
    await browser.browserAction.setTitle({
      title: "Toggle Website Colors (" + (enabled ? "ON" : "OFF") + ")"
    });
  } catch (err) {
    console.error("Real Black Mode: badge update failed:", err);
  }
}

function OpenOptions() {
  browser.runtime.openOptionsPage().catch((err) =>
    console.error("Real Black Mode: openOptionsPage failed:", err));
}

browser.browserSettings.overrideDocumentColors.onChange.addListener(UpdateBadge);
browser.browserAction.onClicked.addListener(ToolbarButtonClicked);
UpdateBadge();

// Right-click the toolbar button → "Options".
browser.menus.create({
  id: "open-options",
  title: "Real Black Mode options",
  contexts: ["browser_action"]
});

browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-options") OpenOptions();
});

browser.commands.onCommand.addListener((name) => {
  if (name === "toggle-colors") ToolbarButtonClicked();
  else if (name === "open-options") OpenOptions();
});

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") OpenOptions();
});