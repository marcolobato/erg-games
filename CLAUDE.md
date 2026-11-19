# Erg Games

A browser app that reads live data from a Concept2 PM5 over Bluetooth and turns rowing workouts into custom games, visuals, and feedback. Built for personal use first. Meant to be public, usable, and testable by anyone with a PM5 (and by anyone without one, through practice mode).

The name is kept general on purpose. The scope is a workout player plus many possible games and feedback ideas. Pyramid Darts is only the first example app. It came from trying to improve a game that is already built into the PM5.

## Why this exists

Some workout apps have good video but can't be customized. You can't shorten a session, pause and resume, or restart one segment. This app gives full control over the workout player, the visuals, and the feedback. It also works for short sessions with no video.

### The main friction point

Long blocks break badly. Say you are 21 minutes into a 30 minute steady state and something fails, like a dead battery or a lost connection. The session is interrupted and there is no way to pick up where you left off. You have to start over, and your metrics and recording are messed up.

One of those apps' teams told the user that the way their app is built does not allow resuming. The user did not get the technical details, so treat the cause as unknown.

What this means for the design:
- Resume from the exact point of a failure, for example "resume at 21:00."
- Save progress as the session runs (elapsed time, current segment, data so far), so a crash or lost connection does not lose it.
- If the PM5 connection drops, pause the clock, show a clear message, and let the user reconnect and continue.
- Keep the recording for the whole session, even if it was paused or resumed.
- Pause, resume, restart a segment, and shorten a session are core features of the player, not extras.

When making design choices, ask: does this protect the user's session when something goes wrong?

The project is also a reason to talk to real people: coaches, gym owners, equipment sellers, and friends who row. Coaches should be able to write a workout as a small data file and play it with live feedback.

## Why the built-in PM5 games fall short

The PM5 has games built in (Fish Game, Darts, Target Training, Biathlon). Concept2's pages describe the goal of each game but not the controls, and we found no deeper documentation.

- **Fish Game.** Concept2 says it "teaches you how to modulate intensity." In practice, each pull sends the fish up and it then slowly sinks. To dodge the piranhas you have to vary your power. To score you have to change your rhythm. That works against holding a steady cadence or power, so it does not train what most workouts ask for. Two runs scored 1170 and 1095, and the results felt inconsistent.
- **Darts.** Better. It scores you against a target stroke rate and pace (for example 25 spm and 2:32 /500), and the controls are more predictable. But the targets are fixed for the whole game, so it cannot follow a workout whose targets change.

Design lesson: a game for rowing should reward the thing the workout asks for. If the workout says hold 24 spm, the game should pay for holding 24 spm, and it should never push you to change your stroke to score.

## Current state

