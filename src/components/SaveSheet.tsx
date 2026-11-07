import { useEffect, useId, useState, type MouseEvent } from 'react';
import { Sheet } from './Sheet';

type SaveSheetProps = {
  image: { url: string; file: File };
  onClose: () => void;
};

export function SaveSheet({ image, onClose }: SaveSheetProps) {
  const downloadTarget = `image-download-${useId()}`;
  const [downloadURL, setDownloadURL] = useState<string>();
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    const reader = new FileReader();
    setDownloadURL(undefined);
    setDownloadError(false);
    reader.onload = () => {
      if (typeof reader.result === 'string') setDownloadURL(reader.result);
      else setDownloadError(true);
    };
    reader.onerror = () => setDownloadError(true);
    reader.readAsDataURL(image.file);
    return () => {
      reader.onload = null;
      reader.onerror = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [image.file]);

  function downloadImage(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!downloadURL) return;
    // Keep the editor open even when a browser opens the file instead of downloading it.
    // The self-contained image does not depend on the editor's object-URL lifetime.
    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = image.file.name;
    link.target = downloadTarget;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return <Sheet title="Save your photo" onClose={onClose}>
    <p className="sheet-description">Touch and hold the photo to save it, or download a copy below.</p>
    <img className="save-image" src={downloadURL ?? image.url} alt="Your joined photo" />
    <iframe name={downloadTarget} title="Image download" hidden />
    {downloadURL ? <a className="download-action" href={downloadURL} download={image.file.name} target={downloadTarget} onClick={downloadImage}>Download photo</a>
      : <p role={downloadError ? 'alert' : 'status'}>{downloadError ? "Couldn't prepare the download. Touch and hold the photo to save it." : 'Preparing download...'}</p>}
  </Sheet>;
}
