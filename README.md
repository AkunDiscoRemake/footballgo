# ⚽ Football Go: Play in VR without paying a lot!

Football Go is a football (soccer) game in virtual reality. It runs in the browser with **WebXR** and was built for the **Oculus Go** and its 3DoF controller. It also works on Quest and other headsets, and on PC/mobile browsers with keyboard and mouse.

It's also an **educational sports game**: it teaches you how to play and covers the official rules (field, timing, restarts, fouls and cards, penalties, offside), with lessons, practice drills and a quiz.

> 🙏 **Credits:** inspired by **VRFS (VR Football Simulator)**. All credit for the idea of controlling your foot with the controller in VR, and for the vision of a realistic football game in VR, goes to VRFS and its creators. Football Go is an independent, free fan project with no affiliation to VRFS, FIFA or any national team/club. All player names are fictional.

## 🎮 How to play

### Oculus Go (3DoF controller)
| Action | Control |
|---|---|
| Position your foot | **Point the controller**: down = foot close to your body, forward = foot further ahead, up = lift your foot |
| Kick | A **quick flick** of the wrist from bottom to top (the faster, the harder) |
| Spin/curve | Move your foot sideways at the moment of contact |
| Walk | **Touch the touchpad** (walks in the direction you're looking) |
| Sprint | Hold the **trigger** |
| Pause | **Click the center** of the touchpad |
| Turn 45° | **Click the left/right edges** of the touchpad |
| Header | The ball really hits your head, so move your head! |
| Goalkeeper | Point the controller where you want your gloves; the touchpad moves you along the line |

### Browser
`WASD` walk · `Shift` sprint · `Arrows / Q E` look and turn · `right-click + drag` look · **mouse** positions your foot (move the mouse up quickly to kick) · `Space` assisted kick · `Esc / P` pause.

## ✨ Features
- **Stadium**: crowd of thousands of fans (they jump and raise their arms when there's a goal), roof, floodlights, LED ad boards, big screens, dugouts, goals with nets, mowed grass.
- **Players**: skinned 3D models with faces, hair, kits with names and numbers, and running, kicking, diving and celebration animations.
- **Real physics**: drag, Magnus effect (curve), bounce, posts and crossbar, net.
- **Quick match**: 18 national teams, 5v5 / 7v7 / 11v11, 4 difficulty levels, configurable length.
- **Rules applied in matches**: kickoff, throw-in, corner, goal kick, fouls, free kicks with a wall at 9.15 m, penalties, yellow/red cards, **offside** (with an optional visual helper), halftime and side switch, referee.
- **Penalty shootout**: you take the kicks and you defend (first-person goalkeeper).
- **Football School**: 5 practice lessons (walking, controlling, passing, shooting, goalkeeping), 6 rules lessons with diagrams, and a final quiz.
- **Free training**: targets in the goal corners and an optional goalkeeper.
- **Rewards**: coins, a free **daily bag**, Bronze/Silver/Gold **reward bags** with rarities (Common, Rare, Epic, Legendary).
- **Locker room**: **boots with specs** (power, control, speed, curve) and **balls with specs** (weight, bounce, curve, visibility) that really change the gameplay.
- **Clubs & League**: create your club (name, colors, kit), play a league season with a table and prizes, and **share your club code** with friends. They import it and your club joins their league.
- Comfort: vignette while moving, snap turn, left foot option, light/high graphics, day/night.

## 🚀 Running locally
It's a static site, no build needed:
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
WebXR needs HTTPS (or localhost). GitHub Pages already serves over HTTPS.

## 🌐 GitHub Pages
The `.github/workflows/pages.yml` workflow publishes the site automatically on every push.
If Pages isn't enabled yet: **Settings → Pages → Source: GitHub Actions**.

## 🛠 Technology
- [three.js r128](https://threejs.org) (MIT), the classic non-module build, compatible with the Oculus Go's Oculus Browser
- [webxr-polyfill](https://github.com/immersive-web/webxr-polyfill) (Apache-2.0) for WebVR-only browsers
- Models, textures (canvas) and sounds (WebAudio) **generated in code**: no heavy downloads, and it runs on the Go
- Players use `SkinnedMesh` (1 draw call per player) and the crowd is GPU-instanced billboards (1 draw call)

## 📁 Structure
```
index.html          start screen (enter VR / browser, import club)
js/data.js          teams, boots, balls, bags, lessons, quiz
js/save.js          profile (localStorage), bags, clubs and league
js/textures.js      procedural textures (grass, kits, faces, crowd, LED)
js/stadium.js       stadium, lines, goals, stands, crowd, lights
js/player.js        skinned human models, boots, first-person legs (IK)
js/ball.js          ball and physics
js/human.js         player: movement, 3DoF foot, kick, header, goalkeeper
js/match.js         match: AI, goalkeepers, rules, set pieces, referee
js/modes.js         penalties, training, lessons, 3D showcase
js/ui.js            canvas panels in VR, laser pointer, HUD
js/screens.js       menus
js/main.js          renderer, WebXR and the game loop
```
