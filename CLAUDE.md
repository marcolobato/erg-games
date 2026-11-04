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

- Two files: `index.html` (HTML and JS together) and `style.css`. No build step, no dependencies. It is the first example app.
- Connects to a PM5 with Web Bluetooth. Confirmed working: the live stroke rate in the app matched the PM5 display.
- Practice mode: arrow keys set a fake stroke rate, so it runs with no erg.
- Two workouts built in, named by code only: Week 1 Session 2 (W1S2, default) and Week 1 Session 1 (W1S1).
- Fonts: JetBrains Mono for numbers and headings, IBM Plex Mono for small text. Own colors on purpose, inspired by the PM5 screen.
- Game: Pyramid Darts. A crosshair moves up when stroke rate is too high and down when too low. A dart lands every 2 seconds.

## What is verified and what is not

Verified: Bluetooth connection, live stroke rate, game runs through warm-up and into the first interval (also tested headless).

Not verified:
- How the game feels while actually rowing a full session.
- W1S2 starts at 22 spm. The source only says the steps alternate between 22 and 24.
- W1S1 repeats 4 pyramids. The source does not give a count. 4 pyramids is 13.5 minutes, or 16.5 with the 3 minute warm-up.
- Safari and iPhone cannot use Web Bluetooth. Chrome or Edge on a laptop, or Chrome on Android, are needed.

## PM5 Bluetooth facts

Source: Concept2 PM5 Bluetooth Smart Communication Interface Definition (public PDF on concept2.com/support/software-development).

- Device name starts with `PM5`. Wake it by pulling the handle.
- Rowing service: `ce060030-43e5-11e4-916c-0800200c9a66`
- Additional Status 1 characteristic: `ce060032-43e5-11e4-916c-0800200c9a66`. Stroke rate is byte 5 (strokes per minute).
- Sample rate characteristic: `ce060034-43e5-11e4-916c-0800200c9a66`. Writing `1` asks for updates about every 500 ms.
- Other apps (like ErgData) can hold the connection. Close them first.
- Useful libraries to read for reference: ergometer.js (JavaScript), Concept2-SDK by RowBotics (Swift), c2bluetooth (Flutter).

## Workout format (plan)

Each workout is a list of segments: seconds and target stroke rate. Rest and warm-up have no target and no darts.

Current built-ins:
- W1S2: 3 min warm-up, then six 2 min steps alternating 22 and 24 spm, no rest. 15 min.
- W1S1: 3 min warm-up, then 90 s at 24, 60 s at 26, 30 s at 28, then 30 s rest, repeated.

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
