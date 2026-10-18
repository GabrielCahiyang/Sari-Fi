import dotenv from "dotenv"
import { v2 as cloudinary } from "cloudinary"

export function configuredCloudinary() {
  dotenv.config({ path: ".env.local", quiet: true })
  const url = process.env.CLOUDINARY_URL
    ? new URL(process.env.CLOUDINARY_URL)
    : undefined
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || url?.hostname
  const api_key = process.env.CLOUDINARY_API_KEY || url?.username
  const api_secret = process.env.CLOUDINARY_API_SECRET || url?.password
  if (cloud_name !== "a5bi1hsj" || !api_key || !api_secret)
    throw new Error(
      "Configure the intended Cloudinary account in private .env.local before using administrative tools.",
    )
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
  return cloudinary
}
