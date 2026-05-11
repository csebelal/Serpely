import mongoose, { Document, Schema } from 'mongoose';

export interface IMediaFile extends Document {
  filename: string;
  url: string;
  publicId: string;
  size: number;
  uploadedAt: Date;
}

const MediaFileSchema = new Schema<IMediaFile>({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMediaFile>('MediaFile', MediaFileSchema);
