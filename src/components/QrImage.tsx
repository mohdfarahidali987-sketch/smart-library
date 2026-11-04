"use client";

import React, { useState } from "react";

interface QrImageProps {
  data: string;
  size?: number;
  label?: string;
  className?: string;
}

export function QrImage({ data, size = 200, label, className = "" }: QrImageProps) {
  const [hasError, setHasError] = useState(false);
  const encoded = encodeURIComponent(data);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encoded}`;

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {!hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt={`QR Code for ${data}`}
          width={size}
          height={size}
          className="rounded-lg object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex flex-col items-center justify-center bg-slate-100 text-slate-500 rounded-lg p-3 text-center text-xs"
        >
          <div className="font-mono font-semibold text-slate-700 mb-1">{data}</div>
          <div>Scan URL or tap to visit</div>
        </div>
      )}
      {label && <p className="mt-2 text-xs font-semibold text-slate-600">{label}</p>}
    </div>
  );
}