- Three files: `index.html` (HTML and the app's JS), `style.css`, and `pm5.js` (all the Bluetooth code, no page code). No build step, no dependencies. It is the first example app. `index.html` loads `pm5.js` as a module, so it must be opened through a web server (localhost or GitHub Pages), not by double-clicking.
- Connects to a PM5 with Web Bluetooth. Confirmed working: the live stroke rate in the app matched the PM5 display.
- Practice mode: arrow keys set a fake stroke rate, so it runs with no erg.
- `lab.html`: a test page (not part of the game) that shows every PM5 data stream live, can read heart rate straight from a chest strap or watch, draws the power curve, and records raw packets to a file. Tried on a real row on 2026-11-04 (about 5.5 minutes recorded).
- Two workouts built in, named by code only: Week 1 Session 2 (W1S2, default) and Week 1 Session 1 (W1S1).
- Fonts: JetBrains Mono for numbers and headings, IBM Plex Mono for small text. Own colors on purpose, inspired by the PM5 screen.
- Name (PR 21): the page is called Skipping Stones, which is the default game. Pyramid Darts stays as the second choice under "Game". Text shared by both games says "throw", not "dart".
- Pyramid Darts: a crosshair moves up when stroke rate is too high and down when too low. A dart lands every 2 seconds.
- Protecting the session (PRs 8-10, live): a corner pause button and Space/Esc open a pause menu (Resume with a 3-2-1 count-in, Restart step, Skip warm-up, End workout). The game also pauses itself when the PM5 drops (Reconnect reaches the same PM5 without the picker) or the page is hidden. Progress is saved every second, so after a reload the start screen offers "Resume at 7:32" (with the last 12 stones; PR 21). While it does, Start becomes a quiet "Start over" button, since starting fresh throws the saved workout away. Restart step undoes the current step's points and stones, on purpose. Reconnect gives up after 10 s and then offers "Choose PM5 again" (the device picker), keeping the workout. Bluetooth off gets its own message. While the PM5 is lost, the corner button is greyed out.
- Auto-pause (PR 22): with a PM5 or a replay, 6 s with no stroke (no catch or finish packet) pauses the workout with one low note and "Paused: no strokes for 6 s. Start rowing to carry on." The next stroke resumes at once, with no count-in (the usual 4 s settle before throws still applies). This also holds the clock at the start until the first stroke. Only an automatic pause resumes on a stroke; a manual pause needs Resume. Not in practice mode. Tested with a replay that has a 15 s gap; not yet rowed.
- Metronome (PR 11, tuned after the first row): a sharp, loud note on every catch, booked ahead on the audio clock so it lands on time. Default "Countdown + catch": soft ticks 3, 2, 1 rising in pitch on the way back (3 at the planned finish, a third into the stroke for 1:2; 2 and 1 spread over the recovery), so the catch can be predicted, not reacted to. This follows the novice coxing count "One - two - three - catch, push". Warm-up, paddles and cooldown get it too, softer, at 20 spm. A two-note chime replaces the 3 on the last stroke before a step change (rising = faster next). Settings on the start screen and pause menu: Off, Catch only, Countdown + catch, and "Headphones: sounds 0.2 s early" for Bluetooth delay (off by default). Dart sounds are off. Rule for future game sounds: never on the catch, quiet when on target.
- Replay (PR 13): "Replay it" on the start screen plays a recording from `lab.html` as if the PM5 were live, looping, in any browser. `pm5.replay()` uses the same callbacks as `pm5.connect()`.
- Catch timing (PR 14): the game also listens to Stroke Data and measures each real catch against the nearest click. The pause menu and results show the middle value and the share within 0.15 s, from 5 catches up. Only while running with the metronome on. The number includes the PM5-to-phone Bluetooth delay. Use it to judge the headphones setting.
- Power readout (PR 18, a first try, not scored): under the board, the last stroke's watts and its force curve (fixed 200 lbf scale, the stroke before drawn faint). In scored steps the watts show "min 121" or "push +17" against the level's minimum. Hidden until the PM5 or a replay sends a stroke, so practice mode is unchanged. While it shows, the board shrinks so the rowing view fits one phone screen (about 280 px on an iPhone in Bluefy).
- Landscape (PR 23, from the Figma "Landscape proposal" section, node 90-302): any landscape screen at least 640 px wide (a phone on its side, a laptop) puts the board on the left at full height, up to 58% of the width or 760 px, with everything else on the right. While paused, the buttons take the board's place and the settings sit on the right as one list. Under 500 px tall, the connection note and the practice hint text are hidden. CSS only (a media query at the end of `style.css`), plus the pause menu split into `#menu` (buttons) and `#menu-settings`. Checked headless at 844×390, 844×340 and 1280×720. Not yet rowed. Pyramid Darts with its power strip scrolls about 40 px on a phone on its side.
- Skipping Stones (Concept D from Figma): a second board, picked with "Game" on the start screen. Same rate rules and scoring as the darts. Power throws: if the last stroke was under the level's minimum, the stone skips twice and sinks short for 0 points. A full throw skips 6 times into where the rate aimed. The power bars (last 7 strokes, a dashed minimum and a dashed bar for the next stroke) are inside the board, so it does not shrink. Reduced motion shows stones at their landing spot. Extra power above the minimum does not move the stone; only the rate aims. First row (2026-11-19, Easy): Easy felt right, the bars helped, the skip animation is a keeper. The board text was too small to read at a glance and the crosshair got lost among stones, so PR 20 made "PUSH +X W" / "MIN N W" the biggest text (26 on the 400 grid, about 21 px on a phone), raised the other labels to 16, and gave the crosshair a background-colored outline.
- Level (start screen and pause menu, saved, Easy by default): the power minimum in watts at 22 spm, scaled by spm/22. Easy 85, Medium 111, Hard 136 (from PLAN.md, 70% of Concept2's 2025 30-minute rankings). Easy at 22/24/26/28 spm = 85/93/100/108 W.
- Settings (PR 15): full-width rows, at least 56 px tall, in softly outlined lists (Workout; Sound: Sound, Metronome, Headphones). Quieter than the buttons on purpose. The game panel fills the screen but stops at 840 px, so it does not jump when pausing or stretch on tall windows.

## What is verified and what is not

Verified: Bluetooth connection, live stroke rate, game runs through warm-up and into the first interval (also tested headless). After the Bluetooth code moved into `pm5.js`, a real PM5 still showed live stroke rate (checked on localhost, 2026-11-04). Pause, skip, restart step and resume after a reload worked on a real row (laptop). On the phone in Bluefy (2026-11-12/13): a Bluetooth off/on hiccup and a "Disconnect app" from the PM5 menu both recover with plain Reconnect PM5, and Bluefy reports Bluetooth off to the page.

Not verified:
- How the game feels while actually rowing a full session.
- W1S2 starts at 22 spm. The source only says the steps alternate between 22 and 24.
- W1S1's 1:30 warm-up and 0:30 cooldown. The 3 pyramids and the 30 s paddles come from the user's real row; the warm-up/cooldown split of the 2 spare minutes is a best guess.
- Safari cannot use Web Bluetooth. Use Chrome or Edge on a laptop, Chrome on Android, or the Bluefy browser on iPhone (the user's phone setup, confirmed working).
- Shortening a session is not built yet. Auto-pause (PR 22) is not yet rowed.
- How the countdown feels on a real row, and whether 0.2 s is the right headphone offset. First row with it (mid-November 2026): the catch-only click was too quiet on the phone speaker over the flywheel, felt late with AirPods, and caused reacting instead of anticipating.

## PM5 Bluetooth facts

Source: Concept2 PM CSAFE Communication Definition, revision 0.31 (public PDF linked from concept2.com/support/software-development, 173 pages, the Bluetooth tables are around pages 14-45). `pdftoppm` is not installed here, so to read the PDF extract its text with macOS PDFKit: `osascript -l JavaScript` with a short script that loops over `PDFDocument` pages.

- Device name starts with `PM5`. Wake it by pulling the handle.
- Rowing service: `ce060030-43e5-11e4-916c-0800200c9a66`
- Additional Status 1 characteristic: `ce060032-43e5-11e4-916c-0800200c9a66`. Stroke rate is byte 5 (strokes per minute).
- Sample rate characteristic: `ce060034-43e5-11e4-916c-0800200c9a66`. Writing `1` asks for updates about every 500 ms.
- Other streams (same base id, `ce0600XX-43e5-11e4-916c-0800200c9a66`): `31` General Status (time, distance), `33` Additional Status 2 (average power), `35` Stroke Data, `36` Additional Stroke Data (power per stroke), `3b` Heart Rate Belt Info. Additional Status 1 also carries heart rate (byte 6, 255 = none) and pace per 500 m (bytes 7-8, hundredths of a second). Numbers are sent low byte first. `lab.html` shows them live. Layouts match Concept2's document and the community library ergometer.js, and are not yet confirmed on a real row.
- The force curve (the PM5's power graph) is a stream: `3d`, notify, 2 to 288 bytes split over several notifications. Each notification is a header byte (high half = pieces in this curve, low half = points in this piece), a sequence number, then up to 9 two-byte points. The oldest PM5 hardware ("PM5v1") does not send it. `createForceCurveAssembler` in `pm5.js` glues the pieces together.
- Heart rate: the PM5 passes the user's paired Garmin chest strap through in Additional Status 1 byte 6 (confirmed on a real row, 2026-11-04), so no separate strap connection is needed. A direct strap connection (standard Bluetooth heart rate service) also works.
- Stroke Data (`35`) arrives twice per stroke: at the finish the stroke count goes up, and at the catch a second packet comes with the same count (checked in the 2026-11-04 recording; about 1 stroke in 5 had no catch packet). `pm5.js` turns this into `onFinish` and `onCatch`.
- Confirmed on the first recorded row (2026-11-04): pace (bytes 7-8 agree with the speed field and the PM5 screen), stroke rate, distance, time, power per stroke, and the force curve. Force curve values are pounds of force (lbf): each curve's peak matches that stroke's peak drive force in Stroke Data. Draw it on a fixed lbf scale, not stretched to fit, or easy strokes look like hard ones.
- Other apps (like ErgData) can hold the connection. Close them first.
- After "Disconnect app" in the PM5 menu, the PM5 refuses all apps until "Re-enable App Connection" is pressed on it; a reconnect just waits (confirmed on a real PM5, 2026-11-13). The game times out after 10 s and its messages point to that button.
- The PM5 likely stays awake while an app is connected (Concept2 forum reports, not official), so mid-workout messages do not say "pull the handle". The start screen still does, since the PM5 may be asleep before a workout.
- `docs/pm5-data.md` is the public summary of all of this (Phase 1 write-up). Keep it in step when facts change.
- Useful libraries to read for reference: ergometer.js (JavaScript), Concept2-SDK by RowBotics (Swift), c2bluetooth (Flutter).

## Workout format (plan)

Each workout is a list of segments: seconds and target stroke rate. Warm-up, paddle and cooldown have no target and no darts.

Every workout is exactly 15 minutes. Warm-up and cooldown fill whatever the main set leaves.

Current built-ins:
- W1S2: 3 min warm-up, then six 2 min steps alternating 22 and 24 spm, no rest. 15 min.
- W1S1: 1:30 warm-up, then 3 pyramids of 90 s at 24, 60 s at 26, 30 s at 28. An easy 30 s paddle (about 20 spm) follows every step except the last, then a 30 s cooldown. 15 min.

Scoring: a dart every 2 s, starting 4 s into each step. Exact rate = 10 points, off by 1 = 5, off by 2 = 2.

## Planned structure

Split the single file into small modules:
- `pm5.js`: Bluetooth connection and live data.
- `workouts/`: workouts as simple JSON files.
- `player.js`: timeline, timing, pause, resume, shorten, restart segment.
- `games/darts.js`: the dart board game. Each game takes target and actual stroke rate and draws itself.
- `practice.js`: fake data for testing without a rower.
- `index.html` and `style.css`.

Host with GitHub Pages. Web Bluetooth needs a secure page, and Pages gives HTTPS.

## Roadmap

1. Baseline: commit `pyramid-darts.html` as it is.
2. Split into modules (above), with no change in behavior.
3. Player controls: pause, resume, restart segment, shorten. Add auto-save and resume after a dropped connection, since that is the main friction point. **Done except shorten (PRs 8-10; auto-pause in PR 22).** Next: landscape mode (Figma proposal under review), then shorten a session.
4. Workouts as JSON, plus a short guide for coaches to write one.
5. More games and feedback, all reading the same live data. Ideas: a steady-pace line, a stroke-rate "heartbeat," a ghost race against your last session.
6. Show it to real people: a coach, a gym with Concept2 ergs, a friend rowing alongside. Write down what they say.
7. README with a GIF, "works in Chrome or Edge," and a link to practice mode.

## Rules for this repo

- Do not ship workouts copied from other apps in the public repo. Their workouts belong to them. Ship original workouts and say this project is not affiliated with Concept2 or any workout app.
- Keep it plain HTML and JavaScript. No build tools unless there is a strong reason.
- Practice mode must keep working so visitors without a rower can try it.
- Keep explanations short and in plain English.
- Design for both light and dark themes. Respect reduced motion.
- The user rows every morning. Real use is the best test. Ask what felt wrong after a session.
