# Contributing to WireZero

Thank you for your interest in contributing to **WireZero**! Contributions, bug reports, and feature suggestions are all welcome.

## Getting Started

1. **Fork the repository** and create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Load the extension locally in Firefox** to test your changes:
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
   - Click **Load Temporary Add-on...**
   - Select the `manifest.json` file from your local repository folder.
   - Use the **Reload** button on the debugging page whenever you make code changes.

## Making Changes

- **Keep changes focused:** Submit separate pull requests for unrelated bug fixes or features so they are easier to review.
- **Test across features:** If your change affects blocking, request modification, or UI toggles, verify that existing popup controls and counters still update properly.
- **Do not touch `browser_specific_settings`:** Leave the Gecko add-on ID in `manifest.json` unchanged so automated releases continue to map to the official Firefox Add-ons listing.
- **Version numbers:** You do not need to bump the `"version"` in `manifest.json` unless asked—the maintainer will handle version bumps prior to publishing.

## Linting Before Submitting (Optional)

Releases are automatically validated with Mozilla's `web-ext` tool. If you have Node.js installed, you can run the same check locally before opening a pull request:

```bash
npx web-ext lint --source-dir=.
```

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a **Pull Request** against the `main` branch.
3. Provide a clear description of what your change does and how to test it.

Once merged, updates are packaged and published to Firefox Add-ons via GitHub Actions.
