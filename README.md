<p align="center"><img src="public/brand/gitFolio_landing.png" alt="gitFolio" width="360"></p>



# gitFolio

Free and open source CV builder. 
No watermark, no paywall, no ads.
> Your career, your way.

Live: https://michelesanfilippo.github.io/gitFolio/


## Demo

https://github.com/user-attachments/assets/c2c939f2-51f3-4fbe-aa6f-0cd47349610f



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
