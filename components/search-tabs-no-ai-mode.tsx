import { TrackedLink } from "@/components/tracked-link"

interface SearchTabsProps {
  currentPage?: string
}

export function SearchTabs({ currentPage = "all" }: SearchTabsProps) {
  const tabs = [
    { name: "All", key: "all", href: "/" },
    { name: "Images", key: "images", href: `/iframe?url=${encodeURIComponent('https://www.google.com/search?tbm=isch&q=example')}` },
    { name: "Short videos", key: "videos", href: `/iframe?url=${encodeURIComponent('https://www.google.com/search?tbm=vid&q=example')}` },
    { name: "Forums", key: "forums", href: `/iframe?url=${encodeURIComponent('https://www.reddit.com/search?q=example')}` },
    { name: "More", key: "more", href: `/iframe?url=${encodeURIComponent('https://www.google.com/search?q=example')}` },
  ]

  return (
    <div className="flex items-center space-x-6 overflow-x-auto scrollbar-hide">
      {tabs.map((tab, index) => (
        <TrackedLink
          key={tab.name}
          href={tab.href}
          componentName="SearchTabs"
          linkIndex={index}
          className={`py-3 px-1 text-sm border-b-2 whitespace-nowrap ${
            currentPage === tab.key
              ? "text-blue-600 border-blue-600"
              : "text-gray-600 border-transparent hover:text-gray-800"
          }`}
        >
          {tab.name}
        </TrackedLink>
      ))}
    </div>
  )
}
