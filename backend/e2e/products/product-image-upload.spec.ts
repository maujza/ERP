import { test, expect } from "@playwright/test";

/**
 * Minimal 1×1 transparent PNG (67 bytes) embedded directly so the test needs
 * no external fixture files and runs offline.
 */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ??
  "https://pub-62bec0a4e6cb4da6b8704aef2e598894.r2.dev";

test.describe("Product — image upload to Cloudflare R2", () => {
  /** Product created during tests — deleted in afterEach. */
  let productId: string | null = null;

  test.afterEach(async ({ request }) => {
    if (productId) {
      await request.delete(`/admin/products/${productId}`).catch(() => null);
      productId = null;
    }
  });

  test("upload endpoint returns an R2 URL", async ({ request }) => {
    const res = await request.post("/admin/uploads", {
      multipart: {
        files: {
          name: "test-upload.png",
          mimeType: "image/png",
          buffer: TINY_PNG,
        },
      },
    });

    expect(res.ok(), `Upload failed (${res.status()}): ${await res.text()}`).toBeTruthy();

    const body = await res.json();
    const url: string = body.files?.[0]?.url;

    expect(url, "Upload response should include a file URL").toBeTruthy();
    expect(url, `URL should start with R2_PUBLIC_URL (${R2_PUBLIC_URL})`).toContain(R2_PUBLIC_URL);
  });

  test("uploaded image is publicly reachable via HTTP GET", async ({ request }) => {
    const uploadRes = await request.post("/admin/uploads", {
      multipart: {
        files: {
          name: "test-reach.png",
          mimeType: "image/png",
          buffer: TINY_PNG,
        },
      },
    });
    expect(uploadRes.ok()).toBeTruthy();

    const { files } = await uploadRes.json();
    const url: string = files[0].url;
    expect(url).toContain(R2_PUBLIC_URL);

    // Fetch the image directly — must return 200 and an image content-type
    const imgRes = await request.get(url);
    expect(imgRes.ok(), `Image at ${url} returned ${imgRes.status()}`).toBeTruthy();
    expect(imgRes.headers()["content-type"]).toMatch(/^image\//);
  });

  test("product created with uploaded image stores the R2 URL as thumbnail", async ({ request }) => {
    // 1. Upload the image
    const uploadRes = await request.post("/admin/uploads", {
      multipart: {
        files: {
          name: "test-thumbnail.png",
          mimeType: "image/png",
          buffer: TINY_PNG,
        },
      },
    });
    expect(uploadRes.ok()).toBeTruthy();
    const { files } = await uploadRes.json();
    const imageUrl: string = files[0].url;
    expect(imageUrl).toContain(R2_PUBLIC_URL);

    // 2. Create a draft product with that image as thumbnail.
    //    Medusa requires at least one option and one variant on creation.
    const createRes = await request.post("/admin/products", {
      data: {
        title: `E2E R2 Upload Test ${Date.now()}`,
        status: "draft",
        thumbnail: imageUrl,
        images: [{ url: imageUrl }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [{
          title: "Default",
          options: { Default: "Default" },
          prices: [{ amount: 0, currency_code: "ars" }],
        }],
      },
    });
    expect(createRes.ok(), `Product creation failed (${createRes.status()}): ${await createRes.text()}`).toBeTruthy();

    const { product } = await createRes.json();
    productId = product.id;

    // 3. Thumbnail on the product record must point to R2
    expect(product.thumbnail, "Product thumbnail should be the R2 URL").toContain(R2_PUBLIC_URL);

    // 4. The image itself must be reachable
    const imgRes = await request.get(product.thumbnail);
    expect(imgRes.ok(), `Thumbnail at ${product.thumbnail} returned ${imgRes.status()}`).toBeTruthy();
  });
});
