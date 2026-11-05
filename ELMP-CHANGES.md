# ELMP changes to upstream files

Fork of the Open edX app for the **Mission Hospital Learning Classroom** (ELMP Plan 3). Branch `elmp/verawood`, based on `release/verawood`.
Our own code lives in `src/elmp/`, shared pieces in [`elmp-classroom-kit`](https://github.com/Praweechai/elmp-classroom-kit).
Rule (C-8): plugin slots first; an upstream file is edited only when no slot or config can do the job, and every such file is listed here. CI fails if a changed upstream file is missing from this table or if more than 25 are changed (NFR-C11).

| Upstream file | Change | Why | Undo |
|---------------|--------|-----|------|
| `src/index.jsx` | `import './elmp';` (1 line) | Loads our slot wiring. tutor-mfe overwrites `env.config.jsx` at build time and `mergeConfig` is shallow, so slots are merged after config load (P3-1.03) | Delete the line |
| `src/index.test.jsx` | `jest.mock('./elmp', () => ({}))` (1 line) | Upstream test reads `subscribe` calls by position; our module adds one | Delete the line |
| `package.json` | dependency `@elmp/classroom-kit` (git tag) | Shared Classroom kit (R-15 §3): header, player top bar, unit title | Remove the dependency |
| `package-lock.json` | lock entry for the kit (`git+https`, pinned commit) | `npm ci` in CI and in the image build | `npm uninstall @elmp/classroom-kit` |
| `src/course-home/outline-tab/OutlineTab.jsx` | Title row + Start/Resume card → `<CourseHomeHero>` (import + 4 lines; 2 unused names removed) | No slot covers the course title or the Start/Resume card; S-75 hero needs both (P3-5.02) | Restore the title `div` and `<StartOrResumeCourseCard />` |
| `src/course-home/outline-tab/OutlineTab.test.jsx` | `jest.mock('../../elmp/CourseHomeHero', …)` (1 line) → upstream tests see the upstream Start/Resume card | Keeps upstream tests checking upstream behaviour; ours are in `src/elmp` | Delete the line |
