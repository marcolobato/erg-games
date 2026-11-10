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
- Game: Pyramid Darts. A crosshair moves up when stroke rate is too high and down when too low. A dart lands every 2 seconds.

## What is verified and what is not

Verified: Bluetooth connection, live stroke rate, game runs through warm-up and into the first interval (also tested headless). After the Bluetooth code moved into `pm5.js`, a real PM5 still showed live stroke rate (checked on localhost, 2026-11-04).

Not verified:
- How the game feels while actually rowing a full session.
- W1S2 starts at 22 spm. The source only says the steps alternate between 22 and 24.
- W1S1's 1:30 warm-up and 0:30 cooldown. The 3 pyramids and the 30 s paddles come from the user's real row; the warm-up/cooldown split of the 2 spare minutes is a best guess.
- Safari and iPhone cannot use Web Bluetooth. Chrome or Edge on a laptop, or Chrome on Android, are needed.

## PM5 Bluetooth facts

Source: Concept2 PM CSAFE Communication Definition, revision 0.31 (public PDF linked from concept2.com/support/software-development, 173 pages, the Bluetooth tables are around pages 14-45). `pdftoppm` is not installed here, so to read the PDF extract its text with macOS PDFKit: `osascript -l JavaScript` with a short script that loops over `PDFDocument` pages.

- Device name starts with `PM5`. Wake it by pulling the handle.
- Rowing service: `ce060030-43e5-11e4-916c-0800200c9a66`
- Additional Status 1 characteristic: `ce060032-43e5-11e4-916c-0800200c9a66`. Stroke rate is byte 5 (strokes per minute).
- Sample rate characteristic: `ce060034-43e5-11e4-916c-0800200c9a66`. Writing `1` asks for updates about every 500 ms.
- Other streams (same base id, `ce0600XX-43e5-11e4-916c-0800200c9a66`): `31` General Status (time, distance), `33` Additional Status 2 (average power), `35` Stroke Data, `36` Additional Stroke Data (power per stroke), `3b` Heart Rate Belt Info. Additional Status 1 also carries heart rate (byte 6, 255 = none) and pace per 500 m (bytes 7-8, hundredths of a second). Numbers are sent low byte first. `lab.html` shows them live. Layouts match Concept2's document and the community library ergometer.js, and are not yet confirmed on a real row.
- The force curve (the PM5's power graph) is a stream: `3d`, notify, 2 to 288 bytes split over several notifications. Each notification is a header byte (high half = pieces in this curve, low half = points in this piece), a sequence number, then up to 9 two-byte points. The oldest PM5 hardware ("PM5v1") does not send it. `createForceCurveAssembler` in `pm5.js` glues the pieces together.
- Heart rate: the PM5 passes the user's paired Garmin chest strap through in Additional Status 1 byte 6 (confirmed on a real row, 2026-11-04), so no separate strap connection is needed. A direct strap connection (standard Bluetooth heart rate service) also works.
- Confirmed on the first recorded row (2026-11-04): pace (bytes 7-8 agree with the speed field and the PM5 screen), stroke rate, distance, time, power per stroke, and the force curve. Force curve values are pounds of force (lbf): each curve's peak matches that stroke's peak drive force in Stroke Data. Draw it on a fixed lbf scale, not stretched to fit, or easy strokes look like hard ones.
- Other apps (like ErgData) can hold the connection. Close them first.
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
3. Player controls: pause, resume, restart segment, shorten. Add auto-save and resume after a dropped connection, since that is the main friction point.
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
