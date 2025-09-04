'use client'

import Image from "next/image"
import { MoreVertical } from "lucide-react"
import {usePathname} from "next/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { trackShowAllClick } from "@/lib/analytics"

interface VideoData {
  title: string
  url: string
  channel: string
  date: string
  duration?: string
}

export function VideosSection() {
   const pathname = usePathname();
    const pageName = pathname.split("/").slice(1, 2).join("-");
    const videoData = require(`@/data/${pageName}/video.json`);
  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl">Videos</h2>
        <button className="ml-2">
          <MoreVertical className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="space-y-6">
        {videoData.map((video: VideoData, index: number) => (
          <div key={index} className="flex items-start gap-4 border-b border-gray-200 pb-6">
            <div className="relative flex-shrink-0">
              <Image
                src={`/${pageName}/video-thumbnails/${index+1}.jpeg`}
                alt={video.title}
                width={180}
                height={100}
                className="rounded-lg w-[180px] h-[100px] object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="ml-1"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </div>
            </div>

            <div>
              <h3 className="text-xl text-blue-800 hover:underline">
                <TrackedLink componentName="Video" linkIndex={index} href={video.url}>{video.title}</TrackedLink> {/* 使用动态链接 */}
              </h3>
              <div className="text-sm text-gray-600 mt-1">{video.channel}</div>
              <div className="text-sm text-gray-600">{video.date}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button 
          onClick={() => trackShowAllClick("VideosSection")}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-3 px-6 rounded-full hover:bg-gray-200 w-full max-w-md"
        >
          <span>View all</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}