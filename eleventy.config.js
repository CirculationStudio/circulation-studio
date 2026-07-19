import path from "node:path";
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "/src": path.resolve(".", "src")
        }
      }
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
}
