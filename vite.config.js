import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(() => {
  const repositoryName =
    process.env.GITHUB_REPOSITORY?.split("/")[1] || "survival_craft";
  const base = process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : "/";

  return {
    base,
    plugins: [vue()],
  };
});
