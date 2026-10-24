# WatchAnimeWorld Vega Provider

Provider folder for `https://watchanimeworld.one/`.

## Files
- `catalog.ts` — Latest Updates, Series, Movies, Animation categories.
- `posts.ts` — catalog/search scraping.
- `meta.ts` — title, poster, synopsis, movie/series and season detection.
- `episodes.ts` — season/episode listing, including the site's season AJAX fallback.
- `stream.ts` — embedded player discovery and existing Vega extractors.
- `settings.ts` — optional provider settings.

## Integration notes
Copy this folder into the Vega repository's `providers/` directory. `stream.ts` intentionally uses the repository-provided `../extractors/abbasy` and `../extractors/zypter` modules, as the supplied AnimeSalt provider did; those shared modules must exist in the host project.

Build and test from the Vega project root:

```sh
npm run build
npm run test:provider -- watchanimeworld getPosts --rebuild
npm run test:provider -- watchanimeworld getMeta
npm run test:provider -- watchanimeworld getEpisodes
npm run test:provider -- watchanimeworld getStream
```

Scraping selectors and stream host extraction are best-effort and may need updates if the site changes its markup or blocks requests. This provider does not bypass DRM or access controls.
