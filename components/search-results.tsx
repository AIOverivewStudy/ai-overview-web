import { MoreVertical } from "lucide-react"
import { TrackedLink } from "@/components/tracked-link"
import { WebsiteFavicon } from "@/components/website-favicon"
import { getWebsiteName } from "@/lib/favicon-service"

interface SearchResult {
  position: number
  title: string
  link: string
  redirect_link?: string
  displayed_link: string
  favicon?: string
  date?: string
  snippet?: string
  snippet_highlighted_words?: string[]
  sitelinks?: {
    inline?: {
      title: string
      link: string
    }[]
  }
  rich_snippet?: {
    bottom?: {
      extensions?: string[]
    }
    top?: {
      extensions?: string[]
    }
  }
  source?: string
}

interface SearchResultsProps {
  results: SearchResult[],
  page: number
}

// 从 displayed_link 提取域名；没有就退回到 link
function hostFromDisplayed(displayed?: string, fallbackUrl?: string): string {
  if (displayed && displayed.length) {
    const left = displayed.split("›")[0].trim();
    return left
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*/, "");
  }
  try {
    return new URL(fallbackUrl || "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}


export function SearchResults({ results, page }: SearchResultsProps) {
  return (
    <div className="space-y-8 mb-10">
      {results.map((result) => {
        const host = hostFromDisplayed(result.displayed_link, result.link)
        return(
        <div key={result.position} className="max-w-2xl">
          <div className="flex items-start">
            <div className="w-6 h-6 mr-3 mt-1 flex-shrink-0">
              <WebsiteFavicon
                // url={result.link}
                // size={24}
                // fallbackText={result.source?.charAt(0) || getWebsiteName(result.link).charAt(0)}
                url={`https://${host}`}
                size={24}
                fallbackText={result.source?.charAt(0) || getWebsiteName(`https://${host}`).charAt(0)}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                {/* <span className="mr-2">{getWebsiteName(result.link)}</span> */}
                <span className="mr-2">{getWebsiteName(`https://${host}`)}</span>
                <span className="text-gray-400">›</span>
                <span className="ml-2 text-gray-500">{result.displayed_link}</span>
                <button className="ml-2">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-xl mb-1">
                <TrackedLink
                  href={result.link}
                  componentName={`SearchResults_${page}`}
                  linkIndex={result.position}
                  className="text-blue-800 hover:underline"
                >
                  {result.title}
                </TrackedLink>
              </h3>
              {result.date && <div className="text-sm text-gray-600 mb-2">{result.date}</div>}
              <p className="text-sm text-gray-700 mb-2">
                {result.snippet &&
result.snippet.split(
  new RegExp(
    `(${result.snippet_highlighted_words?.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})`
  )
).map((part, i) =>
                  result.snippet_highlighted_words?.includes(part) ? (
                    <span key={i} className="font-bold">
                      {part}
                    </span>
                  ) : (
                    part
                  ),
                )}
              </p>

              {result.sitelinks?.inline && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {result.sitelinks.inline.map((sitelink, index) => (
                    <TrackedLink
                      key={index}
                      href={sitelink.link}
                      componentName={`SearchResults-Sitelinks_${page}`}
                      linkIndex={index}
                      className="text-blue-800 text-sm hover:underline"
                    >
                      {sitelink.title}
                    </TrackedLink>
                  ))}
                </div>
              )}

              {(result.rich_snippet?.bottom?.extensions || result.rich_snippet?.top?.extensions) && (
                <div className="text-sm text-gray-600 mt-1">
                  {result.rich_snippet.bottom?.extensions?.join(" · ") ||
                    result.rich_snippet.top?.extensions?.join(" · ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )})}
    </div>
  )
}
