"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Video, CheckCircle2, AlertCircle, X, Film } from "lucide-react";
import { uploadVideo } from "@/lib/api";

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoUploaded?: (videoUrl: string) => void;
}

export default function VideoUploadModal({
  isOpen,
  onClose,
  onVideoUploaded,
}: VideoUploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setErrorMsg("Please select a valid video file (.mp4, .webm, .mov)");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await uploadVideo(selectedFile);
      const newUrl = `/hero.mp4?t=${Date.now()}`;
      setSuccessMsg(`Video "${res.filename}" (${res.size_mb} MB) uploaded successfully!`);
      if (onVideoUploaded) {
        onVideoUploaded(previewUrl || newUrl);
      }
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setSelectedFile(null);
        setPreviewUrl(null);
      }, 1800);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(28, 23, 18, 0.85)",
        backdropFilter: "blur(8px)",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "540px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          border: "1px solid var(--lewa-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--lewa-muted)",
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ textCenter: "center", marginBottom: "24px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "20px",
              background: "rgba(184, 71, 40, 0.1)",
              color: "var(--lewa-terracotta)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            <Film size={14} /> Video Manager
          </div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", margin: "4px 0" }}>
            Upload Video from Laptop
          </h3>
          <p style={{ color: "var(--lewa-muted)", fontSize: "13px" }}>
            Select any MP4 or WebM video file to replace the background hero video in real time.
          </p>
        </div>

        {/* Dropzone */}
        {!selectedFile ? (
          <div
            className={`lewa-dropzone ${dragOver ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "40px 20px",
              border: "2px dashed var(--lewa-border)",
              borderRadius: "12px",
              textAlign: "center",
              background: "var(--lewa-cream)",
              cursor: "pointer",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/quicktime"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            <Video
              size={44}
              style={{ color: "var(--lewa-terracotta)", margin: "0 auto 12px" }}
            />
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "17px", marginBottom: "4px" }}>
              Drag &amp; drop video here, or browse
            </div>
            <div style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
              Supports MP4, WebM, MOV up to 200MB
            </div>
          </div>
        ) : (
          /* Video Preview */
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                borderRadius: "10px",
                overflow: "hidden",
                maxHeight: "220px",
                background: "#000",
                marginBottom: "16px",
              }}
            >
              {previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  muted
                  style={{ width: "100%", maxHeight: "220px", objectFit: "contain" }}
                />
              )}
            </div>

            <div style={{ fontSize: "13px", color: "var(--lewa-charcoal)", marginBottom: "16px", fontWeight: 600 }}>
              {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                className="btn-brush"
                onClick={handleUpload}
                disabled={uploading}
                style={{ padding: "10px 28px" }}
              >
                {uploading ? "Uploading..." : "APPLY AS HERO VIDEO"}
              </button>
              <button
                className="btn-pill-light"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                disabled={uploading}
              >
                Change File
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(184, 71, 40, 0.1)",
              color: "var(--lewa-terracotta)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
