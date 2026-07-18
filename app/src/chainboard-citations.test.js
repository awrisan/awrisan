import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DISCLOSURE } from "./chain/chain-sentences.js";
import { SeedDisclosure } from "./chain/ChainRoomCard.jsx";

const demo = vi.hoisted(() => ({ value: null }));

vi.mock("./demo-state.jsx", async (importOriginal) => ({
  ...(await importOriginal()),
  useDemo: () => demo.value,
}));

const { ChainBoard } = await import("./chain/ChainBoard.jsx");
const { CONTRACT_ID } = await import("./stellar-rpc.js");

/**
 * The chain view's pitch is "every sentence has a line you can open". This file
 * is the part that makes that a property instead of a promise.
 *
 * It exists because the pitch was false when this round started: most of the
 * view's cross-file citations no longer landed. A lane inserted a function into
 * stellar-rpc.js and every line number below it slid; a lane deleted from
 * AppPages.jsx and two citations ran off the end of the file. Nothing went red.
 * That is the whole problem with a line number — it does not fail, it quietly
 * starts pointing at something else, and what it points at is still a line of
 * code. One comment cited `:382` for the lockedStroops emit; when this file was
 * written `:382` held an unrelated `await Promise.all(`, which reads for all the
 * world like a citation that still works. It has since moved again.
 *
 * "Since moved again" is a measurement, not a turn of phrase. stellar-rpc.js and
 * AppPages.jsx were both edited WHILE this file was being written, and every line
 * number quoted in this directory an hour earlier was already wrong — `readRooms`
 * slid 8 lines, `MissingResult` 24. The symbols did not move, and this suite
 * stayed green across both edits without a character changing. Hours, not
 * releases: that is the shelf life of a line number in a repo with parallel lanes
 * in it, and the reason none of the citations here are line numbers.
 *
 * So this directory cites SYMBOLS. `readRooms` in stellar-rpc.js survives every
 * insertion above it, a grep finds it in one keystroke, and — the part a line
 * number could never do — a machine can check it. That is this file: it scrapes
 * the citations out of the chain view's own comments and greps each one. A
 * renamed or deleted symbol goes red on the next run; a hundred lines inserted
 * above it does nothing, which is exactly right, because nothing became untrue.
 *
 * "Goes red on the next run" is now measured. It was not when this file shipped:
 * the grep was a substring test, so `readWinners` -> `readWinnersRenamed` — a
 * rename, the exact rot this file exists to catch — left "readWinners" sitting
 * inside the new name and passed 21/21. It was reported as a proof that it went
 * red. It did not; nobody ran it. Every rename that EXTENDS an anchor slipped
 * through the same hole: `CONTRACT_ID` -> `CONTRACT_ID_OVERRIDE`, `readRooms` ->
 * `readRoomsV2`. Only deletions and renames that shortened or replaced the anchor
 * ever failed. Hence WORD, below, and MUTANTS, which is where the mutants are
 * recorded — with what they actually returned, on the day they were run.
 *
 * What it does NOT check is that the symbol says what the comment claims it says.
 * No test can. It checks that the pointer resolves, which is the failure that
 * actually happened here five times — and it fences off the second failure mode
 * too: a comment can no longer cite something that does not exist at all.
 *
 * To extend this to the other files carrying citations (chain-sentences.js has
 * ~25, AppPages.jsx more), convert their citations to this form and add the path
 * to SOURCES. There is nothing else to it.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (...parts) => readFileSync(path.join(HERE, ...parts), "utf8");

/**
 * The files whose citations this pins, each with an anchor of its own.
 *
 * The anchor is not decoration. Every assertion below runs over whatever this
 * scrape returns, so a file that has been renamed, moved or emptied yields zero
 * citations and passes every check by checking nothing. This repo has already
 * shipped that trap once (see appages-deletion.test.jsx on the RoomStatus
 * scrape). The anchor is what fails first when the scrape goes blind.
 */
const SOURCES = [
  { file: "chain/ChainBoard.jsx", anchor: "export function ChainBoard(" },
  { file: "chain/ChainRoomCard.jsx", anchor: "export function ChainRoomCard(" },
  { file: "chain/chain.css", anchor: ".chain-disclosure {" },
];

/** Cited basename -> where it actually lives. An unmapped citation fails loudly. */
const RESOLVE = {
  "demo-state.jsx": ["demo-state.jsx"],
  "stellar-rpc.js": ["stellar-rpc.js"],
  "AppPages.jsx": ["pages", "AppPages.jsx"],
  "styles.css": ["styles.css"],
  "ui.jsx": ["ui.jsx"],
  "App.jsx": ["App.jsx"],
  "chain-sentences.js": ["chain", "chain-sentences.js"],
};

/**
 * The citation form: a backticked anchor, the word "in", a filename.
 *
 * Backticks rather than bare prose because "readRooms in stellar-rpc.js" is a
 * sentence and `readRooms` in stellar-rpc.js is a claim — and only the second one
 * can be told apart from prose by five characters of regex. They also mark the
 * anchor as a literal to grep, which is what a reader does with it anyway.
 */
