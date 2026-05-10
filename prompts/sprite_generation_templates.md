# Personal Sprite Generation Prompt Templates

These templates adapt the "animation-safe first pose -> video animation -> deterministic sprite pipeline" workflow for Memory Map.

## 1. Codex Image2 First Frame

Use this when generating the first animation-safe image.

```text
Create one full-body 2D isometric pixel-art game character for Memory Map.

Subject:
{character_description}

Layer 1 personality and life context:
{semantic_context}

Pose:
{starting_pose}

Hard requirements:
- one character only
- full body visible from head to feet
- character centered in frame
- generous empty margin on all sides
- no part of the character enters the outer 25% border area
- character height around 40-50% of the canvas
- clean readable silhouette
- stable identity markers: {identity_markers}
- same visual style as a bright isometric personal AI company game
- flat exact #00FF00 background only
- no shadow
- no floor
- no props
- no extra characters
- no text
- no watermark
- no border
- no gradients
- do not use #00FF00 or near-green on the character, clothing, eyes, gems, glow, or outline
```

For non-idle animations, ask Codex image2 for a transition pose instead of an extreme pose:

```text
Create the first frame of a {animation_name} animation.
The pose should be a small transition away from idle, not the most extreme action pose.
Move one foot a few pixels, shift the body weight slightly, and prepare the arms for the action.
Keep the same identity, scale, facing direction, camera angle, and exact #00FF00 background.
```

## 2. Dreamina Image2Video: Walk In Place

Use this as `animation.prompt` for `dreamina image2video`.

```text
Use the uploaded image as the exact first frame.
Animate a tiny isometric pixel-art character walking in place.

Keep the character pinned to the center of the screen.
Keep the same facing direction for the entire clip.
The character must not turn, rotate, face a new direction, move forward, move backward, or travel across the screen.

Only animate a simple two-step walk cycle:
the feet alternate a few pixels,
the knees bend slightly,
and the arms bob gently.

Keep the head, chest, body angle, outfit, face, size, colors, and pixel-art design the same.

Locked camera.
No zoom, no pan, no rotation, no cuts, no camera shake, no dolly movement.
Flat #00FF00 green background stays unchanged.
No shadows, no floor, no effects, no blur, no new details, no redesign, no text, no watermark.
```

## 2A. Dreamina Image2Video: Idle Breathing

```text
Use the uploaded image as the exact first frame.
Animate a tiny isometric pixel-art character idling in place.

Keep the character pinned to the center of the screen.
Keep the same facing direction, same scale, same outfit, same face, and same colors.
Only animate a subtle breathing loop:
the shoulders rise and fall by a few pixels,
the head has a tiny natural bob,
and clothing or hair moves very slightly.

Locked camera.
No zoom, no pan, no rotation, no cuts, no travel.
Flat #00FF00 green background stays unchanged.
No shadows, no floor, no effects, no blur, no new details, no redesign, no text, no watermark.
```

## 2B. Dreamina Image2Video: Interact

```text
Use the uploaded image as the exact first frame.
Create a short interaction animation for a Memory Map character.

The character leans slightly forward,
raises one hand,
taps or points at an invisible screen,
pauses briefly,
then returns toward the ready stance.

Keep the character centered and the same size.
Keep the same facing direction, outfit, face, colors, and pixel-art design.
Locked camera.
Flat #00FF00 background stays unchanged.
No object appears in the hand.
No UI, no text, no floor, no shadows, no blur, no watermark, no redesign.
```

## 2C. Dreamina Image2Video: AI Work Loop

```text
Use the uploaded image as the exact first frame.
Animate a tiny isometric pixel-art AI employee working in place.

The character looks focused,
makes small typing or scanning hand motions,
nods subtly,
and loops back to the starting work pose.

Keep the character pinned to the center.
Keep the same facing direction, same scale, same outfit, same face, and same colors.
Locked camera.
Flat #00FF00 background stays unchanged.
No desk, no monitor, no props, no UI, no text, no shadow, no floor, no blur, no watermark, no redesign.
```

## 2D. Dreamina Image2Video: React

```text
Use the uploaded image as the exact first frame.
Create a short acknowledgement reaction.

The character turns attention slightly toward the viewer,
raises one hand in a small greeting or confirmation gesture,
then returns toward the ready stance.

Keep the character centered and the same size.
Do not change facing direction.
Locked camera.
Flat #00FF00 background stays unchanged.
No text, no symbols, no props, no floor, no shadows, no blur, no watermark, no redesign.
```

## 2E. Dreamina Image2Video: Celebrate

```text
Use the uploaded image as the exact first frame.
Create a small task-complete celebration animation.

The character brightens emotionally,
raises both hands slightly,
makes one quick happy bounce,
then settles back toward the ready stance.

Keep the motion small and game-readable.
Keep the character centered and the same size.
Locked camera.
Flat #00FF00 background stays unchanged.
No confetti, no text, no UI, no props, no floor, no shadows, no blur, no watermark, no redesign.
```

## 3. Dreamina Image2Video: Room Unlock

```text
Use the uploaded image as the exact first frame.
Create a short game unlock animation for a Memory Map personal world building.

The building gently brightens,
small lights turn on,
plants or decorative details subtly appear,
and the scene settles into a clean unlocked state.

Keep the building centered and the same size.
Keep the same isometric pixel-art style.
Locked camera.
No zoom, no pan, no rotation, no cuts.
Flat #00FF00 background stays unchanged.
No floor, no shadows, no text, no watermark, no extra objects outside the building.
```

## 3A. Dreamina Image2Video: Memory Door Open

```text
Use the uploaded image as the exact first frame.
Animate a tiny 2.5D isometric pixel-art memory museum door opening for a game transition.

Keep the same building facade, same door frame, same isometric angle, same scale, same colors, and same pixel-art design.
Only the door opens inward with a small warm light appearing from inside.
The building does not move.
The asset stays centered and does not travel.

Locked camera.
No zoom, no pan, no rotation, no cuts, no camera shake.
Flat #00FF00 background stays unchanged.
No shadows, no floor, no extra props, no characters, no UI, no text, no watermark, no blur, no redesign.
```

## 4. Dreamina Image2Video: Damp Fatigue Visual State

```text
Use the uploaded image as the exact first frame.
Create a subtle damp-fatigue environmental state animation for a Memory Map island.

The water feels slightly higher,
soft reeds sway gently,
a very light mist passes through,
and the colors become a little calmer.

Keep the island centered and the same size.
Do not move the camera.
Do not add numbers, labels, UI, or explanatory text.
Flat #00FF00 background stays unchanged.
No zoom, no pan, no rotation, no cuts, no blur, no watermark.
```

## 5. Dreamina Image2Video: Recovery Visual State

```text
Use the uploaded image as the exact first frame.
Create a subtle recovery-state animation for a Memory Map island.

The light becomes warmer,
plants look slightly more alive,
small flowers open,
and the scene settles into a calm healthy state.

Keep the island centered and the same size.
Keep the same isometric pixel-art style.
Locked camera.
Flat #00FF00 background stays unchanged.
No text, no watermark, no floor, no shadows, no camera movement.
```

## 6. Review Rules

Reject or regenerate if:

- the first frame background is not exact `#00FF00`;
- the character or object touches the canvas edge;
- the video camera moves;
- the character changes identity;
- the animation turns into a different facing direction;
- the model adds floor, shadows, labels, props, or watermark;
- important limbs, weapons, hair, clothes, or effects are clipped.

Use the local pipeline only to remove background, preserve canvas, select frames, and package sprites. Do not repair model drift by per-frame recentering.
