import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})
async function setup() {
  vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "a5bi1hsj")
  vi.stubEnv("VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET", "test-preset")
  return import("./uploadProductImage")
}
const file = () => new File(["image"], "product.jpg", { type: "image/jpeg" })
describe("Cloudinary browser uploads", () => {
  it("sends only file and unsigned preset and returns secure URL", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url:
            "https://res.cloudinary.com/a5bi1hsj/image/upload/v1/product.jpg",
        }),
      })
    vi.stubGlobal("fetch", fetcher)
    const { uploadProductImage } = await setup()
    expect(await uploadProductImage(file(), "product")).toContain(
      "https://res.cloudinary.com/",
    )
    expect([...fetcher.mock.calls[0][1].body.keys()]).toEqual([
      "file",
      "upload_preset",
    ])
  })
  it("fails without setup before any network request", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "")
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    const { uploadProductImage } = await import("./uploadProductImage")
    await expect(uploadProductImage(file(), "p")).rejects.toThrow("setup")
    expect(fetcher).not.toHaveBeenCalled()
  })
  it("rejects unsupported MIME and oversized files", async () => {
    const { uploadProductImage } = await setup()
    await expect(
      uploadProductImage(
        new File(["exe"], "file.exe", { type: "application/octet-stream" }),
        "p",
      ),
    ).rejects.toThrow("JPEG")
    const big = file()
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 })
    await expect(uploadProductImage(big, "p")).rejects.toThrow("5 MB")
  })
  it.each(["error", "network", "unexpected-url"])(
    "surfaces %s without a fallback",
    async (scenario) => {
      vi.stubGlobal(
        "fetch",
        scenario === "network"
          ? vi.fn().mockRejectedValue(new Error("offline"))
          : vi.fn().mockResolvedValue({
              ok: scenario !== "error",
              json: async () =>
                scenario === "error"
                  ? { error: { message: "Preset missing" } }
                  : { secure_url: "https://example.com/image.jpg" },
            }),
      )
      const { uploadProductImage } = await setup()
      await expect(uploadProductImage(file(), "p")).rejects.toThrow()
    },
  )
})