const CITATION = /`([^`\n]+)` in ([\w.-]+\.\w+)/g;

/**
 * The anchor, matched as a whole name rather than as a substring.
 *
 * The substring test this replaces is why this file's first proof was false:
 * "readWinnersRenamed".includes("readWinners") is true, so the one mutation worth
 * running — rename the cited symbol — could not fail, and the suite was green
 * while a citation pointed at a symbol that no longer existed. A citation that
 * survives the thing it is meant to catch is worse than none: it is a green tick
 * over an unsourced sentence.
 *
 * Not `\b`. `\b` is a word/non-word boundary, and three of the ten anchors here
 * are CSS (`--mineral`, `.status-dissolved`): `-` and `.` are already non-word,
 * so `\b--mineral\b` does not match ` --mineral:` at all and every CSS citation
 * goes red for a reason that is not true. That is measured, not reasoned — the
 * mistake this file keeps having to unmake: `\b--mineral\b` and
 * `\b.status-dissolved\b` were both run against the real styles.css and both
 * returned false. The class below is "characters a name can continue with" in
 * BOTH languages — word chars, `$` for JS, `-` for CSS — which is the thing
 * actually being asserted: nothing may sit flush against the anchor on either
 * side. `readWinners(` matches; `readWinnersRenamed` does not.
 */
const CONTINUES = "[\\w$-]";
const WORD = (anchor) =>
  new RegExp(`(?<!${CONTINUES})${anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!${CONTINUES})`);

/**
 * The check that the check works — the mutants, run and recorded.
 *
 * This block exists because every OTHER assertion in this file passes with WORD
 * replaced by `(anchor) => ({ test: (hay) => hay.includes(anchor) })`. That is
 * not a hypothetical worth guarding against: it is the version that shipped, it
 * was green while a citation pointed at a symbol that no longer existed, and it
 * was reported as proven red. The revert was run again on 2026-07-17 to be sure
 * the hole is real and not another remembered fact — 21/21 green, the fix
 * undone and nothing on fire. A fix its own suite cannot see the loss of is one
 * refactor from being gone, and the next person to lose it will have a good
 * reason, exactly as the last one did.
 *
 * So: the rows below are the only thing here that fails when WORD stops being a
 * whole-name match. Each is an anchor, a haystack, and what WORD returned when
 * it was RUN against it (2026-07-17) — not what it ought to return.
 *
 * The `false` rows are renames a substring test calls a pass. The `true` rows are
 * the live citation forms, and they are not filler: they are what goes red if
 * someone tightens this to `\b`, which is the other way to break it and the one
 * that looks more correct.
 */
const MUTANTS = [
  // The mutation last round's report claimed to have run. Driven for real against
  // stellar-rpc.js this time, both spellings: 1 failed | 20 passed, each.
  { anchor: "readWinners", sample: "export async function readWinnersRenamed(id) {", matches: false },
  { anchor: "readWinners", sample: "export async function readWinnersV2(id) {", matches: false },
  { anchor: "CONTRACT_ID", sample: "export const CONTRACT_ID_OVERRIDE = null;", matches: false },
  // CSS, where `\b` cannot follow. Driven against styles.css for real as well:
  // `--mineral` -> `--mineral-2` is 1 failed | 20 passed.
  { anchor: "--mineral", sample: "  --mineral: #2f3b34;", matches: true },
  { anchor: "--mineral", sample: "  --mineral-2: #2f3b34;", matches: false },
  { anchor: ".status-dissolved", sample: ".status-dissolved {", matches: true },
  { anchor: ".status-dissolved", sample: ".status-dissolved-soft {", matches: false },
  // A call site and a declaration: the two shapes every JS anchor above is cited
  // for, and the reason CONTINUES cannot simply be `[^\s]`.
  { anchor: "readWinners", sample: "const rows = await readWinners(id);", matches: true },
];

describe("the anchor is matched as a whole name, not a substring", () => {
  it.each(MUTANTS)("`$anchor` in `$sample` -> $matches", ({ anchor, sample, matches }) => {
    expect(
      WORD(anchor).test(sample),
      matches
        ? `WORD no longer matches \`${anchor}\` where it really is cited. If this went red on a ` +
          "`\\b` — that is the trap: `-` and `.` are non-word characters, so `\\b` silently " +
          "fails every CSS anchor here. CONTINUES is the fix, not a workaround."
        : `WORD matched \`${anchor}\` inside a longer name. That is the substring bug back: a ` +
          "rename that EXTENDS an anchor now passes, so every citation in this directory can " +
          "point at a symbol that does not exist and this file will still say they all land.",
    ).toBe(matches);
  });
});

const citations = SOURCES.flatMap(({ file }) =>
  [...read(file).matchAll(CITATION)].map(([, anchor, target]) => ({ from: file, anchor, target }))
);

