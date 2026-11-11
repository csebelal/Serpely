import { useEffect, useState, useRef } from 'react';
import { getMedia, uploadFile, deleteMedia, type MediaFileData } from '@/lib/api';

export function MediaLibrary() {
  const [files, setFiles] = useState<MediaFileData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMedia()
      .then(r => setFiles(r.data))
      .catch(() => setError('Failed to load media files.'));
  }, []);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList) return;
    setUploading(true);
    setError('');
    for (const file of Array.from(fileList)) {
      try {
        const { data } = await uploadFile(file);
        setFiles(prev => [{ _id: data._id, filename: file.name, url: data.url, publicId: data.publicId, size: file.size, uploadedAt: new Date().toISOString() }, ...prev]);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg || `Failed to upload "${file.name}".`);
      }
    }
    setUploading(false);
  }

  async function handleDelete(file: MediaFileData) {
    if (!confirm(`Delete "${file.filename}"?`)) return;
    setDeleting(file._id);
    try {
      await deleteMedia(file.publicId);
      setFiles(prev => prev.filter(f => f._id !== file._id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      alert(msg);
    }
    setDeleting(null);
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div style={{ padding: '36px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Media Library</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>{files.length} files · Click to copy URL</p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{ padding: '9px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
      </div>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{ background: '#f1f5f9', borderRadius: 16, padding: '28px', textAlign: 'center', marginBottom: 20, cursor: 'pointer', color: '#94a3b8', fontSize: 13, transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#e8f5ef')}
        onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
      >
        Drop images here or click to upload · PNG, JPG, SVG, WebP · Max 10 MB
      </div>
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {files.map(file => (
          <div key={file._id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', position: 'relative', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <button
              type="button"
              aria-label={`Copy URL for ${file.filename}`}
              style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', position: 'relative', width: '100%', padding: 0, border: 'none', background: 'transparent', display: 'block' }}
              onClick={() => copyUrl(file.url)}
            >
              <img src={file.url} alt={file.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {copied === file.url && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,194,122,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>Copied!</div>
              )}
            </button>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatSize(file.size)}</span>
                <button onClick={() => handleDelete(file)} disabled={deleting === file._id} style={{ padding: '2px 8px', background: '#fef2f2', border: 'none', borderRadius: 5, color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>
                  {deleting === file._id ? '…' : 'Del'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {files.length === 0 && !uploading && (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>No media uploaded yet.</p>
      )}
    </div>
  );
}
