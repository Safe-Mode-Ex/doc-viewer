interface ImageSize {
  width: number;
  height: number;
}

export function probeImageSize(src: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };

    image.src = src;
  });
}
