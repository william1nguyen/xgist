// Uploads go straight to object storage via the presigned URL media issues
// (docs/architecture.md's upload flow) — never through hermes. XHR, not
// fetch, so upload progress is observable for the progress bar.
export function uploadWithProgress(
	url: string,
	file: File,
	onProgress: (percent: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("PUT", url);
		xhr.setRequestHeader("Content-Type", file.type);
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				onProgress(Math.round((event.loaded / event.total) * 100));
			}
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
			} else {
				reject(new Error(`Upload failed with status ${xhr.status}`));
			}
		};
		xhr.onerror = () => reject(new Error("Upload failed"));
		xhr.send(file);
	});
}
