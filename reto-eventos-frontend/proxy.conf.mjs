// Backend target for /api during development.
//
// Read from the environment: normal worktrees use Spring Boot on the main
// worktree's port 8081; a standalone worktree can use its own backend port.
// A plain clone also uses 8081 without extra configuration.
//
// See worktree.toml at the repo root for how BACKEND_URL is meant to be set.
export default {
  '/api': {
    target: process.env.BACKEND_URL ?? 'http://127.0.0.1:8081',
    secure: false,
    changeOrigin: true,
  },
};
