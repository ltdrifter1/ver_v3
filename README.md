# VCR Records

`vcrrecords.com` homepage is the immersive **360° store** (Next.js).  
The previous static marketing/shop site lives unchanged at **`/shop`**.

## Routes

| Path | What |
|---|---|
| `/` | 360° illustrated record store (enter → look around → hotspots) |
| `/shop/` | Existing VCR site (HTML pages, releases, etc.) |

Top-nav **Shop** and the cash-register hotspot open `/shop/` in a **new tab**.

## Develop

```bash
npm install
npm run dev
```

- 360 app: http://localhost:3000  
- Legacy site: http://localhost:3000/shop/

## Deploy

Vercel project for this repo (Next.js). Domain `vcrrecords.com` should point at this deployment.
