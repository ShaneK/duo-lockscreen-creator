import { useRef, useState } from 'react';
import { IonButton } from '@ionic/react';
import { cropRectFor, type CropRect, type PhotoSource } from '../lib/imagePipeline';
import { Sheet } from './Sheet';

type Framing = { shape: string; aspect: number; zoom: number; panX: number; panY: number };
const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const original = (photo: PhotoSource): Framing => ({ shape: 'original', aspect: photo.width / photo.height, zoom: 1, panX: 0, panY: 0 });

function initialFraming(photo: PhotoSource): Framing {
  if (!photo.crop) return original(photo);
  const crop = photo.crop;
  const aspect = crop.width / crop.height;
  return {
    shape: 'current', aspect,
    zoom: Math.min(photo.width, photo.height * aspect) / crop.width,
    panX: photo.width > crop.width ? clamp(2 * crop.x / (photo.width - crop.width) - 1) : 0,
    panY: photo.height > crop.height ? clamp(2 * crop.y / (photo.height - crop.height) - 1) : 0,
  };
}

export function CropSheet({ photos, onApply, onClose }: { photos: PhotoSource[]; onApply: (crops: CropRect[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(0);
  const [drafts, setDrafts] = useState(() => photos.map(initialFraming));
  const drag = useRef<{ pointer: number; x: number; y: number; panX: number; panY: number; width: number; height: number } | null>(null);
  const photo = photos[selected];
  const framing = drafts[selected];
  const crop = cropRectFor(photo, framing.aspect, framing.zoom, framing.panX, framing.panY);

  function change(values: Partial<Framing>) {
    setDrafts(current => current.map((draft, index) => index === selected ? { ...draft, ...values } : draft));
  }

  return <Sheet title="Crop your photos" onClose={onClose}>
    <div className="photo-tabs" aria-label="Photo to crop">{photos.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => { drag.current = null; setSelected(index); }}>{index === 0 ? 'Left photo' : 'Right photo'}</button>)}</div>
    <div className="crop-preview-area">
      <div className="crop-preview" role="img" aria-label="Crop preview. Drag the photo to move it."
        style={{ aspectRatio: crop.width / crop.height, maxWidth: crop.width < crop.height ? '190px' : '100%' }}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, panX: framing.panX, panY: framing.panY, width: bounds.width, height: bounds.height };
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (!start || start.pointer !== event.pointerId) return;
          change({
            panX: photo.width > crop.width ? clamp(start.panX - 2 * (event.clientX - start.x) * crop.width / (start.width * (photo.width - crop.width))) : 0,
            panY: photo.height > crop.height ? clamp(start.panY - 2 * (event.clientY - start.y) * crop.height / (start.height * (photo.height - crop.height))) : 0,
          });
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <img src={photo.url} alt="" draggable={false} style={{ width: `${100 * photo.width / crop.width}%`, left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%` }} />
      </div>
    </div>
    <p className="crop-hint">Drag the photo to move it.</p>
    <div className="crop-controls">
      <label className="shape-label" htmlFor="crop-shape">Crop shape<select id="crop-shape" value={framing.shape} onChange={event => {
        const shape = event.target.value;
        if (shape === 'current') { change(initialFraming(photo)); return; }
        const aspect = shape === 'portrait' ? 2 / 3 : shape === 'landscape' ? 3 / 2 : shape === 'square' ? 1 : photo.width / photo.height;
        change({ shape, aspect, zoom: 1, panX: 0, panY: 0 });
      }}>
        <option value="original">Original shape</option>
        <option value="portrait">Portrait</option>
        <option value="landscape">Landscape</option>
        <option value="square">Square</option>
        {photo.crop && <option value="current">Current crop</option>}
      </select></label>
      <label htmlFor="crop-zoom">Zoom<input id="crop-zoom" type="range" min="1" max="4" step="0.01" value={framing.zoom} onChange={event => change({ zoom: Number(event.target.value) })} /></label>
      <label htmlFor="crop-horizontal">Left or right<input id="crop-horizontal" type="range" min="-1" max="1" step="0.01" value={framing.panX} onChange={event => change({ panX: Number(event.target.value) })} /></label>
      <label htmlFor="crop-vertical">Up or down<input id="crop-vertical" type="range" min="-1" max="1" step="0.01" value={framing.panY} onChange={event => change({ panY: Number(event.target.value) })} /></label>
    </div>
    <div className="crop-actions"><button type="button" className="text-action" onClick={() => change(original(photo))}>Reset crop</button><IonButton className="primary-action" onClick={() => onApply(photos.map((item, index) => {
      const draft = drafts[index];
      return cropRectFor(item, draft.aspect, draft.zoom, draft.panX, draft.panY);
    }))}>Apply crop</IonButton></div>
  </Sheet>;
}
