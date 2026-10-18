import { useState } from "react"
import { Cloudinary } from "@cloudinary/url-gen"
import { fit } from "@cloudinary/url-gen/actions/resize"
import { AdvancedImage } from "@cloudinary/react"

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "a5bi1hsj"
const cloudinary = new Cloudinary({ cloud: { cloudName } })

/** Keep packaging intact. Legacy HTTPS images remain visible during migration. */
export function ProductImage({
  src,
  name,
  className = "",
}: {
  src?: string
  name: string
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string>()
  let publicId: string | undefined
  if (
    src?.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)
  ) {
    // Only optimize canonical URLs; transformed/signed legacy URLs are rendered unchanged.
    const path = src.split("/image/upload/")[1]
    const match = path.match(/^v\d+\/(.+)$/)
    if (match) publicId = match[1].replace(/\.[a-zA-Z0-9]+$/, "")
  }
  const usable = src?.startsWith("https://") && failedSrc !== src
  const img = publicId
    ? cloudinary
        .image(publicId)
        .format("auto")
        .quality("auto")
        .resize(fit().width(500).height(500))
    : undefined
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-[#F7F8F6] ${className}`}
    >
      {usable ? (
        img ? (
          <AdvancedImage
            cldImg={img}
            alt={name}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <img
            src={src}
            alt={name}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setFailedSrc(src)}
          />
        )
      ) : (
        <span
          className="p-2 text-center text-[10px] text-[#65727A]"
          role="img"
          aria-label={`Photo unavailable for ${name}`}
        >
          Photo coming soon
        </span>
      )}
    </div>
  )
}
