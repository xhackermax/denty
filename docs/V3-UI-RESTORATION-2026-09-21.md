# Denty V3 · UI restoration · 2026-09-21

This release restores the visual identity of Denty 2.3.4 on top of the V3 architecture.
It does not reintroduce the legacy runtime.

## Theme

- Light mode now uses the clinical Denty white / blue / teal language with subtle depth.
- Dark mode restores the deep navy background, cyan-blue glow, translucent surfaces and high contrast.
- Sidebar, sticky header, cards, panels and mobile navigation share the same tokens in both themes.

## Information architecture

- Sidebar is grouped into primary workflow, Clinical, Management and System sections.
- Navigation items use restrained functional accent colors while preserving a single Denty palette.
- Dashboard hierarchy is now: Now / Quick actions / Clinical pipeline / Management and operations.

## Patient carousel

- Maintains native horizontal scrolling and scroll snap.
- Adds an active card, spring scale/opacity animation, centered navigation, counter and clickable position dots.
- Keyboard and touch scrolling remain available because the viewport remains a native scroll container.

## Professional odontogram

- Each permanent tooth now renders as an anatomical SVG according to tooth type: incisor, canine,
  premolar or molar.
- Upper and lower arches are visually oriented around an occlusal plane.
- Five interactive surfaces remain mapped to the domain model: M, D, V, P/L and O/I.
- Root / crown anatomy and clinical overlays are separate from the persisted entity model.
- Endodontic, post, implant, extraction and missing states have dedicated anatomical marks.
- Existing undo/redo, surface actions, templates, persistence, history and voice state remain untouched.

## Verification performed in the packaging environment

- Vercel preflight: 7/7 stages passed.
- Architecture gate: passed.
- Denty Games integrity: 20/20 protected assets unchanged.
- API parity: 193/193 represented browser contracts.
- TypeScript/TSX parse: 168 files, 0 parse diagnostics.
- CSS module usage audit: no missing class selectors in the modified UI modules.

A full `npm ci`, ESLint, Stylelint, TypeScript typecheck, Vitest and `next build` still require the
Node 24 / npm-enabled Vercel environment because dependencies are not installed in this packaging
sandbox.
