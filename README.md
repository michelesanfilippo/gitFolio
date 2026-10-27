<p align="center"><img src="public/brand/gitFolio-source.png" alt="gitFolio" width="360"></p>

# gitFolio

Free and open source CV builder. 
No watermark, no paywall, no ads.
> Your career, your way.

Live: https://michelesanfilippo.github.io/gitFolio/


## Demo

[![gitFolio demo: from the GitHub repo to a saved and shared CV](docs/demo/demo-preview.webp)](https://michelesanfilippo.github.io/gitFolio/brand/demo-desktop.webm)

From the GitHub repo to the live site: log in with GitHub, start a new CV (the default photo is added automatically),
edit it, save it to the Dashboard and share its design with a link.
Click the preview to watch the full-quality video. Recorded on the real interface with a simulated login and sample data.

## Development

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm typecheck
pnpm check:i18n
pnpm build               # static export in ./out (set NEXT_PUBLIC_BASE_PATH=/gitFolio to mimic Pages)
node scripts/serve-out.mjs   # serve ./out under /gitFolio
```

## License

MIT
