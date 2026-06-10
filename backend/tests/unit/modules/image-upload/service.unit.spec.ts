import sharp from "sharp"
import ImageUploadService, {
  IMAGE_MAX_WIDTH,
  IMAGE_SIZE_THRESHOLD,
  IMAGE_WEBP_QUALITY,
  shouldOptimizeImage,
} from "../../../../src/modules/image-upload/service"

const options = {
  bucket: "test-bucket",
  endpoint: "https://example.invalid",
  publicUrl: "https://cdn.example.test",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
}

describe("R2 image optimization", () => {
  it("uses the expected production thresholds", () => {
    expect(IMAGE_SIZE_THRESHOLD).toBe(300 * 1024)
    expect(IMAGE_MAX_WIDTH).toBe(1600)
    expect(IMAGE_WEBP_QUALITY).toBe(82)
  })

  it("optimizes only when size or width exceeds the threshold", () => {
    expect(
      shouldOptimizeImage({
        mimeType: "image/png",
        byteLength: IMAGE_SIZE_THRESHOLD,
        width: IMAGE_MAX_WIDTH,
      })
    ).toBe(false)

    expect(
      shouldOptimizeImage({
        mimeType: "image/png",
        byteLength: IMAGE_SIZE_THRESHOLD + 1,
        width: 800,
      })
    ).toBe(true)

    expect(
      shouldOptimizeImage({
        mimeType: "image/jpeg",
        byteLength: 100,
        width: IMAGE_MAX_WIDTH + 1,
      })
    ).toBe(true)
  })

  it("never optimizes GIF files", () => {
    expect(
      shouldOptimizeImage({
        mimeType: "image/gif",
        byteLength: IMAGE_SIZE_THRESHOLD + 1,
        width: IMAGE_MAX_WIDTH + 1,
      })
    ).toBe(false)
  })

  it("converts wide images to 1600px WebP before upload", async () => {
    const service = new ImageUploadService({}, options)
    let uploaded: Record<string, any> | undefined

    ;(service as any).s3.send = jest.fn(async (command: { input: Record<string, any> }) => {
      uploaded = command.input
      return {}
    })

    const source = await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: { r: 120, g: 40, b: 180 },
      },
    })
      .png()
      .toBuffer()

    const result = await service.upload({
      filename: "large-product.png",
      mimeType: "image/png",
      content: source.toString("base64"),
    })

    const output = Buffer.from(uploaded?.Body)
    const metadata = await sharp(output).metadata()

    expect(uploaded?.ContentType).toBe("image/webp")
    expect(uploaded?.Key).toMatch(/\.webp$/)
    expect(result.url).toMatch(/\.webp$/)
    expect(metadata.format).toBe("webp")
    expect(metadata.width).toBe(IMAGE_MAX_WIDTH)
    expect(metadata.height).toBe(1067)
  })
})
