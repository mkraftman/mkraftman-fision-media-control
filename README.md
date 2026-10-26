# Mkraftman Fision Media Control

A custom Home Assistant Lovelace card for controlling a Hotwire Fision box (Cisco ISB IPTV receiver) through the `script.fision_send` script (Global Caché iTach → IR).

## Features

- Transport controls: Skip Back (replay), Rewind, Play/Pause, Fast Forward, Skip Forward
- Play/Pause toggles between the box's separate play and pause commands; after rewind or fast forward the next tap returns to normal play
- Long-press Play/Pause to send Stop (returns to live TV)
- Permanent Fision artwork background
- Responsive layout with ResizeObserver

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend** > **Custom repositories**
3. Add `https://github.com/mkraftman/mkraftman-fision-media-control` as a **Lovelace** repository
4. Install **Mkraftman Fision Media Control**

## Prerequisites

A script that takes a `command` field and sends it to the box — `script.fision_send` from the Fision HA package, with commands `replay`, `rewind`, `play`, `pause`, `stop`, `fast_forward` and `skip_forward`.

The background image defaults to `/local/images/fision.png`.

## Usage

```yaml
type: custom:mkraftman-fision-media-control
```

All options are optional:

| Option | Default | Description |
| --- | --- | --- |
| `name` | `Fision Cable TV` | Title shown on the card |
| `script` | `fision_send` | Script to call (with or without the `script.` prefix) |
| `image` | `/local/images/fision.png` | Background artwork |

## Releasing

Bump the version in `VERSION` (e.g. `1.0.1`) and push to `main`. The release workflow creates the matching `vX.Y.Z` tag and GitHub release with `dist/mkraftman-fision-media-control.js` attached. Pushing a `vX.Y.Z` tag directly also still works.
