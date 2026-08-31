import path from "node:path";

const inlinePreviewPlugin = path.resolve(
  process.cwd(),
  "postcss-inline-preview.mjs",
);

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    [inlinePreviewPlugin]: {},
  },
};

export default config;
