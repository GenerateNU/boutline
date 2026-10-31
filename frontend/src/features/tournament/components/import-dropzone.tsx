import { buttonVariants } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";

const importAccept = {
  "text/csv": [".csv"],
  "application/xml": [".xml"],
  "text/xml": [".xml"],
};

type ImportDropzoneProps = {
  onFile?: (file: File) => void;
};

function ImportDropzone({ onFile }: ImportDropzoneProps) {
  return (
    <Dropzone accept={importAccept} onFile={onFile} className="gap-5 rounded-2xl border-2 px-6 py-8">
      <p className="text-lg font-semibold">Already have file?</p>
      <span className={buttonVariants({ className: "w-full rounded-lg" })}>Upload</span>
    </Dropzone>
  );
}

export { ImportDropzone };
