<p align="center"><img src="public/brand/gitFolio-source.png" alt="gitFolio" width="360"></p>

# gitFolio

Free, open source CV builder. No watermark, no paywall, no sign-up. Your data stays in your browser.

Live: https://michelesanfilippo.github.io/gitFolio/

> Status: early development (Phase 0 — foundations and PDF engine spike).

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
