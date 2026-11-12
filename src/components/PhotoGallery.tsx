import { useState } from 'react';
import { Image, ImagePreview } from '@douyinfe/semi-ui';

interface Props {
  images: string[];
  alt?: string;
}

export default function PhotoGallery({ images, alt = '' }: Props) {
  const [preview, setPreview] = useState<{ visible: boolean; index: number }>({
    visible: false,
    index: 0,
  });

  return (
    <div className="photo-gallery">
      <div className={`photo-gallery__grid photo-gallery__grid--${Math.min(images.length, 3)}`}>
        {images.map((src, index) => (
          <button
            type="button"
            className="photo-gallery__item"
            key={`${src}-${index}`}
            onClick={() => setPreview({ visible: true, index })}
            aria-label={`查看第 ${index + 1} 张照片`}
          >
            <Image src={src} alt={alt} preview={false} />
          </button>
        ))}
      </div>

      <ImagePreview
        visible={preview.visible}
        src={images}
        currentIndex={preview.index}
        onVisibleChange={(visible) => {
          if (!visible) setPreview((current) => ({ ...current, visible: false }));
        }}
        onChange={(index) => setPreview((current) => ({ ...current, index }))}
      />
    </div>
  );
}
