'use client';
import Image, { ImageProps } from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Props = Omit<ImageProps,'src'> & { s3Key: string };

export default function QImage({ s3Key, width, height, ...rest }: Props) {
  const w = typeof width === 'number' ? width : parseInt(String(width||0)) || 600;
  const url = `${API}/img?key=${encodeURIComponent(s3Key)}&w=${w}&format=webp&q=82`;
  return <Image src={url} width={width} height={height} {...rest} />;
}
