import DeleteIcon from "@mui/icons-material/Delete";

interface DeleteIconButtonProps {
  label: string;
  // Disables the button and explains why on hover.
  disabledReason?: string;
  onClick: () => void;
}

export function DeleteIconButton({ label, disabledReason, onClick }: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabledReason}
      disabled={disabledReason !== undefined}
      onClick={onClick}
      className="-m-1 shrink-0 cursor-pointer rounded-md p-1 text-red-dark outline-none hover:bg-red-light focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:hover:bg-transparent"
    >
      <DeleteIcon aria-hidden className="size-6" />
    </button>
  );
}
