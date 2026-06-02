# User Manual Assets

Drop images for the user manual in this directory. The user manual
generator (`src/components/layout/downloadUserManual.ts`) emits markdown
that can reference images using paths relative to the downloaded file, e.g.:

```markdown
![Architecture diagram](docs/user-manual-assets/architecture.png)
```

When the manual is downloaded, the images in this directory are NOT bundled
in the `.md` file — they remain in the repo. If you want self-contained
manuals, convert images to inline data URIs at generation time, or zip the
markdown + this directory together.

Recommended image conventions:

- **Format**: PNG for screenshots, SVG for diagrams.
- **Naming**: kebab-case, prefixed with the section they belong to
  (e.g. `dashboard-cpu-usage.png`, `network-topology.svg`).
- **Size**: keep under 500 KB; the manual is read by humans, not archived.

If you add an image, also wire it into `downloadUserManual.ts` so it lands
in the right section of the generated markdown.
