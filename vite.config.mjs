import preact from "@preact/preset-vite";

export default {
  root: "src",
  plugins: [preact()],
  build: {
    outDir: "../build",
    emptyOutDir: true,
  },
};
