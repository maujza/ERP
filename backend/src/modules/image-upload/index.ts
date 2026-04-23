import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ImageUploadService from "./service"

export default ModuleProvider(Modules.FILE, {
  services: [ImageUploadService],
})
