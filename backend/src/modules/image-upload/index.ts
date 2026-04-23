import { Module } from "@medusajs/framework/utils"
import ImageUploadService from "./service"

export const IMAGE_UPLOAD_MODULE = "image-upload"

export default Module(IMAGE_UPLOAD_MODULE, {
  service: ImageUploadService,
})
