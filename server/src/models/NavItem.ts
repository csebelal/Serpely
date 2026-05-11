import mongoose, { Document, Schema } from 'mongoose';

interface DropdownItem {
  label: string;
  href: string;
  desc?: string;
}

export interface INavItem extends Document {
  label: string;
  href: string;
  order: number;
  isCta: boolean;
  isVisible: boolean;
  dropdownItems: DropdownItem[];
}

const NavItemSchema = new Schema<INavItem>({
  label: { type: String, required: true },
  href: { type: String, required: true },
  order: { type: Number, default: 0 },
  isCta: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  dropdownItems: [{ label: String, href: String, desc: String }],
});

export default mongoose.model<INavItem>('NavItem', NavItemSchema);
