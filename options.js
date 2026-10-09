"use strict";

// bg   -> browser.display.background_color
// link -> browser.anchor_color              (shown as "Link color")
// fg   -> browser.display.foreground_color  (shown as "Text & border color")
const DEFAULTS = {
  bg: "#000000",
  fg: "#c0c0c0",
  link: "#ffcc99"
};

const COLOR_FIELDS = ["bg", "fg", "link"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const $ = (id) => document.getElementById(id);

// Windows-style path; Explorer's address bar expands %APPDATA% on paste.
const PROFILE_PATH = "%APPDATA%\\Mozilla\\Firefox\\Profiles";

// kind: "ok" | "err" | undefined (clears)
function SetStatus(msg, kind) {
  const el = $("status");
  el.textContent = msg || "";
  el.className = kind ? "status-" + kind : "";
}

function UpdatePreview(v) {
  const p = $("preview").style;
  if (HEX.test(v.bg))   p.setProperty("--pv-bg", v.bg);
  if (HEX.test(v.link)) p.setProperty("--pv-link", v.link);
  if (HEX.test(v.fg)) {
    p.setProperty("--pv-text", v.fg);
    p.setProperty("--pv-border", v.fg);
  }
}

function GetPrefs(v) {
  return [
    { name: "browser.display.background_color",  type: "String",  value: v.bg },
    { name: "browser.display.foreground_color",  type: "String",  value: v.fg },
    { name: "browser.anchor_color",              type: "String",  value: v.link },
    { name: "browser.display.use_system_colors", type: "Boolean", value: "false" },
    { name: "layout.css.forced-colors.enabled",  type: "Boolean", value: "false" }
  ];
}

function PrefLiteral(p) {
  return p.type === "String" ? `"${p.value}"` : p.value;
}

function ManualLines(v) {
  return GetPrefs(v).map((p) => `user_pref("${p.name}", ${PrefLiteral(p)});`);
}

// Wraps a string in a <code> that copies itself on click or on Enter/Space.
function CopyableCode(text) {
  const code = document.createElement("code");
  code.textContent = text;
  code.className = "copyable";
  code.title = "Click to copy";
  code.tabIndex = 0;
  code.setAttribute("role", "button");
  code.addEventListener("click", async () => {
    const ok = await CopyText(text);
    SetStatus(ok ? `Copied: ${text}` : `Copy blocked — value is: ${text}`, ok ? "ok" : "err");
  });
  code.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      code.click();
    }
  });
  return code;
}

// Populates the "Manual setup" table from the same source as BuildBat().
function RenderManual(v) {
  const tbody = $("manual_body");
  tbody.textContent = "";
  for (const p of GetPrefs(v)) {
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.appendChild(CopyableCode(p.name));

    const typeCell = document.createElement("td");
    typeCell.textContent = p.type;

    const valueCell = document.createElement("td");
    valueCell.appendChild(CopyableCode(PrefLiteral(p)));

    tr.append(nameCell, typeCell, valueCell);
    tbody.appendChild(tr);
  }
}

// Single refresh: colors -> preview, prefs -> manual table.
function Refresh(v) {
  UpdatePreview(v);
  RenderManual(v);
}

function SetValues(v) {
  for (const f of COLOR_FIELDS) {
    $(f).value = v[f];
    $(f + "_picker").value = v[f];
    $(f).classList.remove("invalid");
  }
  Refresh(v);
}

function ReadValues() {
  const v = {};
  for (const f of COLOR_FIELDS) v[f] = $(f).value.trim();
  return v;
}

function Validate(v) {
  let ok = true;
  for (const f of COLOR_FIELDS) {
    const good = HEX.test(v[f]);
    $(f).classList.toggle("invalid", !good);
    if (!good) ok = false;
  }
  return ok;
}

