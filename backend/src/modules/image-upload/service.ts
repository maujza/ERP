import { AbstractFileProviderService } from "@medusajs/framework/utils"
import { FileTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import sharp from "sharp"
import { Readable, PassThrough, Writable } from "stream"
import { randomUUID } from "crypto"
import path from "path"

const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
])
const SIZE_THRESHOLD = 500 * 1024 // 500 KB
const MAX_WIDTH = 1400
const WEBP_QUALITY = 82

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

    const isGif = file.mimeType === "image/gif"
    const needsProcessing =
      !isGif &&
      (raw.byteLength > SIZE_THRESHOLD || (await this.exceedsMaxWidth(raw)))

    let body: Uint8Array
    let mimeType = file.mimeType
    let ext = path.extname(file.filename).replace(".", "") || "jpg"

    if (needsProcessing) {
      body = await sharp(raw)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
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

  private async exceedsMaxWidth(buffer: Uint8Array): Promise<boolean> {
    try {
      const { width = 0 } = await sharp(buffer).metadata()
      return width > MAX_WIDTH
    } catch {
      return false
    }
  }
}

export default ImageUploadService
