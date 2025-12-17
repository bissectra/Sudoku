# Deploying to GitHub Pages

1. **Install dependencies.** Run `npm install` locally so `gh-pages` and every other dependency is available.
2. **Set the base URL.** Unless you are publishing on `https://<username>.github.io/`, you must tell Vite what path the site will live under:
   - Set the `GH_PAGES_BASE` (or `VITE_BASE_URL`) environment variable to the path that corresponds to your repository, for example `/Sudoku/`.
   - If you publish to `https://<username>.github.io/Sudoku/`, the build will automatically adjust the base path before deploying.
   - If you are publishing to your user site (`https://<username>.github.io/`), you can leave the variable unset and Vite will build with `/`.
3. **Deploy.** Run `npm run deploy`. The `predeploy` script triggers `vite build` first, and `gh-pages -d dist` pushes the resulting assets into the repository’s `gh-pages` branch.
4. **GitHub Pages settings.**
   - Configure your repository’s GitHub Pages source to use the `gh-pages` branch.
   - Double-check the published URL matches the base you set above.

If you ever change the repository name or the published path, update the `GH_PAGES_BASE` value before rebuilding so asset links remain correct.