function BuildBat(v) {
  const prefs = GetPrefs(v).map((p) => [p.name, PrefLiteral(p)]);

  const lines = [
    "@echo off",
    "setlocal",
    'set "ROOT=%APPDATA%\\Mozilla\\Firefox\\Profiles"',
    'if not exist "%ROOT%" (',
    "  echo Firefox profiles folder not found.",
    "  pause",
    "  exit /b 1",
    ")",
    'set "FOUND="',
    'for /d %%P in ("%ROOT%\\*") do (',
    '  if exist "%%~P\\parent.lock" (',
    '    call :add "%%~P"',
    '    set "FOUND=1"',
    "  )",
    ")",
    "if defined FOUND goto :done",
    "echo Firefox does not appear to be running. Updating all profiles.",
    'for /d %%P in ("%ROOT%\\*") do if exist "%%~P\\prefs.js" call :add "%%~P"',
    "",
    ":done",
    "echo.",
    "echo Done. Restart Firefox to apply.",
    "pause",
    "exit /b 0",
    "",
    ":add",
    'set "F=%~1\\user.js"',
    'if exist "%F%" findstr /v /l ' + [
      "// colortoggle",
      ...prefs.map(([k]) => k)
    ].map((s) => `/c:"${s}"`).join(" ") + ' "%F%" > "%F%.tmp"',
    'if exist "%F%.tmp" move /y "%F%.tmp" "%F%" >nul',
    '>>"%F%" echo // colortoggle',
    ...prefs.map(([k, val]) => `>>"%F%" echo user_pref("${k}", ${val});`),
    "echo Updated %~1",
    "goto :eof"
  ];
  return lines.join("\r\n") + "\r\n";
}

// Copy without requiring the clipboardWrite permission.
async function CopyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) { /* fall through */ }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
  ta.remove();
  return ok;
}

// Downloads `text` as `filename`, waits until the OS has finished writing it,
// then reveals it in the download manager. Avoids the race where show() runs
// while the file is still a .part.
async function DownloadAndReveal(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/octet-stream" }));
  const id = await browser.downloads.download({
    url,
    filename,
    saveAs: false,
    conflictAction: "uniquify"
  });

  await new Promise((resolve) => {
    const listener = (delta) => {
      if (delta.id !== id) return;
      const state = delta.state && delta.state.current;
      if (state === "complete" || state === "interrupted") {
        browser.downloads.onChanged.removeListener(listener);
        resolve();
      }
    };
    browser.downloads.onChanged.addListener(listener);
  });

  browser.downloads.show(id);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return id;
}

// Keep picker, hex box, preview and manual table in sync.
for (const f of COLOR_FIELDS) {
  $(f + "_picker").addEventListener("input", () => {
    $(f).value = $(f + "_picker").value;
    $(f).classList.remove("invalid");
    Refresh(ReadValues());
  });
  $(f).addEventListener("input", () => {
    const val = $(f).value.trim();
    const good = HEX.test(val);
    $(f).classList.toggle("invalid", !good);
    if (good) $(f + "_picker").value = val;
    Refresh(ReadValues());
  });
}

$("reset").addEventListener("click", () => {
  SetValues(DEFAULTS);
  SetStatus("");
});

$("setup").addEventListener("click", async () => {
  const v = ReadValues();
  if (!Validate(v)) {
    SetStatus("Colors must look like #rrggbb.", "err");
    return;
  }
  try {
    await DownloadAndReveal(BuildBat(v), "colortoggle-setup.bat");
    SetStatus("Script downloaded — run colortoggle-setup.bat from your Downloads folder.", "ok");
  } catch (err) {
    SetStatus("Download failed: " + (err && err.message ? err.message : err), "err");
  }
});

$("copy_all").addEventListener("click", async () => {
  const v = ReadValues();
  if (!Validate(v)) {
    SetStatus("Colors must look like #rrggbb.", "err");
    return;
  }
  const ok = await CopyText(ManualLines(v).join("\n") + "\n");
  SetStatus(
    ok ? "Copied user.js lines to clipboard."
       : "Copy blocked by the browser — select the table and copy manually.",
    ok ? "ok" : "err"
  );
});

$("copyfolder").addEventListener("click", async () => {
  const ok = await CopyText(PROFILE_PATH);
  SetStatus(
    ok ? "Copied profile folder path — paste it into Explorer's address bar."
       : "Copy blocked by the browser — the path is: " + PROFILE_PATH,
    ok ? "ok" : "err"
  );
});

SetValues(DEFAULTS);