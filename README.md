[README.md](https://github.com/user-attachments/files/31630581/README.md)
# Dream Drop 🏀

Dream Drop is a basketball-themed educational game I built for children with special needs, as part of an 8-week internship with SSSVV. The idea was to make learning feel like play — drag, drop, and shoot your way through 30 levels while picking up basic concepts along the way.

## What it is

- 30 levels of increasing difficulty (with an easy/hard mode)
- Badges and achievements to keep kids motivated (Speed Demon, Perfect Shot, Dream Drop King, and more)
- Player profiles so multiple kids can play and track their own progress
- Works on both desktop and mobile/tablet (landscape mode recommended for gameplay)

## Tech

Built with plain HTML, CSS, and JavaScript — no frameworks, no build step. Progress is saved locally in the browser, with Firebase used for syncing/host dashboard features.

## Running it locally

Just clone the repo and open `home.html` in a browser, or serve it locally:

```bash
git clone https://github.com/vardhanngg/Dream-And-Drop
cd Dream-And-Drop
python3 -m http.server 8000
```

Then visit `http://localhost:8000/home.html`.

## Live version

You can also play it directly here: [sathvik23bit.github.io/Dream-And-Drop](https://sathvik23bit.github.io/Dream-And-Drop)

## Why I made this

This was built to give kids with special needs a fun, low-pressure way to engage with learning — something colorful and game-like rather than a worksheet. It was submitted as part of my internship work under Dr. V. Bhaskaran at DMACS, SSSIHL.

## Status

Actively maintained — bug fixes and UI polish still ongoing (timer behavior, level tracking, mobile layout, etc.)
