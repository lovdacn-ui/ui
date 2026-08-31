const INLINE_PREVIEW_SELECTOR = '[data-preview-inline="true"]';
const INLINE_PREVIEW_SCOPES = [
  INLINE_PREVIEW_SELECTOR,
  `body:has(${INLINE_PREVIEW_SELECTOR}) > div[data-state]`,
  `body:has(${INLINE_PREVIEW_SELECTOR}) > div[tabindex="0"]`,
  `body:has(${INLINE_PREVIEW_SELECTOR}) > div[data-radix-popper-content-wrapper]`,
];

/**
 * React Native Web injects unlayered atomic base styles after Tailwind's named
 * utility layer. Unlayered rules win the cascade even when a utility selector
 * is more specific, so RN defaults can erase backgrounds, borders, positioning,
 * and text colors inside inline previews.
 *
 * Clone generated utility rules outside the layer and scope them to both the
 * inline host and Radix's direct-body portal roots. Web portals leave the
 * `[data-preview-inline]` subtree, but their roots are consistently stateful
 * modal containers or focus-managed containers. Keeping the scope on those
 * roots avoids elevating utilities across the rest of the documentation page.
 * The extra specificity beats RN Web's atomic classes while normal inline and
 * Reanimated styles still retain precedence.
 */
function inlinePreviewSpecificity() {
  return {
    postcssPlugin: "lvcn-inline-preview-specificity",
    OnceExit(root) {
      const elevated = [];

      root.walkAtRules("layer", (layer) => {
        if (layer.params.trim() !== "utilities") return;

        layer.walkRules((rule) => {
          const conditionalAncestors = [];
          let parent = rule.parent;
          let nestedInRule = false;
          let insideKeyframes = false;

          while (parent && parent !== layer) {
            if (parent.type === "rule") nestedInRule = true;
            if (parent.type === "atrule") {
              if (/keyframes$/i.test(parent.name)) insideKeyframes = true;
              conditionalAncestors.push(parent);
            }
            parent = parent.parent;
          }

          if (parent !== layer || nestedInRule || insideKeyframes) return;

          let elevatedNode = rule.clone({
            selector: rule.selectors
              .flatMap((selector) =>
                INLINE_PREVIEW_SCOPES.map(
                  (scope) => `${scope} ${selector}`,
                ),
              )
              .join(", "),
          });

          for (const ancestor of conditionalAncestors) {
            const wrapper = ancestor.clone({ nodes: [] });
            wrapper.append(elevatedNode);
            elevatedNode = wrapper;
          }

          elevated.push(elevatedNode);
        });
      });

      if (elevated.length === 0) return;
      for (const node of elevated) root.append(node);

      // RN Web gives direct-body Portal roots z-index: 0. The documentation
      // layout is itself a z-index: 10 stacking context, so non-modal portals
      // can be correctly positioned yet still paint and hit-test behind it.
      // Elevate only the portal roots already scoped to an inline preview.
      root.append({
        selector: INLINE_PREVIEW_SCOPES.slice(1).join(", "),
        nodes: [
          { prop: "position", value: "relative" },
          { prop: "z-index", value: "100", important: true },
        ],
      });
    },
  };
}

inlinePreviewSpecificity.postcss = true;

export default inlinePreviewSpecificity;
