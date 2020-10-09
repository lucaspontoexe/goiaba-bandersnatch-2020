export default async function fileDownload(url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }