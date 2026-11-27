
import { AwsClient } from "aws4fetch";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(process.env.HOME + "/.config/auntyalice/r2.env", "utf8")
  .split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const aws = new AwsClient({ accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
for (const key of ["branding/icon-192.png", "branding/icon-512.png"]) {
  const res = await aws.fetch(`https://2a056329af0de62816c4219570af2187.r2.cloudflarestorage.com/auntyalice-assets/${key}`);
  const buf = res.ok ? await res.arrayBuffer() : null;
  // PNG magic number check
  const magic = buf ? [...new Uint8Array(buf.slice(0, 4))].join(",") : "";
  console.log(key, "GET", res.status, res.headers.get("content-type"), buf ? buf.byteLength + "B" : "", magic === "137,80,78,71" ? "valid PNG" : "NOT PNG");
}