describe("the scrape can still see the chain view", () => {
  it.each(SOURCES)("still finds $anchor in $file", ({ file, anchor }) => {
    expect(
      read(file),
      `the ${file} scrape went dark. Every citation check below runs over what this ` +
        "scrape returns, so a file it cannot read is a file whose citations all pass.",
    ).toContain(anchor);
  });

  it.each(SOURCES)("finds at least one citation in $file", ({ file }) => {
    expect(
      citations.filter((c) => c.from === file),
      `${file} carries no \`symbol\` in file.ext citation. Either they were all removed, or ` +
        "they drifted back to a form this file cannot check — which is how the last 34 rotted.",
    ).not.toHaveLength(0);
  });
});

describe("every citation the chain view makes still resolves", () => {
  it.each(citations)("$from cites `$anchor` in $target", ({ anchor, target }) => {
    const where = RESOLVE[target];
    expect(where, `no path known for ${target}. Add it to RESOLVE.`).toBeDefined();
    // .test() rather than toMatch(): the haystack is a whole 30KB source file, and
    // the message below is the diagnosis. A dump of stellar-rpc.js is not.
    expect(
      WORD(anchor).test(read(...where)),
      `\`${anchor}\` is gone from ${target} — no such whole name in the file. Unlike a line ` +
        "number this cannot have drifted: it was renamed or deleted, so the sentence citing " +
        "it is now unsourced. Check for a rename that EXTENDS it (readWinners -> " +
        "readWinnersV2) before assuming deletion — that is the case a substring check used " +
        "to miss. Then re-read the code and fix the SENTENCE, not just the anchor: the " +
        "renamed thing may no longer do what the sentence says it does.",
    ).toBe(true);
  });
});

/**
 * The read takes about four seconds (band up 813ms-4826ms, measured in the browser
 * 2026-07-17), and for all of them the band used to hold one pulsing sentence. The
 * contract id is a build-time constant, so it was never one of the things being
 * waited for — it is the address a reader checks this page against, and it now
 * renders in the first frame.
 *
 * Pinned because it is one moved JSX line, and the instinct that put it inside the
 * gate ("claim nothing while reading") is a good instinct that was simply wrong
 * about this one value. The next person to tidy this will have that instinct too.
 */
describe("the reading band says what it already knows", () => {
  const reading = () => {
    demo.value = { state: { network: { network: "testnet", mode: "reading" }, rooms: [] } };
    return render(createElement(MemoryRouter, null, createElement(ChainBoard)));
  };

  it("shows the contract id before the read lands", () => {
    reading();
    expect(screen.getByText(CONTRACT_ID)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Stellar Expert/ })).toHaveAttribute(
      "href",
      expect.stringContaining(CONTRACT_ID),
    );
  });

  it("still claims no result it does not have", () => {
    // The property the move must not cost. A ledger height or a total here would
    // be a read result invented before the read: lie 5 was "0 XLM terkunci di
    // Stellar Testnet" beside a live ledger height, over a contract holding 5,7.
    const { container } = reading();
    expect(container).not.toHaveTextContent(/XLM|ledger|Kontrak memegang|Minimal/);
  });
});

/**
 * The seed disclosure is the strongest claim on the board and the easiest to
 * skim. Its labels are pulled off the sentences themselves, so this pins the
 * pull: what it may add (nothing) and what it may swallow (nothing).
 */
describe("the seed disclosure's split is the sentences' own", () => {
  const paragraphs = () => {
    render(createElement(SeedDisclosure));
    return [...document.querySelectorAll(".chain-disclosure p")];
  };

  it("renders every disclosure line, character for character", () => {
    // The one that matters: the label is lifted out of the sentence and set in a
    // <strong>, so the failure to fear is silent — an eaten space, a dropped
    // colon, a separator this file invented. Comparing the whole paragraph back
    // to the source string is what makes "no string is written in that file" a
    // fact rather than a habit.
    expect(paragraphs().map((p) => p.textContent)).toEqual(DISCLOSURE);
  });

  it("labels the proved and the unproved, so the split cannot read as prose", () => {
    paragraphs();
    // Not "a strong exists": these two exact words are the disclosure's spine.
    // "Terbukti" alone is the overclaim this whole card refuses to make.
    expect(screen.getByText("Terbukti:").tagName).toBe("STRONG");
    expect(screen.getByText("Belum terbukti:").tagName).toBe("STRONG");
  });

  it("does not mistake the lib.rs citation for a label", () => {
    // The last line reads "...sendiri (lib.rs:23-38). Perbaikan...", and its first
    // colon is the citation's. Swap LABEL for a plain first-colon split and this
    // is the only assertion in the file that notices: the paragraph comes back
    // headed "Catatan ini ada di dokumentasi kontraknya sendiri (lib.rs:", a
    // citation wearing the sentence's label. Verified by doing it, not by reading
    // the regex — three of LABEL's conditions block this and it would have been
    // easy to credit the wrong one.
    const last = paragraphs().at(-1);
    expect(last.textContent).toContain("lib.rs:23-38");
    expect(
      last.querySelector("strong"),
      "the label pattern reached past a full stop and labelled a citation.",
    ).toBeNull();
  });
});
