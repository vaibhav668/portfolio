# Vaibhav's Island — 3D interactive portfolio

A floating-island portfolio built with Three.js and Vite. Visitors explore in first person,
meet Vaibhav (the guide) at the entrance, and follow the stone path through eight stops:

1. Entrance: Vaibhav introduces the island, plus an "About me" kiosk
2. The Academy: education (GBPIET)
3. Tech Workshop: skills
4. Neuro Research Lab: IIT Delhi research internship
5. Project Hall: all six projects on pedestals
6. Trophy Plaza: achievements
7. VISOR Control Center: quick access to every section + local search
8. Comm Tower: contact

Nothing has to be "played" to read the portfolio: the intro offers **Browse without playing**,
the **Sections** menu and **Map** jump straight to any section, and `classic/index.html`
is the original site, kept untouched.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build locally
```

The build uses relative paths, so `dist/` can be deployed to GitHub Pages, Netlify or Vercel as-is.
It must be served over http(s); opening `dist/index.html` straight from disk won't load ES modules.

## Controls

| Desktop | Mobile |
| --- | --- |
| W A S D move, mouse look, Shift sprint, Space jump | Left joystick move, drag right side to look |
| E interact, M map, Esc free cursor / close | Use button, Jump button |

Add `?lite` to the URL to force the low-quality mode. The site also lowers quality
automatically when the frame rate stays below ~32 fps.

## Editing content

All portfolio content lives in **`src/portfolio/portfolioData.js`** (copied from the original
`index.html`). Change it there; panels, VISOR search and the guide's lines all read from it.
Project and achievement images are in `public/assets/`.

## Structure

```
src/
  main.js                    app state, cinematic, modes, render loop
  world/layout.js            island shape, path spline, station positions
  world/Terrain.js           heightfield, island mesh, underside, floating rocks
  world/Environment.js       sky, light, clouds, water, grass, trees, birds
  world/Landmarks.js         bridge, every station, central tower, city corner
  world/helpers.js           materials, hologram shader, text textures
  player/Player.js           first-person movement and physics
  player/Collision.js        colliders, walkable surfaces, ground height
  player/TouchControls.js    mobile joystick and buttons
  characters/VaibhavGuide.js the guide: model, animations, path following
  interaction/InteractionManager.js  proximity interactions (id, name, prompt, action)
  portfolio/PortfolioUI.js   section rendering, local search, guide lines
  ui/UI.js                   loading, intro, HUD, dialogue, panels, VISOR, map
  effects/Effects.js         confetti and the web-launcher easter egg
public/classic/              the original portfolio, unchanged
```

To add an interactive object, push `{ id, name, prompt, position, radius, action }` to the
interaction manager; `action.section` opens a panel.

## Notes

- All 3D models are procedural Three.js geometry; no third-party models are used.
- The Spider-Man and Iron Man touches are original nods (web railings, rooftop webs, a
  prototype suit of Vaibhav's own design, a holographic control center), not Marvel characters or logos.
- VISOR works entirely from local data. No AI service is connected; `searchPortfolio()` in
  `PortfolioUI.js` is the place to swap in an API later.
