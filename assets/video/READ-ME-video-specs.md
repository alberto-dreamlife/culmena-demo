# Hero video loops — drop files here

The site is already wired for these. **No code changes needed** — put the file in
this folder with the exact name below and it takes over automatically. Until then
each header falls back silently to its still image.

## Filenames the site is looking for

| File | Used on | Poster / source still |
|---|---|---|
| `hero-loop.mp4` | `index.html` hero | `assets/img/01-hero.png` |
| `homes-loop.mp4` | `homes.html` hero | `assets/img/02-homes-exterior.png` |
| `neighbourhood-loop.mp4` | `neighbourhood.html` hero | `assets/img/10-shops.png` |
| `statement-loop.mp4` | the dark statement band (all 3 pages) | any wide render |

A `.webm` twin of the same name is loaded first if present (smaller file, better
quality per byte in Chrome/Firefox). The `.mp4` is the Safari/iOS fallback — that
one is **required**, the webm is optional.

## Specs

- **Resolution:** 1920×1080 (2560×1440 max — it's a background, not the subject)
- **Aspect:** 16:9. The CSS crops with `object-fit:cover`, so keep anything
  important away from the edges.
- **Duration:** 6–12 seconds
- **Loop:** must be seamless. Last frame has to match the first — otherwise there's
  a visible jump every few seconds.
- **Motion (Robert's note):** static camera. Only the sky drifts and the trees sway.
  No pans, no zooms, no dolly. Subtle enough that it reads as a photograph that
  happens to be alive.
- **Audio:** none. Strip the track entirely — the tag is `muted` anyway and an
  audio stream is dead weight.
- **File size:** aim for **under 4 MB**, hard ceiling 8 MB. This loads before
  anything else on the page.

## Encoding

Once you have the raw clip, these two commands produce web-ready files:

```bash
# MP4 (H.264) — the required one
ffmpeg -i raw-clip.mp4 -an -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -vf "scale=1920:-2" hero-loop.mp4

# WebM (VP9) — optional, usually 30-40% smaller
ffmpeg -i raw-clip.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 \
  -vf "scale=1920:-2" hero-loop.webm
```

`-movflags +faststart` matters: it moves the index to the front of the file so
playback starts before the whole thing has downloaded.

## Generating the clip

The source stills are in `assets/img/`. Feed the matching still to an
image-to-video tool (Runway Gen-3, Kling, Luma, Sora) with a prompt along these
lines:

> Static locked-off camera, no camera movement. Only the clouds drift slowly across
> the sky and the tree foliage sways gently in a light breeze. Photorealistic,
> cinematic, subtle, 10 seconds, seamless loop.

Then trim to a clean loop point and run the ffmpeg commands above.
