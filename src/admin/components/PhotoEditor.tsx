import { useRef, useState } from 'react';
import { Spin } from '@douyinfe/semi-ui';
import { Icon } from './icons';

interface Props {
  images: string[];
  uploading: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function PhotoEditor({ images, uploading, onAdd, onRemove, onMove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    onAdd(Array.from(fileList));
  };

  return (
    <div className="photo-editor">
      <div className="photo-editor__grid">
        {images.map((src, index) => (
          <div
            className={[
              'photo-editor__item',
              dragIndex === index ? 'is-dragging' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={`${src}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragIndex === null || dragIndex === index) return;
              onMove(dragIndex, index);
              setDragIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragIndex(null);
            }}
          >
            <img src={src} alt={`照片 ${index + 1}`} loading="lazy" />
            <span className="photo-editor__index">{index + 1}</span>
            {index === 0 && <span className="photo-editor__cover">封面</span>}
            <span className="photo-editor__grip" aria-hidden="true">
              <Icon name="grip" size={15} />
            </span>
            <button
              type="button"
              className="photo-editor__remove"
              onClick={() => onRemove(index)}
              aria-label={`移除第 ${index + 1} 张照片`}
              title="移除"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="photo-editor__add"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Spin size="small" /> : <Icon name="plus" size={22} />}
          <span>{uploading ? '上传中…' : '添加照片'}</span>
          <em>PNG / JPEG / WebP / GIF / AVIF</em>
        </button>
      </div>

      <div className="photo-editor__foot">
        <span>拖动照片可以调整顺序，第一张会作为动态封面。</span>
        {images.length > 0 && <span>{images.length} 张</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

    </div>
  );
}
