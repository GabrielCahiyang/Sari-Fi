export const cloudinaryCloudName =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ""
export const cloudinaryUploadPreset =
  import.meta.env.VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET || ""

export function validateProductImage(file: File): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP product image.")
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error("Product image must be between 1 byte and 5 MB.")
}

export function isHttpsImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

export async function uploadProductImage(
  file: File,
  _productId: string,
): Promise<string> {
  if (!cloudinaryCloudName || !cloudinaryUploadPreset)
    throw new Error(
      "Photo uploads need Cloudinary setup. Ask the administrator to configure the cloud name and unsigned upload preset.",
    )
  validateProductImage(file)
  const body = new FormData()
  body.append("file", file)
  body.append("upload_preset", cloudinaryUploadPreset)
  let response: Response
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryCloudName)}/image/upload`,
      {
        method: "POST",
        body,
        signal: AbortSignal.timeout(60000),
      },
    )
  } catch {
    throw new Error(
      "Photo upload could not connect. Check your connection and try again.",
    )
  }
  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string
    public_id?: string
    error?: { message?: string }
  }
  if (!response.ok || !payload.secure_url)
    throw new Error(
      payload.error?.message ||
        "Cloudinary upload failed. Check the unsigned upload preset and retry.",
    )
  const url = new URL(payload.secure_url)
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(`/${cloudinaryCloudName}/`)
  )
    throw new Error("Unexpected Cloudinary upload URL.")
  return payload.secure_url
}
