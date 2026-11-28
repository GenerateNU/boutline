// The dashboard forms' Figma fields are larger than the field primitives' defaults: 14px dark
// labels over 46px, 12px-rounded inputs and selects. Set on the form so every field inside picks it up.
export const EMD_FORM_FIELDS =
  "flex flex-col gap-4 [&_label]:text-sm [&_label]:font-normal [&_label]:text-obsidian [&_[data-slot=text-field-control]]:h-11.5 [&_[data-slot=text-field-control]]:rounded-[12px] [&_[data-slot=text-field-control]]:px-4 [&_[data-slot=text-field-control]]:shadow-sm [&_[data-slot=select]]:h-11.5 [&_[data-slot=select]]:rounded-[12px] [&_[data-slot=select]]:px-4 [&_[data-slot=select]]:shadow-sm [&_[data-slot=select]_svg]:size-6";
