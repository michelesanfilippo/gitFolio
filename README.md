<p align="center"><img src="public/brand/gitFolio-source.png" alt="gitFolio" width="360"></p>

# gitFolio

Free and open source CV builder. 
No watermark, no paywall, no ads.
> Your career, your way.

Live: https://michelesanfilippo.github.io/gitFolio/


## Demo
https://github.com/user-attachments/assets/252eab41-5a31-4f11-90ac-1f10ac6265a9

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
