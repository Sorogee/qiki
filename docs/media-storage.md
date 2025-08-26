# Media Storage (Run #7)

This setup moves all uploads to S3/R2/MinIO with **presigned PUT URLs**, **virus scanning** via **ClamAV**, and a **CDN** in front.

## Buckets & Keys
- Bucket: `${S3_BUCKET}`
- Keys:
  - `uploads/incoming/<uuid>/<filename>` (private, **awaiting scan**)
  - `uploads/public/<uuid>/<filename>` (public path after **clean** verdict)

## Flow
1. Client requests **/api/media/sign** (JWT required) → server validates type & size and returns a **presigned PUT** + creates an `Upload` record (status=PENDING).
2. Client uploads directly to S3 via PUT.
3. Client calls **/api/media/finalize** → worker enqueues **virus-scan**.
4. Worker streams the object to **ClamAV** (clamd INSTREAM). If **clean**, it copies object to `uploads/public/`, deletes the incoming object, and marks status=APPROVED.
5. Client polls **/api/media/status/:id**; when approved, the returned `url` is `MEDIA_CDN_BASE` + the public key.

## CDN
- Point your CDN to the bucket origin (origin access key recommended). Use **`MEDIA_CDN_BASE`** env to build final URLs.
- Recommended cache TTLs: 1 year immutable (append file hash to filenames if needed).

## Lifecycle Policy (example)
- Expire `uploads/incoming/*` after **1 day**.
- Transition `uploads/public/*` to **Infrequent Access** after **30 days**; Glacier/Archive after **180 days**.

**S3 JSON snippet:**
```json
{
  "Rules": [
    {
      "ID": "expire-incoming",
      "Filter": { "Prefix": "uploads/incoming/" },
      "Status": "Enabled",
      "Expiration": { "Days": 1 }
    },
    {
      "ID": "public-tiering",
      "Filter": { "Prefix": "uploads/public/" },
      "Status": "Enabled",
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 180, "StorageClass": "GLACIER" }
      ]
    }
  ]
}
```

## Local Dev
- Compose includes **clamav**. For S3, either use real AWS/R2 or local **MinIO** (already included in compose). Create the bucket first.
- Run `npm run media:migrate-local` to move existing local files to S3.
