/**
 * service.ts — Cloudflare R2 image upload provider for Medusa
 *
 * This class implements Medusa's file provider contract so that product image
 * uploads go to Cloudflare R2 (an S3-compatible object store) instead of the
 * local filesystem.
 *
 * Before uploading, images pass through a Sharp processing pipeline:
 *   - GIFs are uploaded as-is (Sharp cannot re-encode animated GIFs)
 *   - Any image over 300 KB or wider than 1600 px is resized and converted
 *     to WebP at quality 82 — reducing bandwidth without visible quality loss
 *   - Non-image files (PDF, video, etc.) are rejected with a clear error
 *
 * Required env vars (set via medusa-config.ts → r2FileModule options):
 *   R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */

// AbstractFileProviderService — Medusa's base class for file providers.
//   Subclassing it registers this class as a valid provider in Medusa's file module.
//   We must implement: upload, delete, getPresignedDownloadUrl, getDownloadStream, getUploadStream
import { AbstractFileProviderService } from "@medusajs/framework/utils"

// FileTypes — TypeScript type definitions for file provider method parameters and return values
import { FileTypes } from "@medusajs/framework/types"

// MedusaError — Medusa's standard error class. Throwing it sends a structured JSON
//   error response to the API client with an appropriate HTTP status code.
import { MedusaError } from "@medusajs/framework/utils"

// AWS SDK v3 — Cloudflare R2 is S3-compatible, so the standard AWS S3 client works.
//   S3Client           — HTTP client that signs requests with AWS Signature v4 and sends them to R2
//   PutObjectCommand   — upload (create or overwrite) a file in the bucket
//   DeleteObjectCommand — remove a file from the bucket
//   GetObjectCommand   — download a file from the bucket as a stream
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"

// sharp — high-performance image processing library (resize, convert formats, read metadata)
//   Used here to downscale large images and convert them to WebP before upload
import sharp from "sharp"

// Node.js built-in stream types:
//   Readable    — a stream you can read data from (used when downloading files)
//   PassThrough — a stream that passes data through unchanged (used for streaming uploads)
//   Writable    — a stream you can write data to (exposed to callers for streaming uploads)
import { Readable, PassThrough, Writable } from "stream"

// randomUUID — generates a unique v4 UUID used as the storage key / filename in R2
import { randomUUID } from "crypto"

// path — Node.js built-in for manipulating file paths and extracting extensions
import path from "path"

const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
])
export const IMAGE_SIZE_THRESHOLD = 300 * 1024 // 300 KB
export const IMAGE_MAX_WIDTH = 1600
export const IMAGE_WEBP_QUALITY = 82

export const shouldOptimizeImage = ({
  mimeType,
  byteLength,
  width,
}: {
  mimeType: string
  byteLength: number
  width: number
}) =>
  mimeType !== "image/gif" &&
  (byteLength > IMAGE_SIZE_THRESHOLD || width > IMAGE_MAX_WIDTH)

type Options = {
  bucket: string
  endpoint: string
  publicUrl: string
  accessKeyId: string
  secretAccessKey: string
}

class ImageUploadService extends AbstractFileProviderService {
  static identifier = "r2-image"

  private s3: S3Client
  private bucket: string
  private publicUrl: string

  constructor(_: Record<string, unknown>, options: Options) {
    super()
    this.bucket = options.bucket
    this.publicUrl = options.publicUrl.replace(/\/$/, "")
    this.s3 = new S3Client({
      region: "auto",
      endpoint: options.endpoint,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    })
  }

  static validateOptions(options: Record<string, unknown>) {
    const required = ["bucket", "endpoint", "publicUrl", "accessKeyId", "secretAccessKey"]
    for (const key of required) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `R2 file provider: "${key}" option is required.`
        )
      }
    }
  }

  async upload(
    file: FileTypes.ProviderUploadFileDTO
  ): Promise<FileTypes.ProviderFileResultDTO> {
    if (!SUPPORTED_TYPES.has(file.mimeType)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported file type "${file.mimeType}". Only jpg, png, webp and gif images are supported.`
      )
    }

    const raw = Buffer.from(file.content, "base64")

    const width = await this.getImageWidth(raw)
    const needsProcessing = shouldOptimizeImage({
      mimeType: file.mimeType,
      byteLength: raw.byteLength,
      width,
    })

    let body: Uint8Array
    let mimeType = file.mimeType
    let ext = path.extname(file.filename).replace(".", "") || "jpg"

    if (needsProcessing) {
      body = await sharp(raw)
        .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: IMAGE_WEBP_QUALITY })
        .toBuffer()
      mimeType = "image/webp"
      ext = "webp"
    } else {
      body = raw
    }

    const key = `${randomUUID()}.${ext}`

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      })
    )

    return { url: `${this.publicUrl}/${key}`, key }
  }

  async delete(
    files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]
  ): Promise<void> {
    const list = Array.isArray(files) ? files : [files]
    await Promise.all(
      list.map((f) =>
        this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: f.fileKey }))
      )
    )
  }

  async getPresignedDownloadUrl(
    fileData: FileTypes.ProviderGetFileDTO
  ): Promise<string> {
    // bucket is public — return the public URL directly
    return `${this.publicUrl}/${fileData.fileKey}`
  }

  async getDownloadStream(
    fileData: FileTypes.ProviderGetFileDTO
  ): Promise<Readable> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: fileData.fileKey })
    )
    return res.Body as Readable
  }

  async getAsBuffer(fileData: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
    const stream = await this.getDownloadStream(fileData)
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on("data", (chunk: Buffer) => chunks.push(chunk))
      stream.on("end", () => resolve(Buffer.concat(chunks)))
      stream.on("error", reject)
    })
  }

  async getUploadStream(fileData: FileTypes.ProviderUploadStreamDTO): Promise<{
    writeStream: Writable
    promise: Promise<FileTypes.ProviderFileResultDTO>
    url: string
    fileKey: string
  }> {
    const ext = path.extname(fileData.filename).replace(".", "") || "bin"
    const key = `${randomUUID()}.${ext}`
    const url = `${this.publicUrl}/${key}`
    const passThrough = new PassThrough()

    const promise = this.s3
      .send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: passThrough,
          ContentType: fileData.mimeType,
        })
      )
      .then(() => ({ url, key }))

    return { writeStream: passThrough, promise, url, fileKey: key }
  }

  private async getImageWidth(buffer: Uint8Array): Promise<number> {
    try {
      const { width = 0 } = await sharp(buffer).metadata()
      return width
    } catch {
      return 0
    }
  }
}

export default ImageUploadService
