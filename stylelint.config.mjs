const stylelintConfig = {
  extends: ["stylelint-config-standard"],
  rules: {
    "selector-class-pattern": null,
    "custom-property-pattern": null,
    // CSS Modules: `:global(...)` is valid and required for Mantine/theme hooks.
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
    // Stage 13: the stage-by-stage CSS relies on later overrides (dark mode,
    // mobile, motion). Merging them blindly would change the cascade, so they
    // stay visible as warnings (tech debt DNT-S13-CSS-001) instead of blocking CI.
    "no-duplicate-selectors": [true, { severity: "warning" }],
    "no-descending-specificity": [true, { severity: "warning" }],
  },
};

export default stylelintConfig;
