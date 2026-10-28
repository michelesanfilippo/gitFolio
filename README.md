<p align="center"><img src="public/brand/gitFolio_landing.png" alt="gitFolio: free and open source CV builder" width="100%"></p>



# gitFolio

Free and open source CV builder. 
No watermark, no paywall, no ads.
> Your career, your way.

Live: https://michelesanfilippo.github.io/gitFolio/


## How it works
https://github.com/user-attachments/assets/89d6792b-c091-4231-978a-839c5746799c



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
