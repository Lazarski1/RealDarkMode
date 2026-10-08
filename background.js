"use strict";

async function ToolbarButtonClicked() {
  const current = (await browser.browserSettings.overrideDocumentColors.get({})).value;
  const next = current === "always" ? "never" : "always";
  await browser.browserSettings.overrideDocumentColors.set({ value: next });
  await UpdateBadge();
}

async function UpdateBadge() {
  const value = (await browser.browserSettings.overrideDocumentColors.get({})).value;
  const enabled = value === "always";
  await browser.browserAction.setBadgeText({ text: enabled ? "" : "X" });
  await browser.browserAction.setTitle({
    title: "Toggle Website Colors (" + (enabled ? "ON" : "OFF") + ")"
  });
}

browser.browserSettings.overrideDocumentColors.onChange.addListener(UpdateBadge);
browser.browserAction.onClicked.addListener(ToolbarButtonClicked);
UpdateBadge();