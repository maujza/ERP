import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { adminDelete, adminPost } from "../_seed";

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

/**
 * Whether an upload URL points at Cloudflare R2. The Playwright runner does not
 * load the backend .env, so we detect R2 from the response URL rather than env:
 * if R2 is configured the provider returns an r2.dev / r2.cloudflarestorage URL.
 * Tests skip (with a clear reason) when R2 is not the active provider, but still
 * fail loudly on any unexpected non-R2 URL while asserting.
 */
function isR2Url(url: string): boolean {
  return /r2\.dev|r2\.cloudflarestorage/.test(url);
}

test.describe("Product — image upload to Cloudflare R2", () => {
  /** Product created during tests — deleted in afterEach. */
  let productId: string | null = null;

  test.afterEach(async ({ request }) => {
    if (productId) {
      await adminDelete(request, `/admin/products/${productId}`).catch(() => null);
      productId = null;
    }
  });

  test("upload endpoint returns an R2 URL", async ({ request }) => {
    const res = await adminPost(request, "/admin/uploads", {
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
    const uploadRes = await adminPost(request, "/admin/uploads", {
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
    const uploadRes = await adminPost(request, "/admin/uploads", {
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
    const createRes = await adminPost(request, "/admin/products", {
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

  test("large image is optimized to WebP and stored in R2", async ({ request }) => {
    // 2000 px wide (> IMAGE_MAX_WIDTH = 1600) forces the Sharp → WebP pipeline,
    // the riskiest part of the R2 provider and untested by the tiny-PNG cases.
    const largePng = await sharp({
      create: { width: 2000, height: 1200, channels: 3, background: { r: 130, g: 90, b: 210 } },
    })
      .png()
      .toBuffer();

    const res = await adminPost(request, "/admin/uploads", {
      multipart: { files: { name: "large-source.png", mimeType: "image/png", buffer: largePng } },
    });
    expect(res.ok(), `Upload failed (${res.status()}): ${await res.text()}`).toBeTruthy();
    const url: string = (await res.json()).files?.[0]?.url;
    expect(url, "Upload response should include a file URL").toBeTruthy();

    test.skip(!isR2Url(url), `R2 not configured — upload returned non-R2 URL: ${url}`);

    // The provider re-encodes optimized images as WebP and stores them with a
    // .webp key and image/webp content-type.
    expect(url, "optimized upload should be a .webp object").toMatch(/\.webp$/);
    expect(url).toContain(R2_PUBLIC_URL);

    const imgRes = await request.get(url);
    expect(imgRes.ok(), `Optimized image at ${url} returned ${imgRes.status()}`).toBeTruthy();
    expect(imgRes.headers()["content-type"]).toBe("image/webp");
  });

  test("product created with multiple images stores every R2 URL", async ({ request }) => {
    const upload = async (name: string): Promise<string> => {
      const r = await adminPost(request, "/admin/uploads", {
        multipart: { files: { name, mimeType: "image/png", buffer: TINY_PNG } },
      });
      expect(r.ok(), `Upload ${name} failed (${r.status()})`).toBeTruthy();
      return (await r.json()).files[0].url as string;
    };

    const urls = [await upload("m1.png"), await upload("m2.png"), await upload("m3.png")];
    test.skip(!urls.every(isR2Url), "R2 not configured — uploads returned non-R2 URLs");

    const createRes = await adminPost(request, "/admin/products", {
      data: {
        title: `E2E Multi-Image ${Date.now()}`,
        status: "draft",
        thumbnail: urls[0],
        images: urls.map((url) => ({ url })),
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            options: { Default: "Default" },
            prices: [{ amount: 0, currency_code: "ars" }],
          },
        ],
      },
    });
    expect(
      createRes.ok(),
      `Product creation failed (${createRes.status()}): ${await createRes.text()}`
    ).toBeTruthy();
    const { product } = await createRes.json();
    productId = product.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productImageUrls: string[] = (product.images ?? []).map((i: any) => i.url);
    expect(productImageUrls).toHaveLength(3);

    for (const url of productImageUrls) {
      expect(isR2Url(url), `image ${url} should be an R2 URL`).toBeTruthy();
      const imgRes = await request.get(url);
      expect(imgRes.ok(), `image ${url} returned ${imgRes.status()}`).toBeTruthy();
      expect(imgRes.headers()["content-type"]).toMatch(/^image\//);
    }
  });
});
