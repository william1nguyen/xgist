"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@radix-ui/react-dialog";
import { FileText } from "lucide-react";
import { Button } from "../ui/Button";
import { DialogHeader } from "../ui/dialog";

interface SummaryModalProps {
  title: string;
  summary: string;
}

export default function SummaryModal({ title, summary }: SummaryModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Xem tóm tắt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tóm tắt: {title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
          {summary}
        </div>
      </DialogContent>
    </Dialog>
  );
}
