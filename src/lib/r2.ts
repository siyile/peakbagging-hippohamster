import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type _Object,
} from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function listR2Objects(prefix: string): Promise<_Object[]> {
  const all: _Object[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    if (res.Contents) all.push(...res.Contents);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return all;
}

export async function deleteR2Keys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const res = await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Delete: { Objects: chunk.map((k) => ({ Key: k })) },
      })
    );
    deleted += res.Deleted?.length ?? 0;
  }
  return deleted;
}
