# Character Models — Sources & Licenses

All assets in this folder are free for personal AND commercial use. No attribution required (but appreciated).

## quaternius_modular_men/ + quaternius_modular_women/
- **Source:** Ultimate Modular Men / Women Packs by Quaternius (poly.pizza)
- **License:** CC0 1.0 (Public Domain) — https://creativecommons.org/publicdomain/zero/1.0/
- **Contents:** Rigged+skinned characters, each with 24 animation clips embedded (idle/walk/run/jump/punch/death/etc.)
- **Format:** GLB (glTF binary), converted by poly.pizza via FBX2glTF v0.9.7
- Men: adventurer, astronaut, beach, business_man, casual, farmer, hoodie_character, king, punk, swat, worker
- Women: adventurer, animated_woman x2, hooded_adventurer, punk, sci_fi_character, soldier, suit, witch, worker

## quaternius_animated_men/ + quaternius_animated_women/
- **Source:** Animated Men / Women Packs by Quaternius (poly.pizza)
- **License:** CC0 1.0 (Public Domain)
- **Contents:** Rigged characters, 11 animation clips each
- Direct CDN download URL pattern: https://static.poly.pizza/<s3id>.glb

## kenney_blocky-characters/
- **Source:** Blocky Characters 2.0 by Kenney (kenney.nl/assets/blocky-characters)
- **License:** CC0 1.0
- **Contents:** 18 static blocky characters (GLB/FBX/OBJ + textures) — good as background crowd

## kenney_animated-characters-{protagonists,survivors,retro}/
- **Source:** Kenney Animated Characters packs (kenney.nl)
- **License:** CC0 1.0
- **Contents:** ONE rigged model (characterMedium.fbx) per pack + swappable PNG skins + idle/jump/run animations (separate FBX)
- Skins include: criminal, cyborg, skater (protagonists); survivors & zombies; retro humans & zombies
- NOTE: three.js can't mix an FBX skin texture at runtime directly — bake skins onto the FBX in Blender or use the Kenney "Animated Characters" GLB workflow

## Recommended usage for a Schedule-1-style game
- Player / main NPCs: quaternius_animated_* or modular_* (real skeletons + walk/idle/run/punch/death clips ready for AnimationMixer)
- Crowd / pedestrians: kenney_blocky-characters GLBs (cheap, no animation needed at distance)
