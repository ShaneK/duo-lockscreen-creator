import { useEffect, useRef, useState } from 'react';
import {
  IonApp, IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
} from '@ionic/react';
import { composePair, loadPhoto, releasePhoto, type PhotoSource } from './lib/imagePipeline';
import { Sheet } from './components/Sheet';
import { CropSheet } from './components/CropSheet';
import { SaveSheet } from './components/SaveSheet';
import { PhotoPreview } from './components/PhotoPreview';
import './styles.css';

type SlotIndex = 0 | 1;
type Slots = [PhotoSource | null, PhotoSource | null];
type ActionFocus = 'result' | 'swap' | 'start' | 'share';
type PreparedImage = { url: string; file: File; width: number; height: number };

function Plus() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 5v22M5 16h22" /></svg>;
}

export default function App() {
  const slotPickers = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null]);
  const slotButtons = useRef<[HTMLButtonElement | null, HTMLButtonElement | null]>([null, null]);
  const mainHeading = useRef<HTMLHeadingElement>(null);
  const swapButton = useRef<HTMLButtonElement>(null);
  const primaryButton = useRef<HTMLIonButtonElement>(null);
  const pendingActionFocus = useRef<ActionFocus | null>(null);
  const pendingSelectionFocus = useRef<SlotIndex | null>(null);
  const singlePicker = useRef<HTMLInputElement>(null);
  const replacementIndex = useRef<SlotIndex>(0);
  const activeSlots = useRef<Slots>([null, null]);
  const loadVersions = useRef<[number, number]>([0, 0]);
  const compositionVersion = useRef(0);
  const [slots, setSlots] = useState<Slots>([null, null]);
  const [loading, setLoading] = useState<[boolean, boolean]>([false, false]);
  const [joined, setJoined] = useState(false);
  const [composing, setComposing] = useState(false);
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [error, setError] = useState('');
  const pair: [PhotoSource, PhotoSource] | null = slots[0] && slots[1] ? [slots[0], slots[1]] : null;
  const hasPhoto = slots.some(Boolean);
  const busy = loading.some(Boolean) || composing;

  function updateSlots(next: Slots, recompose: boolean) {
    compositionVersion.current += 1;
    for (const photo of activeSlots.current) {
      if (photo && !next.some(item => item?.url === photo.url)) releasePhoto(photo);
    }
    activeSlots.current = next;
    setPrepared(null);
    setComposing(recompose);
    setSlots(next);
  }

  useEffect(() => {
    if (!joined || !slots[0] || !slots[1]) return;
    let current = true;
    let url: string | undefined;
    const version = ++compositionVersion.current;
    setComposing(true);
    composePair(slots[0], slots[1]).then(result => {
      if (!current || version !== compositionVersion.current) return;
      url = URL.createObjectURL(result.blob);
      setPrepared({
        ...result,
        url,
        file: new File([result.blob], 'duo-photo.jpg', { type: 'image/jpeg' }),
      });
    }).catch(() => {
      if (current && version === compositionVersion.current) setError("Couldn't join those photos. Try a smaller photo.");
    }).finally(() => {
      if (current && version === compositionVersion.current) setComposing(false);
    });
    return () => { current = false; if (url) URL.revokeObjectURL(url); };
  }, [slots, joined]);

  useEffect(() => () => {
    loadVersions.current[0] += 1;
    loadVersions.current[1] += 1;
    compositionVersion.current += 1;
    pendingSelectionFocus.current = null;
    pendingActionFocus.current = null;
    activeSlots.current.forEach(photo => { if (photo) releasePhoto(photo); });
  }, []);

  useEffect(() => {
    const index = pendingSelectionFocus.current;
    if (index === null || loading[index]) return;
    const target = joined ? mainHeading.current : slotButtons.current[index];
    if (!target) return;
    pendingSelectionFocus.current = null;
    const focused = document.activeElement;
    if (focused === document.body || focused === mainHeading.current || focused === singlePicker.current || focused === slotPickers.current[index] || focused === target) {
      target.focus();
    }
  }, [slots, loading, joined]);

  useEffect(() => {
    const action = pendingActionFocus.current;
    if (!action || busy || sharing) return;
    pendingActionFocus.current = null;
    if (saveOpen || cropOpen || replaceOpen) return;
    const target = action === 'result' ? mainHeading.current
      : action === 'swap' ? swapButton.current
      : action === 'start' ? slotButtons.current[0]
      : primaryButton.current?.shadowRoot?.querySelector<HTMLElement>('[part~="native"]') ?? primaryButton.current;
    if (!target) return;
    let observer: MutationObserver | undefined;
    const restore = () => {
      const focused = document.activeElement;
      if (!target.isConnected || (focused !== document.body && focused !== primaryButton.current && focused !== swapButton.current)) {
        observer?.disconnect();
        return;
      }
      if (target.matches(':disabled')) return;
      target.focus();
      observer?.disconnect();
    };
    // Ionic updates its native button after React has updated the host property.
    if (target.matches(':disabled')) {
      observer = new MutationObserver(restore);
      observer.observe(target, { attributes: true, attributeFilter: ['disabled'] });
    }
    restore();
    return () => observer?.disconnect();
  }, [busy, sharing, joined, prepared, saveOpen, cropOpen, replaceOpen]);

  function setSlotLoading(index: SlotIndex, value: boolean) {
    setLoading(current => index === 0 ? [value, current[1]] : [current[0], value]);
  }

  async function chooseSlot(index: SlotIndex, file?: File) {
    if (!file) return;
    pendingActionFocus.current = null;
    pendingSelectionFocus.current = index;
    const version = ++loadVersions.current[index];
    setSlotLoading(index, true);
    setError('');
    try {
      const photo = await loadPhoto(file);
      if (version !== loadVersions.current[index]) { releasePhoto(photo); return; }
      const next: Slots = [...activeSlots.current];
      next[index] = photo;
      setJoined(false);
      updateSlots(next, false);
    } catch {
      if (version === loadVersions.current[index]) setError("Couldn't open that photo. Try a JPEG, PNG, or another photo.");
    } finally {
      if (version === loadVersions.current[index]) setSlotLoading(index, false);
    }
  }

  function startNew() {
    pendingActionFocus.current = 'start';
    pendingSelectionFocus.current = null;
    loadVersions.current[0] += 1;
    loadVersions.current[1] += 1;
    setJoined(false);
    updateSlots([null, null], false);
    setLoading([false, false]);
    setError('');
    setSaveOpen(false);
    setReplaceOpen(false);
    setCropOpen(false);
  }

  function joinPhotos() {
    if (!pair || busy) return;
    pendingActionFocus.current = 'result';
    setError('');
    setComposing(true);
    setJoined(true);
  }

  async function saveOrShare() {
    if (!prepared || sharing || busy) return;
    const version = compositionVersion.current;
    setError('');
    setSharing(true);
    try {
      const files = [prepared.file];
      if (navigator.share && navigator.canShare?.({ files })) await navigator.share({ files });
      else setSaveOpen(true);
    } catch (cause) {
      if (version === compositionVersion.current && !(cause instanceof DOMException && cause.name === 'AbortError')) setSaveOpen(true);
    } finally {
      if (version === compositionVersion.current) pendingActionFocus.current = 'share';
      setSharing(false);
    }
  }

  return (
    <IonApp>
      <IonPage className="app-page">
        <IonHeader className="app-header">
          <IonToolbar>
            <IonTitle>Duo Lockscreen Creator</IonTitle>
            {hasPhoto && <IonButton slot="end" fill="clear" className="new-button" onClick={startNew}>New</IonButton>}
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <main className={'maker' + (joined ? ' has-photos' : '')}>
            <header className="intro">
              <h1 ref={mainHeading} tabIndex={-1} data-sheet-focus-fallback>{joined ? (composing ? 'Joining photos...' : prepared ? 'Your photo is ready' : "Couldn't join those photos") : 'Pick two photos.'}</h1>
              {!joined && <p>Tap each box to add a photo.</p>}
            </header>
            <section className="workspace" aria-label="Photo preview">
              {!joined ? (
                <div className="empty-pair">
                  {([0, 1] as const).map(index => {
                    const photo = slots[index];
                    const role = index === 0 ? 'portrait' : 'landscape';
                    return <button key={index} type="button" ref={element => { slotButtons.current[index] = element; }}
                      className={'photo-well' + (photo ? ' is-selected' : '')}
                      aria-label={(photo ? 'Change ' : 'Add ') + role + ' photo'}
                      aria-busy={loading[index]}
                      disabled={loading[index]}
                      onClick={() => slotPickers.current[index]?.click()}>
                      {photo ? <PhotoPreview className="photo-well-image" photo={photo} label={index === 0 ? 'Portrait preview' : 'Landscape preview'} /> : <Plus />}
                      <span className="photo-role">{loading[index] ? 'Loading...' : index === 0 ? 'Portrait' : 'Landscape'}</span>
                    </button>;
                  })}
                </div>
              ) : (
                <div className="preview-area">
                  {prepared ? <img className="joined-image" src={prepared.url} alt="Your two photos joined side by side" /> : <div className="preparing" role="status">{composing ? 'Joining photos...' : 'Try replacing one of the photos.'}</div>}
                  <nav className="editor-tools" aria-label="Edit photos">
                    <button type="button" disabled={busy} onClick={() => { pendingActionFocus.current = null; setReplaceOpen(true); }}>Replace</button>
                    <button ref={swapButton} type="button" disabled={busy || !pair} onClick={() => { if (pair) { pendingActionFocus.current = 'swap'; setError(''); updateSlots([pair[1], pair[0]], true); } }}>Swap</button>
                    <button type="button" disabled={busy} onClick={() => { pendingActionFocus.current = null; setCropOpen(true); }}>Crop</button>
                  </nav>
                  <p className="pair-caption">Swap their order or adjust the crop.</p>
                </div>
              )}
            </section>
            {error && <p className="error-message" role="alert">{error}</p>}
            <footer className="maker-footer">
              <IonButton ref={primaryButton} className="primary-action" expand="block"
                disabled={busy || sharing || (joined ? !prepared : !pair)}
                onClick={() => { if (joined) void saveOrShare(); else joinPhotos(); }}>
                {composing ? 'Joining photos...' : joined ? 'Save or Share' : 'Join Photos'}
              </IonButton>
              <p>{joined ? 'Save a copy to use as your wallpaper.' : "Your photos aren't uploaded."}</p>
            </footer>
            {([0, 1] as const).map(index => <input key={index} ref={element => { slotPickers.current[index] = element; }}
              className="file-input" type="file" accept="image/*"
              aria-label={index === 0 ? 'Portrait photo' : 'Landscape photo'}
              onChange={event => { void chooseSlot(index, event.target.files?.[0]); event.target.value = ''; }} />)}
            <input ref={singlePicker} className="file-input" type="file" accept="image/*" aria-label="Replace selected photo"
              onChange={event => { void chooseSlot(replacementIndex.current, event.target.files?.[0]); event.target.value = ''; }} />
            {cropOpen && pair && <CropSheet photos={pair} onClose={() => setCropOpen(false)} onApply={crops => {
              setCropOpen(false);
              setError('');
              updateSlots(pair.map((photo, index) => ({ ...photo, crop: crops[index] })) as Slots, true);
            }} />}
            {replaceOpen && pair && <Sheet title="Replace a photo" onClose={() => setReplaceOpen(false)}>
              <p className="sheet-description">Which photo do you want to replace?</p>
              <div className="photo-choices">{pair.map((photo, index) => <button type="button" key={photo.id} aria-label={index === 0 ? 'Left photo' : 'Right photo'} onClick={() => {
                replacementIndex.current = index as SlotIndex;
                setReplaceOpen(false);
                singlePicker.current?.click();
              }}>
                <PhotoPreview className="photo-choice-image" photo={photo} label={index === 0 ? 'Left photo preview' : 'Right photo preview'} /><span>{index === 0 ? 'Left photo' : 'Right photo'}</span><span aria-hidden="true">›</span>
              </button>)}</div>
            </Sheet>}
            {saveOpen && prepared && <SaveSheet image={prepared} onClose={() => setSaveOpen(false)} />}
          </main>
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
