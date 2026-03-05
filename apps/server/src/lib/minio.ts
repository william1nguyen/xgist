import { env } from "@xgist/env/server";
import { Client } from "minio";

export const minioClient = new Client({
	endPoint: env.MINIO_ENDPOINT,
	port: env.MINIO_PORT,
	useSSL: env.MINIO_USE_SSL,
	accessKey: env.MINIO_ACCESS_KEY,
	secretKey: env.MINIO_SECRET_KEY,
});

const PUBLIC_READ_POLICY = (bucket: string) =>
	JSON.stringify({
		Version: "2012-10-17",
		Statement: [
			{
				Effect: "Allow",
				Principal: { AWS: ["*"] },
				Action: ["s3:GetObject"],
				Resource: [`arn:aws:s3:::${bucket}/*`],
			},
		],
	});

async function ensureBucket(name: string) {
	const exists = await minioClient.bucketExists(name);
	if (!exists) {
		await minioClient.makeBucket(name);
		await minioClient.setBucketPolicy(name, PUBLIC_READ_POLICY(name));
	}
}

export async function initBuckets() {
	await ensureBucket("media");
	await ensureBucket("summaries");
}

export function getPublicUrl(bucket: string, objectName: string): string {
	const protocol = env.MINIO_USE_SSL ? "https" : "http";
	const port = env.MINIO_PORT ? `:${env.MINIO_PORT}` : "";
	return `${protocol}://${env.MINIO_ENDPOINT}${port}/${bucket}/${objectName}`;
}
