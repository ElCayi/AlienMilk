// Backend target for /api during development.
//
// Read from the environment so several worktrees can run side by side, each
// against its own Spring Boot when it needs one. The fallback is the shared
// instance on 8081, which is how this repo has always worked and what a plain
// clone gets with no configuration at all.
//
// See worktree.toml at the repo root for how BACKEND_URL is meant to be set.
export default {
  '/api': {
    target: process.env.BACKEND_URL ?? 'http://127.0.0.1:8081',
    secure: false,
    changeOrigin: true,
  },
};
