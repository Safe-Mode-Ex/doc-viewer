interface ImageSize {
  width: number;
  height: number;
}

/**
 * Загружает изображение по `src` в память и возвращает его естественные
 * размеры, не добавляя изображение в DOM.
 *
 * Резолвится только после полной загрузки; при ошибке загрузки
 * отклоняется с `Error`.
 */
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
