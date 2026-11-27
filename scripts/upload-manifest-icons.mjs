import { AwsClient } from "aws4fetch";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(process.env.HOME + "/.config/auntyalice/r2.env", "utf8")
    .split("\n").filter(Boolean).map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
    ]),
);

const ACCOUNT = "2a056329af0de62816c4219570af2187";
const BUCKET = "auntyalice-assets";
const aws = new AwsClient({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const files = [
  ["/tmp/icon-192.png", "branding/icon-192.png"],
  ["/tmp/icon-512.png", "branding/icon-512.png"],
];

for (const [local, key] of files) {
  const res = await aws.fetch(`https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: readFileSync(local),
  });
  const text = res.ok ? "" : await res.text();
  console.log(key, res.status, text.slice(0, 160));
}
