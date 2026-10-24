import { Post, ProviderContext } from "../types";

const BASE_URL = "https://watchanimeworld.one";
const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export async function getPosts({
  filter, page = 1, signal, providerContext,
}: {
  filter?: string; page?: number; providerValue?: unknown; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  return scrapePosts({ filter, page, signal, providerContext });
}

export async function getSearchPosts({
  searchQuery, page = 1, signal, providerContext,
}: {
  searchQuery: string; page?: number; providerValue?: unknown; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  return scrapePosts({ query: searchQuery, page, signal, providerContext });
}

async function scrapePosts({
  filter, query, page = 1, signal, providerContext,
}: {
  filter?: string; query?: string; page?: number; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  try {
    const normalizedFilter = (filter || "").replace(/^\/+|\/+$/g, "");
    let url: string;
    if (query?.trim()) {
      url = `${BASE_URL}/?s=${encodeURIComponent(query.trim())}`;
    } else if (normalizedFilter === "series") {
      url = page > 1 ? `${BASE_URL}/series/page/${page}/` : `${BASE_URL}/series/`;
    } else if (normalizedFilter === "movies") {
      url = page > 1 ? `${BASE_URL}/movies/page/${page}/` : `${BASE_URL}/movies/`;
    } else if (normalizedFilter) {
      url = `${BASE_URL}/${normalizedFilter.replace(/\/$/, "")}/`;
      if (page > 1) url = `${url.replace(/\/$/, "")}/page/${page}/`;
    } else {
      url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`;
    }

    const response = await axios.get(url, { headers, signal, timeout: 15000 });
    const $ = cheerio.load(response.data || "");
    const results: Post[] = [];
    const seen = new Set<string>();
    const resolve = (href: string) => {
      try { return new URL(href, BASE_URL).href; } catch { return ""; }
    };

    // Site pages use WordPress-style cards; keep selectors broad for theme updates.
    const selectors = [
      "article.post", "article", ".anime-blog", ".bsx", ".items .item",
      ".swiper-slide", ".post-lst li", ".listupd .bs", ".latest-movies-series-swiper-slide li",
    ].join(",");
    $(selectors).each((_: number, el: any) => {
      const card = $(el);
      let href = card.find("a[href*='/series/'], a[href*='/movies/'], a[href*='/episode/']").first().attr("href") ||
        card.find("a[href]").first().attr("href") || "";
      if (!href) return;
      href = resolve(href);
      if (!href || seen.has(href) || !/watchanimeworld\.one\//i.test(href)) return;
      // Don't list episode cards as catalog entries when a series/movie link is present.
      if (href.includes("/episode/") && card.find("a[href*='/series/'], a[href*='/movies/']").length) return;
      const imgEl = card.find("img").first();
      let title = (imgEl.attr("alt") || card.find("h2, h3, .tt, .entry-title, .title").first().text() || card.find("a[href]").first().text() || "").trim();
      title = title.replace(/\s+/g, " ").replace(/^(Image|View Serie|View Movie)\s*/i, "").trim();
      if (!title || title.length < 2) return;
      const imageSrc = imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || imgEl.attr("src") || "";
      const image = imageSrc ? resolve(imageSrc) : "";
      seen.add(href);
      results.push({ title, link: href, image });
    });

    // Fallback for cards whose outer markup isn't matched above.
    if (!results.length) {
      $("a[href*='/series/'], a[href*='/movies/']").each((_: number, el: any) => {
        const a = $(el); const href = resolve(a.attr("href") || "");
        if (!href || seen.has(href)) return;
        const title = (a.find("img").attr("alt") || a.attr("title") || a.text() || "").trim().replace(/\s+/g, " ");
        if (!title) return;
        const src = a.find("img").attr("data-src") || a.find("img").attr("src") || "";
        seen.add(href); results.push({ title, link: href, image: src ? resolve(src) : "" });
      });
    }
    return results;
  } catch (error) {
    console.log("WatchAnimeWorld getPosts error:", error instanceof Error ? error.message : String(error));
    return [];
  }
}
